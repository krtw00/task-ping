# TaskPing

並列AI開発ワークフローのための通知Bot。

複数のAIコーディングセッション（Claude Code、Codex等）からタスク完了、エラー、レビュー依頼をDiscordに通知する。

## 機能

- 🎨 リッチ通知（Embed形式、色分け）
- ✅ 成功（緑）、❌ エラー（赤）、⚠️ 警告（黄）、ℹ️ 情報（青）
- 🏷️ プロジェクト名をBot名として表示
- 📢 @here メンション対応
- 🤖 AI要約機能（Ollama / Anthropic）
- 🔗 Claude Code Hooks連携
- 🚀 Ollama自動起動

## インストール

```bash
git clone https://github.com/krtw00/task-ping.git
cd task-ping
npm install
npm run build
npm link  # グローバルインストール
```

## セットアップ

### 1. Discord Webhookの作成

1. Discordチャンネル設定 → 連携サービス → Webhook
2. 新しいウェブフック → URLをコピー

### 2. 環境設定

ラッパースクリプトを作成: `~/.claude/hooks/task-ping-notify.sh`

```bash
#!/bin/bash
export DISCORD_WEBHOOK_URL="your-webhook-url"
export SUMMARY_BACKEND="ollama"  # または "anthropic"
export OLLAMA_MODEL="llama3.2"

task-ping-hook
```

```bash
chmod +x ~/.claude/hooks/task-ping-notify.sh
```

### 3. Claude Code Hooks設定

`~/.claude/settings.json` に追加:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/task-ping-notify.sh 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

### 4. Ollamaのインストール（ローカル要約用）

```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3.2
sudo systemctl enable ollama  # 自動起動
```

## 動作の仕組み

```
Claude Codeがレスポンス完了
    ↓ Stopイベント
~/.claude/hooks/task-ping-notify.sh
    ↓
task-ping-hook
    ↓ (必要に応じてOllama自動起動)
LLMで要約生成 → Discord通知
```

## CLI使用方法

```bash
# 基本的な通知
task-ping "ビルド完了"

# タイプ指定通知
task-ping --success "全テスト合格"
task-ping --error "ビルド失敗"
task-ping --warning "レビュー依頼"

# オプション付き
task-ping -t success -p AgentMine "機能実装完了"
task-ping --error --mention "重大な障害!"
task-ping -T "カスタムタイトル" "メッセージ"
```

## プログラムからの使用

```typescript
import { sendNotification } from 'task-ping';

await sendNotification(
  { webhookUrl: process.env.DISCORD_WEBHOOK_URL },
  {
    type: 'success',
    message: 'ビルド完了!',
    project: 'MyProject',
  }
);
```

## 通知タイプ

| タイプ | 色 | デフォルトタイトル | 用途 |
|--------|-----|-------------------|------|
| `success` | 🟢 緑 | ✅ Task Completed | タスク正常完了 |
| `error` | 🔴 赤 | ❌ Error | 失敗、例外 |
| `warning` | 🟡 黄 | ⚠️ Attention Required | レビュー依頼、警告 |
| `info` | 🔵 青 | ℹ️ Info | 一般情報 |

## 環境変数

| 変数 | 必須 | 説明 |
|------|------|------|
| `DISCORD_WEBHOOK_URL` | Yes | Discord Webhook URL |
| `PROJECT_NAME` | No | プロジェクト名（未指定時はディレクトリ名） |
| `SUMMARY_BACKEND` | No | `ollama`（デフォルト）または `anthropic` |
| `OLLAMA_URL` | No | Ollama API URL（デフォルト: `http://localhost:11434`） |
| `OLLAMA_MODEL` | No | Ollamaモデル（デフォルト: `llama3.2`） |
| `ANTHROPIC_API_KEY` | No | Anthropicバックエンド使用時に必要 |

## ドキュメント

詳細は [docs/](./docs/) を参照。

## ライセンス

MIT
