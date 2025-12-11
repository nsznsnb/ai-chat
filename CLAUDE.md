# AIチャットボット プロジェクト仕様書

## プロジェクト概要

エンターテイメント向けのシンプルなAIチャットボットアプリケーション。
一般ユーザーが気軽に会話を楽しめるWebアプリケーションを提供します。

### 基本情報

- **目的**: エンターテイメント
- **対象ユーザー**: 一般ユーザー
- **想定同時接続数**: 5～10人程度
- **言語**: 日本語（単一言語）

## 技術スタック

### フロントエンド
- **フレームワーク**: Next.js 15+ (App Router)
- **言語**: TypeScript
- **状態管理**: React Hooks (useState, useContext)
- **スタイリング**: Tailwind CSS（推奨）
- **UIライブラリ**: shadcn/ui（オプション）

### バックエンド
- **APIフレームワーク**: Hono
- **ORM**: Prisma
- **データベース**: MongoDB
- **AI API**: Claude API (claude-sonnet-4.5)

### インフラ
- **ホスティング**: Google Cloud Platform
- **コンテナ**: Cloud Run
- **環境変数管理**: Google Cloud Secret Manager

## システム構成

### アーキテクチャ

```
[クライアント (Next.js)]
        ↓
[API Routes (Next.js App Router)]
        ↓
[Hono API Layer]
        ↓
[Prisma ORM] ← → [MongoDB]
        ↓
[Claude API]
```

### セッション管理

- **方式**: クライアントサイドの状態管理のみ（メモリベース）
- **会話履歴**: セッション中のみ保持（ブラウザリロード/クローズで消失）
- **認証**: 不要

### データフロー

1. ユーザーがメッセージを入力
2. Next.js API Routesに送信
3. Hono経由でClaude APIを呼び出し
4. レスポンスをクライアントに返却
5. クライアント側でチャット履歴を状態管理

## 機能要件

### 必須機能

#### 1. チャット機能
- ユーザーがテキストメッセージを送信
- Claude APIからの応答を受信・表示
- 会話履歴の表示（セッション中のみ）

#### 2. UI/UX
- シンプルな1画面構成
- レスポンシブデザイン（スマホ・タブレット対応）
- ビジネスライクなデザイン
- マークダウン表示対応（コードブロック、箇条書き等）
- ローディングインジケーター

#### 3. エラーハンドリング
- API エラー時の適切なメッセージ表示
- ネットワークエラーのハンドリング
- 再試行機能（ユーザー操作）

### 非必須機能（将来的な拡張）
- ダークモード
- 会話履歴の永続化
- ストリーミング応答
- 音声入力

## 非機能要件

### パフォーマンス
- 初回レスポンス: 3秒以内
- ページロード時間: 2秒以内

### セキュリティ
- CORS設定の適切な構成
- 環境変数による機密情報管理
- 基本的なレート制限（DDoS対策）
- XSS対策（入力サニタイズ）

### 可用性
- Cloud Runのオートスケーリング活用
- エラーログの記録（Cloud Logging）

### コスト最適化
- セッションベースの一時データ管理（DB書き込み最小化）
- Cloud Runの最小インスタンス数: 0（コールドスタート許容）
- 不要なミドルウェア・ライブラリの排除

## ディレクトリ構成

```
ai-chat/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts          # Chat API endpoint
│   │   ├── layout.tsx                 # Root layout
│   │   ├── page.tsx                   # Main chat page
│   │   └── globals.css
│   ├── components/
│   │   ├── ChatMessage.tsx            # Individual message component
│   │   ├── ChatInput.tsx              # Message input component
│   │   ├── ChatContainer.tsx          # Chat container component
│   │   └── LoadingIndicator.tsx      # Loading state component
│   ├── lib/
│   │   ├── claude.ts                  # Claude API client
│   │   ├── prisma.ts                  # Prisma client
│   │   └── hono.ts                    # Hono app configuration
│   ├── types/
│   │   └── chat.ts                    # TypeScript types
│   └── contexts/
│       └── ChatContext.tsx            # Chat state management
├── prisma/
│   └── schema.prisma                  # Prisma schema
├── public/
├── tests/
│   ├── unit/
│   └── integration/
├── .env.local
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── next.config.js
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── CLAUDE.md                          # This file
```

## 環境変数

### 必須環境変数

```env
# Claude API
ANTHROPIC_API_KEY=your_claude_api_key

# MongoDB
DATABASE_URL=mongodb://username:password@host:port/database

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Node Environment
NODE_ENV=development
```

### .env.example の作成

プロジェクトには必ず `.env.example` を用意し、実際の値は含めない。

## 開発ガイドライン

### コーディング規約

#### TypeScript
- Strict モードを有効化
- 明示的な型定義を推奨
- `any` の使用は最小限に

#### React/Next.js
- 関数コンポーネントを使用
- Server Components を優先（Client Componentsは必要な場合のみ）
- カスタムフックで状態ロジックを分離

#### CSS
- Tailwind CSS のユーティリティクラスを活用
- カスタムCSSは最小限に

### Git運用

#### ブランチ戦略
- `main`: 本番環境
- `develop`: 開発環境
- `feature/*`: 機能開発
- `fix/*`: バグ修正

#### コミットメッセージ
```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードフォーマット
refactor: リファクタリング
test: テスト追加・修正
chore: ビルド・補助ツール関連
```

### テストコード作成時の厳守事項

#### テストコードの品質

- テストは必ず実際の機能を検証すること
- `expect(true).toBe(true)` のような意味のないアサーションは絶対に書かない
- モックは必要最小限に留め、実際の動作に近い形でテストすること

