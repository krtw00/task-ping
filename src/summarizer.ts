/**
 * Summarizer - Generate task summaries using local or cloud LLM
 */

export interface SummarizerConfig {
  backend: 'ollama' | 'anthropic';
  ollamaUrl?: string;
  ollamaModel?: string;
  anthropicApiKey?: string;
  anthropicModel?: string;
}

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = 'llama3.2';
const DEFAULT_ANTHROPIC_MODEL = 'claude-3-haiku-20240307';

/**
 * Check if Ollama is running
 */
async function isOllamaRunning(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/api/tags`, {
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Start Ollama server in background
 */
async function startOllama(): Promise<void> {
  const { spawn } = await import('child_process');

  // Start ollama serve in background
  const proc = spawn('ollama', ['serve'], {
    detached: true,
    stdio: 'ignore',
  });
  proc.unref();

  // Wait for it to be ready (max 10 seconds)
  for (let i = 0; i < 20; i++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (await isOllamaRunning(DEFAULT_OLLAMA_URL)) {
      console.log('Ollama started successfully');
      return;
    }
  }
  throw new Error('Ollama failed to start');
}

/**
 * Ensure Ollama is running, start if not
 */
async function ensureOllamaRunning(url: string): Promise<void> {
  if (await isOllamaRunning(url)) {
    return;
  }
  console.log('Ollama not running, starting...');
  await startOllama();
}

const SUMMARY_PROMPT = `以下の会話から、AIが行った作業を20文字以内で要約してください。日本語で、体言止めで答えてください。

例：
- "Webhook通知機能の実装"
- "バグ修正とテスト追加"
- "READMEの更新"

会話内容:
`;

/**
 * Summarize using Ollama (local)
 */
async function summarizeWithOllama(
  content: string,
  config: SummarizerConfig
): Promise<string> {
  const url = config.ollamaUrl || DEFAULT_OLLAMA_URL;
  const model = config.ollamaModel || DEFAULT_OLLAMA_MODEL;

  // Ensure Ollama is running (auto-start if needed)
  await ensureOllamaRunning(url);

  const response = await fetch(`${url}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: SUMMARY_PROMPT + content,
      stream: false,
      options: {
        num_predict: 50,
        temperature: 0.3,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama failed: ${response.status}`);
  }

  const data = await response.json() as { response: string };
  return data.response.trim().slice(0, 50);
}

/**
 * Summarize using Anthropic API
 */
async function summarizeWithAnthropic(
  content: string,
  config: SummarizerConfig
): Promise<string> {
  const apiKey = config.anthropicApiKey;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required');
  }

  const model = config.anthropicModel || DEFAULT_ANTHROPIC_MODEL;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: SUMMARY_PROMPT + content,
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic API failed: ${response.status} ${text}`);
  }

  const data = await response.json() as {
    content: Array<{ type: string; text: string }>;
  };
  return data.content[0].text.trim().slice(0, 50);
}

/**
 * Generate summary from conversation content
 */
export async function summarize(
  content: string,
  config: SummarizerConfig
): Promise<string> {
  try {
    if (config.backend === 'ollama') {
      return await summarizeWithOllama(content, config);
    } else {
      return await summarizeWithAnthropic(content, config);
    }
  } catch (error) {
    // Fallback: return truncated content
    console.error('Summarization failed:', error);
    return content.slice(0, 30) + '...';
  }
}

/**
 * Extract recent conversation from transcript file
 */
export async function extractRecentConversation(
  transcriptPath: string,
  maxMessages: number = 5
): Promise<string> {
  const fs = await import('fs/promises');

  try {
    const content = await fs.readFile(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');

    // Parse JSONL and get last N messages
    const messages: Array<{ role: string; content: string }> = [];

    for (const line of lines.slice(-maxMessages * 2)) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'human' || parsed.type === 'assistant') {
          const role = parsed.type === 'human' ? 'User' : 'Assistant';
          const text = typeof parsed.message === 'string'
            ? parsed.message
            : JSON.stringify(parsed.message).slice(0, 200);
          messages.push({ role, content: text });
        }
      } catch {
        // Skip invalid lines
      }
    }

    // Format as conversation
    return messages
      .slice(-maxMessages)
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
  } catch (error) {
    console.error('Failed to read transcript:', error);
    return '';
  }
}
