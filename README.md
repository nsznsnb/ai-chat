# AI Chat - エンターテイメント向けAIチャットボット

Claude APIを使用したシンプルで使いやすいAIチャットボットアプリケーションです。

## 📋 目次

- [特徴](#特徴)
- [技術スタック](#技術スタック)
- [必要要件](#必要要件)
- [セットアップ](#セットアップ)
- [開発](#開発)
- [テスト](#テスト)
- [ビルドとデプロイ](#ビルドとデプロイ)
- [プロジェクト構成](#プロジェクト構成)
- [トラブルシューティング](#トラブルシューティング)

## ✨ 特徴

- 💬 リアルタイムAIチャット（Claude Sonnet 4.5使用）
- 📝 マークダウン表示対応
- 🔄 リトライ機能付きエラーハンドリング
- 📱 レスポンシブデザイン
- 🔒 セキュアな環境変数管理
- 🐳 Docker対応
- ☁️ GCP Cloud Run対応

## 🛠 技術スタック

### フロントエンド
- **Next.js 16** - React フレームワーク（App Router）
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **React Markdown** - マークダウンレンダリング

### バックエンド
- **Next.js API Routes** - APIエンドポイント
- **Anthropic Claude API** - AI機能
- **Prisma** - ORM
- **MongoDB** - データベース（オプション、ログ用）

### 開発ツール
- **Jest** - テストフレームワーク
- **React Testing Library** - コンポーネントテスト
- **ESLint** - コード品質
- **Docker** - コンテナ化

## 📦 必要要件

- **Node.js** 20.x 以上
- **npm** または **yarn**
- **Claude API キー** ([Anthropic Console](https://console.anthropic.com/)から取得)
- **MongoDB** （オプション、ログ機能を使う場合）
  - ローカルMongoDB または
  - [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)（無料枠あり）

## 🚀 セットアップ

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

`.env.example`をコピーして`.env.local`を作成：

```bash
cp .env.example .env.local
```

`.env.local`を編集して以下の値を設定：

```env
# Claude API キー（必須）
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here

# MongoDB接続文字列（オプション）
DATABASE_URL=mongodb://admin:password@localhost:27017/ai-chat?authSource=admin

# アプリケーション設定
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=AI Chat
NODE_ENV=development
```

### 4. Prismaのセットアップ（MongoDBを使用する場合）

```bash
npx prisma generate
npx prisma db push
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) にアクセス

## 💻 開発

### 利用可能なスクリプト

```bash
# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# 本番サーバー起動
npm start

# テスト実行
npm test

# ESLint実行
npm run lint

# 型チェック
npx tsc --noEmit
```

### コード規約

- **TypeScript**: Strict モード有効
- **ESLint**: Next.js推奨設定
- **コミットメッセージ**: Conventional Commits形式推奨
  - `feat:` 新機能
  - `fix:` バグ修正
  - `docs:` ドキュメント更新
  - `test:` テスト追加・修正
  - `refactor:` リファクタリング

## 🧪 テスト

### 単体テストの実行

```bash
# すべての単体テストを実行
npm test tests/unit

# 特定のテストファイルを実行
npm test tests/unit/ChatInput.test.tsx

# ウォッチモードで実行
npm test -- --watch
```

### テストカバレッジの確認

```bash
npm test -- --coverage
```

カバレッジ目標:
- 重要なビジネスロジック: 80%以上
- UIコンポーネント: 60%以上

### 統合テスト

統合テストは開発サーバーが起動している状態で実行します：

```bash
# ターミナル1: 開発サーバー起動
npm run dev

# ターミナル2: 統合テスト実行
RUN_INTEGRATION_TESTS=true npm test tests/integration
```

## 🏗 ビルドとデプロイ

### ローカルビルド

```bash
# 本番ビルド
npm run build

# ビルド結果の確認
npm start
```

### Docker

#### Docker Composeで起動（推奨）

```bash
# 本番モードで起動
docker-compose up --build

# バックグラウンドで起動
docker-compose up -d --build

# 停止
docker-compose down
```

#### Dockerfileのみでビルド

```bash
# イメージのビルド
docker build -t ai-chat:latest .

# コンテナの実行
docker run -p 3000:3000 \
  -e ANTHROPIC_API_KEY=your-key \
  -e DATABASE_URL=your-mongodb-url \
  ai-chat:latest
```

### GCP Cloud Run

**プロジェクトID**: `extended-acumen-480510-c3`

#### 🚀 クイックスタート

初めてデプロイする方は、[SETUP_DEPLOY.md](SETUP_DEPLOY.md) の **完全ガイド** を参照してください。
Google Cloud SDKのインストールから本番デプロイまでの全手順を詳しく説明しています。

#### 詳細なデプロイ手順

技術的な詳細やトラブルシューティングは [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) を参照してください。

#### 🤖 GitHub Actions による自動デプロイ（推奨）

GitHubにプッシュするだけで自動的にCloud Runにデプロイされます。

**セットアップ手順**:

1. **Workload Identity Federationの設定**

```bash
# セットアップスクリプトを実行
bash .github/setup-github-actions.sh YOUR_GITHUB_USERNAME YOUR_REPO_NAME
```

2. **GitHub Secretsの設定**

リポジトリの Settings > Secrets and variables > Actions で以下を追加:
- `WIF_PROVIDER`: Workload Identity Provider
- `WIF_SERVICE_ACCOUNT`: サービスアカウント
- `ANTHROPIC_API_KEY`: Claude APIキー

3. **自動デプロイ**

```bash
# mainブランチにプッシュすると自動的にデプロイ
git add .
git commit -m "feat: update feature"
git push origin main
```

詳細は [.github/SETUP.md](.github/SETUP.md) を参照してください。

#### Makefileによるデプロイ

```bash
# 初回セットアップ（GCP環境の準備）
make gcp-setup

# フルデプロイ（Secret Manager + ビルド + デプロイ）
make deploy-full API_KEY=sk-ant-api03-...

# 再デプロイ（コード変更後）
make deploy
```

#### 自動デプロイスクリプト

```powershell
# Windows PowerShell
.\deploy.ps1
```

```bash
# macOS/Linux
./deploy.sh
```

#### 手動デプロイ

```bash
# 1. gcloud認証
gcloud auth login

# 2. プロジェクト設定
gcloud config set project extended-acumen-480510-c3

# 3. 必要なAPIを有効化
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com

# 4. Secret Manager にAPIキーを保存
echo -n "your-api-key" | gcloud secrets create anthropic-api-key --data-file=-

# 5. イメージビルド
gcloud builds submit --tag asia-northeast1-docker.pkg.dev/extended-acumen-480510-c3/ai-chat-repo/ai-chat:latest

# 6. デプロイ（最小インスタンス数0）
gcloud run deploy ai-chat \
  --image asia-northeast1-docker.pkg.dev/extended-acumen-480510-c3/ai-chat-repo/ai-chat:latest \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --update-secrets ANTHROPIC_API_KEY=anthropic-api-key:latest \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi
```

デプロイ後、表示されるURLにアクセスしてください。

## 📁 プロジェクト構成

```
ai-chat/
├── app/                      # Next.js App Router
│   ├── api/                  # APIエンドポイント
│   │   └── chat/
│   │       └── route.ts      # Chat API
│   ├── globals.css           # グローバルスタイル
│   ├── layout.tsx            # ルートレイアウト
│   └── page.tsx              # メインページ
├── components/               # Reactコンポーネント
│   ├── ChatContainer.tsx     # チャットコンテナ
│   ├── ChatInput.tsx         # 入力フォーム
│   ├── ChatMessage.tsx       # メッセージ表示
│   ├── ErrorMessage.tsx      # エラー表示
│   └── LoadingIndicator.tsx # ローディング表示
├── contexts/                 # React Context
│   └── ChatContext.tsx       # チャット状態管理
├── hooks/                    # カスタムフック
│   └── useChat.ts            # チャット機能
├── lib/                      # ユーティリティ
│   ├── claude.ts             # Claude APIクライアント
│   └── prisma.ts             # Prismaクライアント
├── types/                    # 型定義
│   ├── api.ts                # API型
│   └── chat.ts               # チャット型
├── tests/                    # テスト
│   ├── unit/                 # 単体テスト
│   └── integration/          # 統合テスト
├── prisma/                   # Prismaスキーマ
│   └── schema.prisma
├── .env.example              # 環境変数テンプレート
├── .env.local                # 環境変数（非Git管理）
├── docker-compose.yml        # Docker Compose設定
├── Dockerfile                # Docker設定
├── DEPLOYMENT.md             # デプロイガイド
└── README.md                 # このファイル
```

## 🐛 トラブルシューティング

### Claude APIエラー

**症状**: `APIキーが無効です`

**解決策**:
1. `.env.local`の`ANTHROPIC_API_KEY`を確認
2. APIキーが`sk-ant-api03-`で始まることを確認
3. [Anthropic Console](https://console.anthropic.com/)でAPIキーの有効性を確認

### MongoDBエラー

**症状**: `MongoServerError: Authentication failed`

**解決策**:
1. `DATABASE_URL`の形式を確認
2. MongoDB Atlasの場合、IPホワイトリストを確認
3. ユーザー名・パスワードを確認

### ビルドエラー

**症状**: `npm run build`が失敗する

**解決策**:
```bash
# キャッシュをクリア
rm -rf .next node_modules
npm install
npm run build
```

### テストエラー

**症状**: `react-markdown`のESMエラー

**解決策**:
- すでに`jest.setup.js`でモック設定済み
- エラーが続く場合は`node_modules`を削除して再インストール

### ポート競合

**症状**: `Port 3000 is already in use`

**解決策**:
```bash
# プロセスを確認
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# または別のポートを使用
PORT=3001 npm run dev
```

## 📄 ライセンス

このプロジェクトのライセンスは別途定義してください。

## 🤝 貢献

プルリクエストを歓迎します！以下の手順に従ってください：

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'feat: Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

### 貢献ガイドライン

- すべてのテストが通過すること
- ESLintエラーがないこと
- 適切なコミットメッセージを使用すること
- 新機能にはテストを追加すること

## 📞 サポート

問題が発生した場合:

1. [トラブルシューティング](#トラブルシューティング)セクションを確認
2. [DEPLOYMENT.md](DEPLOYMENT.md)の詳細ガイドを参照
3. GitHubのIssueで質問

## 🔗 関連リンク

- [Claude API Documentation](https://docs.anthropic.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [MongoDB Documentation](https://www.mongodb.com/docs)

---

**バージョン**: 1.0.0
**最終更新**: 2025-12-07
**作成者**: Claude Code
