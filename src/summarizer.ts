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

const SUMMARY_PROMPT = `以下のユーザー依頼を20文字以内で要約してください。
日本語で、体言止めで答えてください。
依頼内容の核心だけを簡潔に表現してください。

例：
- "npm linkパスの修正"
- "ログイン画面のバグ修正"
- "READMEの日本語化"
- "通知機能の改善"

ユーザー依頼:
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
 * Stop reason types
 */
export type StopReason =
  | 'command_approval'    // Bash等のコマンド承認待ち
  | 'question'            // ユーザーへの質問待ち
  | 'input'               // 通常の入力待ち
  | 'edit_approval'       // ファイル編集の承認待ち
  | 'error';              // エラー発生

/**
 * Title mapping for stop reasons
 */
export const STOP_REASON_TITLES: Record<StopReason, string> = {
  command_approval: 'コマンド承認待ち',
  question: '確認待ち',
  input: '入力待ち',
  edit_approval: '編集承認待ち',
  error: 'エラー発生',
};

/**
 * Detect stop reason from transcript
 */
export async function detectStopReason(
  transcriptPath: string
): Promise<StopReason> {
  const fs = await import('fs/promises');

  try {
    const content = await fs.readFile(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');

    // Check last few entries for tool usage or questions
    const recentLines = lines.slice(-10);

    for (let i = recentLines.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(recentLines[i]);

        // Check assistant messages for tool use or text content
        if (parsed.type === 'assistant' && Array.isArray(parsed.message)) {
          for (const item of parsed.message) {
            if (item && typeof item === 'object' && 'type' in item) {
              // Check for tool use that requires approval
              if (item.type === 'tool_use' && 'name' in item) {
                const toolName = String(item.name);
                if (toolName === 'Bash') {
                  return 'command_approval';
                }
                if (toolName === 'Edit' || toolName === 'Write') {
                  return 'edit_approval';
                }
                if (toolName === 'AskUserQuestion') {
                  return 'question';
                }
              }

              // Check text content for question patterns
              if (item.type === 'text' && 'text' in item) {
                const msg = String(item.text);
                if (msg.includes('?') && (
                  msg.includes('どうしますか') ||
                  msg.includes('よろしいですか') ||
                  msg.includes('確認') ||
                  msg.includes('選択')
                )) {
                  return 'question';
                }
              }
            }
          }
        }
      } catch {
        // Skip invalid lines
      }
    }

    return 'input';
  } catch (error) {
    console.error('Failed to detect stop reason:', error);
    return 'input';
  }
}

/**
 * Extract text content from Claude Code transcript message format
 * Handles multiple formats:
 * - String: "message"
 * - Object with string content: {role: "user", content: "message"}
 * - Object with array content: {type: "message", content: [{type: "text", text: "..."}]}
 * - Array with text items: [{type: "text", text: "message"}]
 */
function extractTextFromMessage(message: unknown): string {
  if (typeof message === 'string') {
    return message;
  }

  if (message && typeof message === 'object') {
    const msg = message as Record<string, unknown>;

    // Handle {role: "user", content: "string"} format
    if ('content' in msg && typeof msg.content === 'string') {
      return msg.content;
    }

    // Handle {type: "message", content: [...]} format (assistant messages)
    if ('content' in msg && Array.isArray(msg.content)) {
      return extractTextFromArray(msg.content);
    }

    // Handle direct array format [{type: "text", text: "..."}]
    if (Array.isArray(message)) {
      return extractTextFromArray(message);
    }
  }

  return '';
}

/**
 * Extract text from an array of content items
 */
function extractTextFromArray(items: unknown[]): string {
  for (const item of items) {
    if (item && typeof item === 'object' && 'type' in item) {
      const typedItem = item as Record<string, unknown>;
      if (typedItem.type === 'text' && 'text' in typedItem) {
        return String(typedItem.text);
      }
    }
  }
  return '';
}

/**
 * Extract the latest assistant response from transcript file
 * Returns what the AI actually did/said (not tool calls)
 */
export async function extractRecentConversation(
  transcriptPath: string,
  _maxMessages: number = 5
): Promise<string> {
  const fs = await import('fs/promises');

  try {
    const content = await fs.readFile(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');

    let latestAssistantMessage: string | null = null;

    // Find the latest meaningful assistant text message
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);

        if (parsed.type === 'assistant') {
          const text = extractTextFromMessage(parsed.message);
          // Skip very short messages
          if (text && text.length > 15) {
            latestAssistantMessage = text;
          }
        }
      } catch {
        // Skip invalid lines
      }
    }

    return latestAssistantMessage ? latestAssistantMessage.slice(0, 300) : '';
  } catch (error) {
    console.error('Failed to read transcript:', error);
    return '';
  }
}