#### ハードコーディングの禁止

- テストを通すためだけのハードコードは絶対に禁止
- 本番コードに `if(testMode)` のような条件分岐を入れない
- テスト用の特別な値（マジックナンバー）を本番コードに埋め込まない
- 環境変数や設定ファイルを使用して、テスト環境と本番環境を適切に分離すること

#### テスト実装の原則

- テストが失敗する状態から始めること（Red-Green-Refactor）
- 境界値、異常値、エラーケースも必ずテストすること
- カバレッジだけでなく、実際の品質を重視すること
- テストケース名は何をテストしているか明確に記述すること

#### 実装前の確認

- 機能の仕様を正しく理解してからテストを書くこと
- 不明な点があれば、仮の実装ではなく、ユーザーに確認すること

### テスト方針

#### テストレベル
- **単体テスト**: 各コンポーネント、関数、APIエンドポイント
- **統合テスト**: API連携、データフロー

#### テストフレームワーク
- **Jest**: 単体テスト
- **React Testing Library**: コンポーネントテスト
- **Playwright**: E2Eテスト（オプション）

#### カバレッジ目標
- 重要なビジネスロジック: 80%以上
- UIコンポーネント: 60%以上

## API設計

### エンドポイント

#### POST /api/chat

ユーザーメッセージを送信し、Claude APIからの応答を取得

**リクエスト**
```typescript
{
  "message": string,
  "conversationHistory": Array<{
    role: "user" | "assistant",
    content: string
  }>
}
```

**レスポンス**
```typescript
{
  "response": string,
  "timestamp": string
}
```

**エラーレスポンス**
```typescript
{
  "error": string,
  "code": string
}
```

### レート制限

- IPベースの簡易的なレート制限
- 1分間に20リクエストまで（調整可能）

## データモデル

### セッション管理（クライアントサイド）

```typescript
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatSession {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}
```

### MongoDB スキーマ（ログ用・オプション）

```prisma
model ChatLog {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  sessionId String?
  message   String
  response  String
  timestamp DateTime @default(now())
  error     String?
}
```

## デプロイ手順

### 前提条件

- Google Cloud SDK インストール済み
- GCPプロジェクト作成済み
- MongoDB Atlas または MongoDB インスタンス準備済み

### 1. 環境変数の設定

```bash
# Secret Manager に環境変数を追加
gcloud secrets create anthropic-api-key --data-file=- <<< "your_api_key"
gcloud secrets create database-url --data-file=- <<< "your_mongodb_url"
```

### 2. Dockerイメージのビルド

```bash
# Cloud Build でビルド
gcloud builds submit --tag gcr.io/[PROJECT_ID]/ai-chat
```

### 3. Cloud Run にデプロイ

```bash
gcloud run deploy ai-chat \
  --image gcr.io/[PROJECT_ID]/ai-chat \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --update-secrets ANTHROPIC_API_KEY=anthropic-api-key:latest \
  --update-secrets DATABASE_URL=database-url:latest \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1
```

### 4. カスタムドメインの設定（オプション）

```bash
gcloud run domain-mappings create \
  --service ai-chat \
  --domain your-domain.com \
  --region asia-northeast1
```

## 開発環境のセットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd ai-chat
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

```bash
cp .env.example .env.local
# .env.local を編集して実際の値を設定
```

### 4. Prisma のセットアップ

```bash
npx prisma generate
npx prisma db push
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセス

## 監視・ログ

### Cloud Logging

- エラーログの自動収集
- APIリクエストログ
- パフォーマンスメトリクス

### Cloud Monitoring

- レスポンスタイム
- エラー率
- リクエスト数

### アラート設定（推奨）

- エラー率が5%を超えた場合
- レスポンスタイムが5秒を超えた場合

## コスト見積もり

### 想定コスト（月額）

- **Cloud Run**: 無料枠内 ～ $5
  - 5-10人同時接続、最小インスタンス0
- **MongoDB Atlas**: 無料枠（M0）～ $9（M2）
- **Claude API**: 使用量に応じて変動
  - claude-sonnet-4.5: 入力 $3/MTok, 出力 $15/MTok
  - 月間1万メッセージ想定: 約 $10-30
- **合計**: 月額 $15-50 程度

### コスト最適化のポイント

- Cloud Run の最小インスタンス数を0に設定
- MongoDB は無料枠を活用
- 不要な会話履歴の永続化を避ける
- 適切なレート制限で無駄なAPI呼び出しを防ぐ

## トラブルシューティング

### よくある問題

#### 1. Claude APIエラー

**症状**: API呼び出しが失敗する

**解決策**:
- API キーが正しく設定されているか確認
- レート制限に達していないか確認
- ネットワーク接続を確認

#### 2. MongoDB接続エラー

**症状**: データベース接続が失敗する

**解決策**:
- DATABASE_URL が正しいか確認
- MongoDB のネットワークアクセス設定を確認
- IP ホワイトリストに Cloud Run の IP を追加

#### 3. Cloud Run デプロイエラー

**症状**: デプロイが失敗する

**解決策**:
- Dockerfile の構文を確認
- ビルドログを確認
- メモリ・CPU設定を調整

## ライセンス

このプロジェクトのライセンスは別途定義してください。

## 貢献ガイドライン

プルリクエストは以下の条件を満たしてください:
- テストが全て通過すること
- コーディング規約に従っていること
- 適切なコミットメッセージを使用すること

## 連絡先・サポート

プロジェクトに関する質問は、GitHubのIssueで受け付けています。

---

**最終更新日**: 2025-12-07
**バージョン**: 1.0.0
