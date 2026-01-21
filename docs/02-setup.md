# セットアップ手順

## 目的

このドキュメントはTaskPingのセットアップ手順を説明する。

## 前提条件

| 要件 | バージョン |
|------|----------|
| Node.js | 18以上 |
| npm | 任意 |
| Discord アカウント | - |
| Ollama（推奨） | 任意 |

## 手順

### 1. TaskPingのインストール

リポジトリをクローンし、ビルド・グローバルインストールする。

```bash
git clone https://github.com/krtw00/task-ping.git
cd task-ping
npm install
npm run build
npm link
```

### 2. Discord Webhookの作成

Discord側で通知先チャンネルにWebhookを作成する。

1. 通知先チャンネルの設定を開く
2. 連携サービス → Webhooks
3. 新しいウェブフック → 作成
4. URLをコピー

### 3. ラッパースクリプトの作成

Claude Code Hooksから呼び出すスクリプトを作成する。

場所: `~/.claude/hooks/task-ping-notify.sh`

内容:
- DISCORD_WEBHOOK_URL: 手順2で取得したURL
- SUMMARY_BACKEND: `ollama`（ローカル）または `anthropic`（クラウド）
- OLLAMA_MODEL: 使用するモデル名

スクリプトに実行権限を付与する。

### 4. Claude Code Hooksの設定

`~/.claude/settings.json` にStopイベントのフックを追加する。

Stopイベント発火時にラッパースクリプトを実行する設定を追加。エラー時は握りつぶす（`2>/dev/null || true`）。

### 5. Ollamaのセットアップ（推奨）

ローカルLLMで要約を生成する場合、Ollamaをインストールする。

1. Ollamaをインストール
2. モデルをダウンロード（llama3.2推奨）
3. systemdで自動起動を有効化

systemd化により、PC起動時にOllamaが自動起動し、初回通知の遅延を解消できる。

## 動作確認

新しいClaude Codeセッションを開始し、何か作業を行う。AIが入力待ち状態になるとDiscordに通知が届く。

## トラブルシューティング

| 症状 | 対処 |
|------|------|
| 通知が届かない | Claude Codeを再起動（設定反映のため） |
| 要約が生成されない | Ollamaが起動しているか確認 |
| 初回通知が遅い | Ollamaをsystemd化して常時起動 |

## 関連ドキュメント

- @01-overview.md - プロジェクト概要
- @03-architecture.md - システムアーキテクチャ
