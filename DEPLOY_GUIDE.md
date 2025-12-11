# GCP Cloud Run デプロイガイド

このガイドでは、AI ChatアプリケーションをGCP Cloud Runにデプロイする手順を説明します。

## プロジェクト情報

- **GCPプロジェクトID**: `extended-acumen-480510-c3`
- **リージョン**: `asia-northeast1` (東京)
- **サービス名**: `ai-chat`
- **最小インスタンス数**: 0 (コスト最適化)

## 前提条件

### 1. Google Cloud SDKのインストール

Windows環境でgcloud CLIをインストール：

1. [Google Cloud SDK Installer](https://cloud.google.com/sdk/docs/install) をダウンロード
2. インストーラーを実行
3. インストール完了後、PowerShellまたはコマンドプロンプトを再起動

インストール確認：
```bash
gcloud --version
```

### 2. 認証とプロジェクト設定

```bash
# Google アカウントで認証
gcloud auth login

# プロジェクトを設定
gcloud config set project extended-acumen-480510-c3

# デフォルトリージョンを設定
gcloud config set run/region asia-northeast1
```

### 3. 必要なAPIの有効化

```bash
# 必要なAPIを有効化
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

## デプロイ手順

### ステップ1: 環境変数の準備

Claude API キーを環境変数として設定（PowerShell）：

```powershell
# Claude API キーを設定
$env:ANTHROPIC_API_KEY = "sk-ant-api03-your-actual-key-here"
```

### ステップ2: Secret Managerにシークレットを保存

```bash
# Claude API キーを Secret Manager に保存
echo -n "sk-ant-api03-your-actual-key-here" | gcloud secrets create anthropic-api-key --data-file=-

# MongoDB URLを保存（オプション、使用する場合）
# MongoDB Atlasの接続文字列を使用
echo -n "mongodb+srv://username:password@cluster.mongodb.net/ai-chat" | gcloud secrets create database-url --data-file=-

# シークレット一覧を確認
gcloud secrets list
```

### ステップ3: サービスアカウントに権限を付与

```bash
# プロジェクト番号を取得
$PROJECT_NUMBER = gcloud projects describe extended-acumen-480510-c3 --format="value(projectNumber)"

# Compute Engine のデフォルトサービスアカウント
$SERVICE_ACCOUNT = "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Secret Accessor ロールを付与
gcloud secrets add-iam-policy-binding anthropic-api-key `
  --member="serviceAccount:$SERVICE_ACCOUNT" `
  --role="roles/secretmanager.secretAccessor"

# MongoDBを使用する場合
gcloud secrets add-iam-policy-binding database-url `
  --member="serviceAccount:$SERVICE_ACCOUNT" `
  --role="roles/secretmanager.secretAccessor"
```

### ステップ4: Artifact Registry リポジトリの作成

```bash
# Docker リポジトリを作成
gcloud artifacts repositories create ai-chat-repo `
  --repository-format=docker `
  --location=asia-northeast1 `
  --description="AI Chat application repository"

# Docker 認証設定
gcloud auth configure-docker asia-northeast1-docker.pkg.dev
```

### ステップ5: Dockerイメージのビルドとプッシュ

```bash
# プロジェクトのルートディレクトリに移動
cd c:\Users\ninis\Desktop\claude-practice\ai-chat

# Cloud Build でイメージをビルド＆プッシュ
gcloud builds submit `
  --tag asia-northeast1-docker.pkg.dev/extended-acumen-480510-c3/ai-chat-repo/ai-chat:latest

# ビルド状態を確認
gcloud builds list --limit=5
```

**注意**: ビルドには3〜5分かかります。

### ステップ6: Cloud Run にデプロイ

```bash
# デプロイ実行
gcloud run deploy ai-chat `
  --image asia-northeast1-docker.pkg.dev/extended-acumen-480510-c3/ai-chat-repo/ai-chat:latest `
  --platform managed `
  --region asia-northeast1 `
  --allow-unauthenticated `
  --set-env-vars NODE_ENV=production,NEXT_PUBLIC_APP_NAME="AI Chat" `
  --update-secrets ANTHROPIC_API_KEY=anthropic-api-key:latest `
  --min-instances 0 `
  --max-instances 10 `
  --memory 512Mi `
  --cpu 1 `
  --timeout 60 `
  --concurrency 80 `
  --port 3000
```

**パラメータ説明**:
- `--min-instances 0`: アイドル時はインスタンス0でコスト削減
- `--max-instances 10`: 最大10インスタンスまでスケール
- `--memory 512Mi`: 512MBメモリ（Next.jsに適切）
- `--cpu 1`: 1 vCPU
- `--timeout 60`: リクエストタイムアウト60秒
- `--concurrency 80`: 1インスタンスあたり80同時リクエスト
- `--allow-unauthenticated`: 認証なしでアクセス可能

デプロイ完了後、URLが表示されます：
```
Service [ai-chat] revision [ai-chat-00001-xxx] has been deployed and is serving 100 percent of traffic.
Service URL: https://ai-chat-xxxxxxxxxx-an.a.run.app
```

### ステップ7: デプロイの確認

```bash
# サービスの詳細を確認
gcloud run services describe ai-chat --region asia-northeast1

# サービスURLを取得
gcloud run services describe ai-chat --region asia-northeast1 --format="value(status.url)"

# ヘルスチェック
curl https://ai-chat-xxxxxxxxxx-an.a.run.app/api/health
```

ブラウザでサービスURLにアクセスして動作確認してください。

## MongoDBの設定（オプション）

MongoDBを使用する場合は、MongoDB Atlasを推奨します：

### MongoDB Atlas セットアップ

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) でアカウント作成
2. 無料クラスター (M0) を作成
3. データベースユーザーを作成
4. ネットワークアクセスで `0.0.0.0/0` を追加（Cloud Run用）
5. 接続文字列をコピー
6. Secret Manager に保存（上記ステップ2参照）

