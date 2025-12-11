# GCP Cloud Run デプロイ - クイックスタートガイド

このガイドでは、AI ChatアプリケーションをGCP Cloud Runにデプロイするための完全な手順を説明します。

## 📋 前提条件チェックリスト

- [ ] Google アカウント（GCP利用）
- [ ] Claude API キー（[Anthropic Console](https://console.anthropic.com/)から取得）
- [ ] クレジットカード（GCP無料枠利用でも必要）
- [ ] Windows PowerShell または コマンドプロンプト

## ステップ1: Google Cloud SDK のインストール

### 1.1 インストーラーのダウンロード

1. [Google Cloud SDK Installer](https://cloud.google.com/sdk/docs/install) にアクセス
2. **Windows用インストーラー**をダウンロード
   - 64ビット: `GoogleCloudSDKInstaller.exe`

### 1.2 インストール手順

1. ダウンロードした `GoogleCloudSDKInstaller.exe` を実行
2. インストールウィザードに従って進める：
   - インストール先: デフォルトでOK（通常 `C:\Program Files (x86)\Google\Cloud SDK\`）
   - コンポーネント: すべて選択（推奨）
   - ショートカット作成: チェック
3. インストール完了後、**PowerShellを再起動**

### 1.3 インストール確認

PowerShellで以下を実行：

```powershell
gcloud --version
```

以下のような出力が表示されればOK：
```
Google Cloud SDK 456.0.0
bq 2.0.98
core 2023.12.01
gcloud-crc32c 1.0.0
gsutil 5.27
```

## ステップ2: GCP プロジェクトの設定

### 2.1 認証

```powershell
gcloud auth login
```

ブラウザが開くので、Googleアカウントでログインして認証を許可します。

### 2.2 プロジェクトの設定

```powershell
gcloud config set project extended-acumen-480510-c3
```

### 2.3 必要なAPIの有効化

```powershell
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

## ステップ3: 環境変数の準備

### 3.1 Claude API キーの確認

1. [Anthropic Console](https://console.anthropic.com/) にアクセス
2. API Keys セクションで APIキーを作成またはコピー
3. キーは `sk-ant-api03-` で始まる形式

### 3.2 Secret Manager にシークレットを保存

**重要**: 以下のコマンドで `your-actual-api-key` を実際のAPIキーに置き換えてください。

```powershell
# Claude API キーを保存
echo -n "sk-ant-api03-your-actual-api-key" | gcloud secrets create anthropic-api-key --data-file=-
```

**成功例**:
```
Created secret [anthropic-api-key].
```

**既に存在する場合**（エラーが出た場合）:
```powershell
# 既存のシークレットを削除
gcloud secrets delete anthropic-api-key --quiet

# 再度作成
echo -n "sk-ant-api03-your-actual-api-key" | gcloud secrets create anthropic-api-key --data-file=-
```

### 3.3 シークレットの確認

```powershell
gcloud secrets list
```

`anthropic-api-key` が表示されればOK。

## ステップ4: サービスアカウントに権限を付与

```powershell
# プロジェクト番号を取得
$PROJECT_NUMBER = gcloud projects describe extended-acumen-480510-c3 --format="value(projectNumber)"

# サービスアカウント名を構築
$SERVICE_ACCOUNT = "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Secret Accessor ロールを付与
gcloud secrets add-iam-policy-binding anthropic-api-key `
  --member="serviceAccount:$SERVICE_ACCOUNT" `
  --role="roles/secretmanager.secretAccessor"
```

## ステップ5: Artifact Registry リポジトリの作成

```powershell
# Docker リポジトリを作成
gcloud artifacts repositories create ai-chat-repo `
  --repository-format=docker `
  --location=asia-northeast1 `
  --description="AI Chat application repository"
```

**成功例**:
```
Created repository [ai-chat-repo].
```

**既に存在する場合**: エラーが出てもOK（スキップ）

### 5.1 Docker 認証設定

```powershell
gcloud auth configure-docker asia-northeast1-docker.pkg.dev
```

## ステップ6: Dockerイメージのビルド

**注意**: このステップには3〜5分かかります。

```powershell
# プロジェクトのルートディレクトリに移動
cd c:\Users\ninis\Desktop\claude-practice\ai-chat

# Cloud Build でイメージをビルド＆プッシュ
gcloud builds submit --tag asia-northeast1-docker.pkg.dev/extended-acumen-480510-c3/ai-chat-repo/ai-chat:latest
```

**ビルド中の出力例**:
```
Creating temporary tarball archive of 52 file(s) totalling 1.2 MiB before compression.
Uploading tarball of [.] to [gs://...]
...
BUILD SUCCESS
```

## ステップ7: Cloud Run へのデプロイ

```powershell
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

**デプロイ完了時の出力**:
```
Service [ai-chat] revision [ai-chat-00001-xxx] has been deployed and is serving 100 percent of traffic.
Service URL: https://ai-chat-xxxxxxxxxx-an.a.run.app
```

## ステップ8: デプロイの確認

### 8.1 サービスURLの取得

```powershell
gcloud run services describe ai-chat --region asia-northeast1 --format="value(status.url)"
```

### 8.2 ヘルスチェック

```powershell
# サービスURLを変数に保存
$SERVICE_URL = gcloud run services describe ai-chat --region asia-northeast1 --format="value(status.url)"

# ヘルスチェックAPI呼び出し
Invoke-WebRequest -Uri "${SERVICE_URL}/api/health" -UseBasicParsing
```

**成功時のレスポンス**:
```json
{
  "status": "ok",
  "timestamp": "2025-12-07T...",
  "uptime": 1.234,
  "environment": "production",
  "version": "1.0.0"
}
```

### 8.3 ブラウザで動作確認

1. 上記のサービスURLをブラウザで開く
2. チャットインターフェースが表示される
3. メッセージを送信してAIからの応答を確認

## 🎉 デプロイ完了！

アプリケーションが正常にデプロイされました。

### 次のステップ

- **ログの確認**: Cloud Consoleでログを確認
- **モニタリング**: メトリクスを確認
- **カスタムドメイン**: 独自ドメインの設定（オプション）

## 📊 モニタリングとログ

### リアルタイムログの確認

```powershell
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=ai-chat"
```

### エラーログのみ表示

```powershell
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ai-chat AND severity>=ERROR" --limit 50
```

### Cloud Console でのモニタリング

1. [GCP Console](https://console.cloud.google.com/) にアクセス
2. Cloud Run > ai-chat を選択
3. 「メトリクス」タブでパフォーマンスを確認

## 🔄 アプリケーションの更新

コードを変更した後、再デプロイする方法：

### 方法1: 自動スクリプト（推奨）

```powershell
.\deploy.ps1
```

### 方法2: 手動デプロイ

```powershell
# 1. 新しいイメージをビルド
gcloud builds submit --tag asia-northeast1-docker.pkg.dev/extended-acumen-480510-c3/ai-chat-repo/ai-chat:latest

# 2. 再デプロイ（設定は自動的に保持される）
gcloud run deploy ai-chat --region asia-northeast1
```

## 🛑 サービスの停止・削除

### サービスの一時停止（トラフィック0に設定）

```powershell
gcloud run services update ai-chat --region asia-northeast1 --min-instances 0 --max-instances 0
```

### サービスの完全削除

```powershell
gcloud run services delete ai-chat --region asia-northeast1
```

## 💰 コスト管理

### コスト見積もり

- **最小インスタンス数0**: アイドル時は課金なし
- **無料枠**: 月間200万リクエストまで無料
- **予想コスト**: 月額 $0〜$10（小規模利用の場合）

### コスト確認

1. [GCP Console](https://console.cloud.google.com/)
2. 「お支払い」> 「レポート」で確認

## ❓ トラブルシューティング

### エラー: `gcloud: command not found`

**解決策**: PowerShellを再起動してください。

### エラー: `API has not been enabled`

**解決策**: ステップ2.3のAPI有効化コマンドを再実行してください。

### エラー: `Permission denied`

**解決策**: サービスアカウントの権限を確認してください（ステップ4）。

### エラー: ビルドが失敗する

**解決策**:
```powershell
# ローカルでDockerビルドを確認
docker build -t test .

# エラーが出る場合は、依存関係を再インストール
npm install
npm run build
```

### デプロイ後にアプリが起動しない

**解決策**: ログを確認
```powershell
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=ai-chat"
```

## 📞 サポート

問題が発生した場合:

1. [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) の詳細ガイドを参照
2. [README.md](README.md) のトラブルシューティングセクションを確認
3. [GCP サポート](https://cloud.google.com/support) に問い合わせ

## 📚 関連リンク

- [Cloud Run ドキュメント](https://cloud.google.com/run/docs)
- [Cloud Build ドキュメント](https://cloud.google.com/build/docs)
- [Secret Manager ドキュメント](https://cloud.google.com/secret-manager/docs)
- [Anthropic API ドキュメント](https://docs.anthropic.com/)

---

**作成日**: 2025-12-07
**対象プロジェクト**: extended-acumen-480510-c3
**最小インスタンス数**: 0（コスト最適化）
