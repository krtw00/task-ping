# TaskPing ドキュメント

## 目的

このドキュメントはTaskPingプロジェクトのナビゲーションを提供する。

## 概要

TaskPingは並列AI開発ワークフローのためのDiscord通知ツール。Claude Code等のAIコーディングセッションからタスク完了、エラー、レビュー依頼をDiscordに通知する。

## ドキュメント構成

| ドキュメント | 説明 |
|-------------|------|
| @01-overview.md | プロジェクト概要、背景、設計原則 |
| @02-setup.md | セットアップ手順 |
| @03-architecture.md | システムアーキテクチャ、処理フロー |

## クイックリンク

- **GitHub**: https://github.com/krtw00/task-ping
- **関連プロジェクト**: AgentMine

## 用語

| 用語 | 説明 |
|------|------|
| Stop イベント | Claude Codeがレスポンス完了してユーザー入力待ちになった時に発火するイベント |
| Webhook | Discord APIの一方向通知機能。Bot不要で通知を送信可能 |
| Ollama | ローカルで動作するLLMランタイム |