デプロイコマンドに MongoDB URL を追加：

```bash
gcloud run deploy ai-chat `
  --image asia-northeast1-docker.pkg.dev/extended-acumen-480510-c3/ai-chat-repo/ai-chat:latest `
  --platform managed `
  --region asia-northeast1 `
  --allow-unauthenticated `
  --set-env-vars NODE_ENV=production,NEXT_PUBLIC_APP_NAME="AI Chat" `
  --update-secrets ANTHROPIC_API_KEY=anthropic-api-key:latest,DATABASE_URL=database-url:latest `
  --min-instances 0 `
  --max-instances 10 `
  --memory 512Mi `
  --cpu 1 `
  --timeout 60 `
  --concurrency 80 `
  --port 3000
```

## トラブルシューティング

### ビルドエラー

**症状**: `gcloud builds submit` が失敗

**解決策**:
```bash
# ローカルでDockerビルドを確認
docker build -t test .

# ビルドログを確認
gcloud builds log <BUILD_ID>
```

### デプロイエラー

**症状**: デプロイが失敗

**解決策**:
```bash
# サービスログを確認
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ai-chat" --limit 50

# リアルタイムログ
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=ai-chat"
```

### APIキーエラー

**症状**: `401 Unauthorized` エラー

**解決策**:
```bash
# Secret が正しく設定されているか確認
gcloud secrets versions access latest --secret=anthropic-api-key

# サービスアカウントの権限を確認
gcloud secrets get-iam-policy anthropic-api-key
```

### コールドスタート遅延

**症状**: 初回リクエストが遅い（3秒以上）

**解決策**:
最小インスタンス数を1に変更（コスト増）：
```bash
gcloud run services update ai-chat `
  --region asia-northeast1 `
  --min-instances 1
```

## 更新とロールバック

### アプリケーションの更新

コードを変更した後：

```bash
# 1. 新しいイメージをビルド
gcloud builds submit `
  --tag asia-northeast1-docker.pkg.dev/extended-acumen-480510-c3/ai-chat-repo/ai-chat:v1.0.1

# 2. 新しいイメージでデプロイ
gcloud run deploy ai-chat `
  --image asia-northeast1-docker.pkg.dev/extended-acumen-480510-c3/ai-chat-repo/ai-chat:v1.0.1 `
  --region asia-northeast1
```

### ロールバック

```bash
# リビジョン一覧を確認
gcloud run revisions list --service ai-chat --region asia-northeast1

# 特定のリビジョンにトラフィックを向ける
gcloud run services update-traffic ai-chat `
  --region asia-northeast1 `
  --to-revisions <REVISION_NAME>=100
```

## モニタリング

### Cloud Logging

```bash
# エラーログのみ表示
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" --limit 50

# 特定期間のログ
gcloud logging read "resource.type=cloud_run_revision" `
  --since="2025-12-07T00:00:00Z"
```

### Cloud Monitoring

1. [GCP Console](https://console.cloud.google.com/) にアクセス
2. Monitoring > Dashboards に移動
3. Cloud Run メトリクスを確認：
   - リクエスト数
   - レスポンスタイム
   - エラー率
   - メモリ使用量

## コスト見積もり

最小インスタンス数0の設定での月額概算：

- **Cloud Run**: 無料枠内 〜 $5
  - リクエスト数: 200万リクエスト/月まで無料
  - CPU時間: 180,000 vCPU秒/月まで無料
  - メモリ: 360,000 GiB秒/月まで無料
- **Cloud Build**: 無料枠（120分/日）内
- **Artifact Registry**: 無料枠（0.5GB）内
- **Secret Manager**: 無料枠（6アクセス/時間）内
- **MongoDB Atlas**: 無料（M0クラスター）

**合計**: 月額 $0〜$10程度（小規模利用の場合）

## セキュリティのベストプラクティス

1. ✅ Secret Manager でAPIキーを管理
2. ✅ 非rootユーザーでコンテナ実行
3. ✅ 最小権限の原則（サービスアカウント）
4. ✅ HTTPSの強制（Cloud Runデフォルト）
5. ✅ セキュリティヘッダーの設定（next.config.js）

## サポート

問題が発生した場合：
1. [トラブルシューティング](#トラブルシューティング)セクションを確認
2. [Cloud Run ドキュメント](https://cloud.google.com/run/docs)を参照
3. [GCP サポート](https://cloud.google.com/support)に問い合わせ

---

**作成日**: 2025-12-07
**対象プロジェクト**: extended-acumen-480510-c3
**最終更新**: 2025-12-07
