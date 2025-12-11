# デプロイメントガイド

このドキュメントでは、AI Chat アプリケーションのデプロイ手順を説明します。

## 目次

- [ローカル開発環境](#ローカル開発環境)
- [Docker での実行](#docker-での実行)
- [GCP Cloud Run へのデプロイ](#gcp-cloud-run-へのデプロイ)
- [環境変数の管理](#環境変数の管理)
- [トラブルシューティング](#トラブルシューティング)

---

## ローカル開発環境

### 前提条件

- Node.js 20.x 以上
- npm または yarn
- MongoDB (ローカルまたは MongoDB Atlas)

### セットアップ手順

1. **リポジトリのクローン**

```bash
git clone <repository-url>
cd ai-chat
```

2. **依存関係のインストール**

```bash
npm install
```

3. **環境変数の設定**

```bash
cp .env.example .env.local
```

`.env.local` を編集して、以下の値を設定:

```env
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key
DATABASE_URL=mongodb://admin:password@localhost:27017/ai-chat?authSource=admin
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

4. **Prisma のセットアップ**

```bash
npx prisma generate
npx prisma db push
```

5. **開発サーバーの起動**

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) にアクセス

---

## Docker での実行

### 前提条件

- Docker Desktop インストール済み
- Docker Compose インストール済み

### Docker Compose での起動

#### 本番モード（推奨）

```bash
# .env ファイルを作成
cp .env.example .env

# .env を編集してANTHROPIC_API_KEYを設定
# DATABASE_URLはdocker-compose.ymlで自動設定されます

# ビルドと起動
docker-compose up --build

# バックグラウンドで起動
docker-compose up -d --build
```

アプリケーションは [http://localhost:3000](http://localhost:3000) で利用可能

#### 開発モード（ホットリロード対応）

```bash
# 開発モードで起動
docker-compose --profile dev up dev

# または
docker-compose up dev --profile dev
```

アプリケーションは [http://localhost:3001](http://localhost:3001) で利用可能

### Docker コマンド

```bash
# コンテナの停止
docker-compose down

# コンテナとボリュームの削除
docker-compose down -v

# ログの確認
docker-compose logs -f app

# MongoDB のログ確認
docker-compose logs -f mongodb

# 特定のサービスのみ起動
docker-compose up mongodb

# コンテナに入る
docker-compose exec app sh
docker-compose exec mongodb mongosh
```

### Dockerfile のみでビルド

```bash
# イメージのビルド
docker build -t ai-chat:latest .

# コンテナの実行
docker run -p 3000:3000 \
  -e ANTHROPIC_API_KEY=your-key \
  -e DATABASE_URL=your-mongodb-url \
  ai-chat:latest
```

---

## GCP Cloud Run へのデプロイ

### 前提条件

- Google Cloud アカウント
- gcloud CLI インストール済み
- GCP プロジェクト作成済み
- MongoDB Atlas アカウント（または Cloud SQL for MongoDB）

### 1. gcloud の初期設定

```bash
# gcloud にログイン
gcloud auth login

# プロジェクトの設定
gcloud config set project YOUR_PROJECT_ID

# デフォルトリージョンの設定
gcloud config set run/region asia-northeast1

# 必要なAPIの有効化
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com
```

### 2. Secret Manager でシークレット管理

```bash
# ANTHROPIC_API_KEY の登録
echo -n "sk-ant-api03-your-actual-key" | \
  gcloud secrets create anthropic-api-key --data-file=-

# DATABASE_URL の登録 (MongoDB Atlas接続文字列)
echo -n "mongodb+srv://username:password@cluster.mongodb.net/ai-chat" | \
  gcloud secrets create database-url --data-file=-

# シークレットの確認
gcloud secrets list

# Cloud Run サービスアカウントに権限付与
gcloud secrets add-iam-policy-binding anthropic-api-key \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding database-url \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Artifact Registry でリポジトリ作成

```bash
# Docker リポジトリの作成
gcloud artifacts repositories create ai-chat-repo \
  --repository-format=docker \
  --location=asia-northeast1 \
  --description="AI Chat application repository"

# Docker 認証設定
gcloud auth configure-docker asia-northeast1-docker.pkg.dev
```

### 4. Cloud Build でイメージをビルド

```bash
# イメージのビルドとプッシュ
gcloud builds submit \
  --tag asia-northeast1-docker.pkg.dev/YOUR_PROJECT_ID/ai-chat-repo/ai-chat:latest

# 特定のタグでビルド
gcloud builds submit \
  --tag asia-northeast1-docker.pkg.dev/YOUR_PROJECT_ID/ai-chat-repo/ai-chat:v1.0.0
```

### 5. Cloud Run にデプロイ

```bash
# デプロイ実行
gcloud run deploy ai-chat \
  --image asia-northeast1-docker.pkg.dev/YOUR_PROJECT_ID/ai-chat-repo/ai-chat:latest \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,NEXT_PUBLIC_APP_NAME="AI Chat" \
  --update-secrets ANTHROPIC_API_KEY=anthropic-api-key:latest \
  --update-secrets DATABASE_URL=database-url:latest \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60 \
  --concurrency 80 \
  --port 3000

# デプロイ完了後、URLが表示されます
# 例: https://ai-chat-xxxxx-an.a.run.app
```

### 6. カスタムドメインの設定（オプション）

```bash
# ドメインマッピングの作成
gcloud run domain-mappings create \
  --service ai-chat \
  --domain your-domain.com \
  --region asia-northeast1

# DNS設定の指示が表示されるので、ドメインレジストラで設定
```

### 7. デプロイの確認

```bash
# サービスの詳細確認
gcloud run services describe ai-chat --region asia-northeast1

# ログの確認
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ai-chat" \
  --limit 50 \
  --format json

# リアルタイムログ
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=ai-chat"
```

---

## デプロイスクリプト

便利なデプロイスクリプトを作成:

### deploy.sh

```bash
#!/bin/bash

# 設定
PROJECT_ID="your-project-id"
REGION="asia-northeast1"
SERVICE_NAME="ai-chat"
REPO_NAME="ai-chat-repo"
IMAGE_TAG="latest"

# イメージパス
IMAGE_PATH="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:${IMAGE_TAG}"

echo "Building and deploying AI Chat to Cloud Run..."

# ビルド
echo "Step 1: Building Docker image..."
gcloud builds submit --tag ${IMAGE_PATH}

if [ $? -ne 0 ]; then
  echo "Build failed. Exiting."
  exit 1
fi

# デプロイ
echo "Step 2: Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_PATH} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,NEXT_PUBLIC_APP_NAME="AI Chat" \
  --update-secrets ANTHROPIC_API_KEY=anthropic-api-key:latest \
  --update-secrets DATABASE_URL=database-url:latest \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60 \
  --concurrency 80 \
  --port 3000

if [ $? -eq 0 ]; then
  echo "Deployment successful!"
  gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format='value(status.url)'
else
  echo "Deployment failed."
  exit 1
fi
```

使用方法:

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 環境変数の管理

### ローカル開発

- `.env.local` ファイルを使用
- Git にはコミットしない（`.gitignore` に追加済み）

### Docker

- `.env` ファイルまたは `docker-compose.yml` の environment セクション
- 機密情報は `.env` ファイルに記載し、Git にコミットしない

### Cloud Run

- Secret Manager を使用
- 機密情報（API キー、DB URL）は必ず Secret Manager に保存
- 非機密情報は `--set-env-vars` で設定可能

### 環境変数一覧

| 変数名 | 必須 | 説明 | 例 |
|--------|------|------|-----|
| `ANTHROPIC_API_KEY` | ✓ | Claude API キー | `sk-ant-api03-...` |
| `DATABASE_URL` | ✓ | MongoDB 接続文字列 | `mongodb://...` |
| `NODE_ENV` | ✓ | 実行環境 | `production`, `development` |
| `NEXT_PUBLIC_APP_URL` |  | アプリケーションURL | `https://your-domain.com` |
| `NEXT_PUBLIC_APP_NAME` |  | アプリ名 | `AI Chat` |
| `PORT` |  | ポート番号（Cloud Run自動設定） | `3000` |

---

## MongoDB のセットアップ

### MongoDB Atlas（推奨）

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) でアカウント作成
2. 無料クラスター（M0）を作成
3. データベースユーザーを作成
4. ネットワークアクセスで IP ホワイトリストを設定
   - ローカル開発: 自分の IP アドレス
   - Cloud Run: `0.0.0.0/0`（または Cloud Run の IP 範囲）
5. 接続文字列をコピー

```
mongodb+srv://username:password@cluster.mongodb.net/ai-chat?retryWrites=true&w=majority
```

### ローカル MongoDB

Docker Compose を使用する場合は自動的にセットアップされます。

```bash
docker-compose up mongodb
```

---

## ヘルスチェック

アプリケーションには `/api/health` エンドポイントが必要です。
（Phase 9で実装予定）

確認方法:

```bash
# ローカル
curl http://localhost:3000/api/health

# Cloud Run
curl https://your-app-url/api/health
```

---

## モニタリングとログ

### Cloud Logging

```bash
# エラーログのみ表示
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" \
  --limit 50

# 特定のタイムスタンプ以降
gcloud logging read "resource.type=cloud_run_revision" \
  --since="2025-12-07T00:00:00Z"
```

### Cloud Monitoring

1. GCP Console > Monitoring > Dashboards
2. Cloud Run メトリクスを確認:
   - リクエスト数
   - レスポンスタイム
   - エラー率
   - メモリ使用量

### アラート設定（推奨）

```bash
# エラー率が5%を超えた場合のアラート作成
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="High Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s
```

---

## スケーリング設定

### Cloud Run のスケーリングパラメータ

- **最小インスタンス数**: 0（コールドスタート許容でコスト削減）
- **最大インスタンス数**: 10（小規模アプリに適切）
- **同時実行数**: 80（デフォルト、調整可能）
- **CPU**: 1（十分なパフォーマンス）
- **メモリ**: 512Mi（Next.js に適切）

トラフィック増加時の調整:

```bash
gcloud run services update ai-chat \
  --region asia-northeast1 \
  --max-instances 50 \
  --min-instances 1 \
  --cpu 2 \
  --memory 1Gi
```

---

## コスト最適化

### 推奨設定

1. **最小インスタンス数を0に設定**
   - コールドスタート（1-2秒）は許容
   - アイドル時のコストゼロ

2. **MongoDB Atlas 無料枠を活用**
   - M0クラスター（512MB）で十分

3. **不要なログを削減**
   - 本番環境では ERROR レベルのみ記録

4. **レート制限の実装**
   - 無駄な API 呼び出しを防止

### コスト見積もり（月額）

- Cloud Run: 無料枠内 ～ $5
- MongoDB Atlas: 無料（M0）
- Claude API: $10-30（使用量による）
- **合計**: $10-35

---

## トラブルシューティング

### 1. ビルドエラー

**症状**: `gcloud builds submit` が失敗

**解決策**:
```bash
# Docker のローカルビルドで確認
docker build -t test .

# エラーログを確認
gcloud builds log <BUILD_ID>
```

### 2. デプロイエラー

**症状**: Cloud Run デプロイが失敗

**解決策**:
```bash
# サービスアカウントの権限確認
gcloud projects get-iam-policy YOUR_PROJECT_ID

# Secret Manager の権限確認
gcloud secrets get-iam-policy anthropic-api-key
```

### 3. 環境変数エラー

**症状**: アプリが環境変数を読み込めない

**解決策**:
```bash
# Cloud Run の環境変数確認
gcloud run services describe ai-chat \
  --region asia-northeast1 \
  --format='value(spec.template.spec.containers[0].env)'

# Secret の値確認（注意: 機密情報）
gcloud secrets versions access latest --secret=anthropic-api-key
```

### 4. MongoDB 接続エラー

**症状**: `MongoServerError: Authentication failed`

**解決策**:
- MongoDB Atlas の IP ホワイトリストを確認
- 接続文字列の username/password を確認
- `authSource=admin` が含まれているか確認

### 5. Claude API エラー

**症状**: `401 Unauthorized`

**解決策**:
- API キーの形式を確認（`sk-ant-api03-` で始まる）
- [Anthropic Console](https://console.anthropic.com/) でキーの有効性を確認
- Secret Manager に正しく保存されているか確認

### 6. コールドスタート遅延

**症状**: 初回リクエストが遅い（3秒以上）

**解決策**:
```bash
# 最小インスタンス数を1に変更（コスト増）
gcloud run services update ai-chat \
  --region asia-northeast1 \
  --min-instances 1
```

---

## ロールバック手順

### 以前のリビジョンに戻す

```bash
# リビジョン一覧を確認
gcloud run revisions list --service ai-chat --region asia-northeast1

# 特定のリビジョンにトラフィックを向ける
gcloud run services update-traffic ai-chat \
  --region asia-northeast1 \
  --to-revisions REVISION_NAME=100
```

### 以前のイメージでデプロイ

```bash
# タグ付きイメージでデプロイ
gcloud run deploy ai-chat \
  --image asia-northeast1-docker.pkg.dev/YOUR_PROJECT_ID/ai-chat-repo/ai-chat:v1.0.0 \
  --region asia-northeast1
```

---

## CI/CD パイプライン（オプション）

GitHub Actions の例:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - id: auth
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Build and Deploy
        run: |
          gcloud builds submit --tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/ai-chat
          gcloud run deploy ai-chat \
            --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/ai-chat \
            --region asia-northeast1 \
            --platform managed
```

---

## セキュリティのベストプラクティス

1. **Secret Manager を使用**
   - 環境変数にシークレットを直接記載しない

2. **最小権限の原則**
   - サービスアカウントに必要最小限の権限のみ付与

3. **HTTPS の強制**
   - Cloud Run はデフォルトで HTTPS

4. **CORS の適切な設定**
   - 本番環境では特定のオリジンのみ許可

5. **レート制限**
   - DDoS 攻撃対策

6. **定期的なアップデート**
   - 依存関係の脆弱性スキャン

```bash
npm audit
npm audit fix
```

---

## まとめ

このガイドに従って、以下の環境でアプリケーションをデプロイできます:

- ✅ ローカル開発環境
- ✅ Docker / Docker Compose
- ✅ GCP Cloud Run（本番環境）

問題が発生した場合は、トラブルシューティングセクションを参照してください。

---

**最終更新日**: 2025-12-07
**バージョン**: 1.0.0
