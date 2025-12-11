# GitHub Actions セットアップガイド

このドキュメントでは、GitHub ActionsからGoogle Cloud Runへ自動デプロイするための設定手順を説明します。

## 前提条件

- Google Cloud Platform (GCP) プロジェクトが作成済み
- GitHub リポジトリが作成済み
- `gcloud` CLI がインストール済み

## 1. Workload Identity Federation の設定

GitHub ActionsからGCPにアクセスするため、Workload Identity Federationを設定します。

### 1.1 Workload Identity Pool の作成

```bash
# プロジェクトIDを設定
export PROJECT_ID="extended-acumen-480510-c3"
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# Workload Identity Pool を作成
gcloud iam workload-identity-pools create "github-pool" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool"
```

### 1.2 Workload Identity Provider の作成

```bash
# GitHub リポジトリの情報を設定
export GITHUB_REPO="YOUR_GITHUB_USERNAME/YOUR_REPO_NAME"  # 例: "octocat/ai-chat"

# Provider を作成
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner=='YOUR_GITHUB_USERNAME'" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

### 1.3 サービスアカウントの作成

```bash
# サービスアカウントを作成
gcloud iam service-accounts create github-actions \
  --project="${PROJECT_ID}" \
  --display-name="GitHub Actions Service Account"

# サービスアカウントのメールアドレスを取得
export SERVICE_ACCOUNT="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"
```

### 1.4 IAM ポリシーの設定

```bash
# Cloud Run Admin 権限を付与
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/run.admin"

# Cloud Build Editor 権限を付与
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudbuild.builds.editor"

# Artifact Registry Writer 権限を付与
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/artifactregistry.writer"

# Service Account User 権限を付与
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/iam.serviceAccountUser"

# Secret Manager Secret Accessor 権限を付与
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

# Storage Admin 権限を付与（Cloud Build用）
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.admin"
```

### 1.5 Workload Identity の紐付け

```bash
# Workload Identity Pool のメンバーとしてサービスアカウントを追加
gcloud iam service-accounts add-iam-policy-binding "${SERVICE_ACCOUNT}" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/${GITHUB_REPO}"
```

### 1.6 Workload Identity Provider の完全な名前を取得

```bash
# 以下のコマンドで取得した値をGitHub Secretsに設定
gcloud iam workload-identity-pools providers describe "github-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)"
```

## 2. GitHub Secrets の設定

GitHubリポジトリの Settings > Secrets and variables > Actions で以下のSecretsを追加します。

### 必須のSecrets

| Secret名 | 値 | 説明 |
|---------|-----|------|
| `WIF_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider` | 上記コマンドで取得した値 |
| `WIF_SERVICE_ACCOUNT` | `github-actions@extended-acumen-480510-c3.iam.gserviceaccount.com` | 作成したサービスアカウントのメール |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | Claude APIキー（CI用） |

### オプションのSecrets

| Secret名 | 値 | 説明 |
|---------|-----|------|
| `CODECOV_TOKEN` | Codecovトークン | テストカバレッジをCodecovにアップロードする場合 |

## 3. ワンライナーセットアップスクリプト

以下のスクリプトをコピーして実行すると、一括でセットアップできます。

```bash
#!/bin/bash

# 変数設定（各自の環境に合わせて変更）
export PROJECT_ID="extended-acumen-480510-c3"
export GITHUB_REPO="YOUR_GITHUB_USERNAME/YOUR_REPO_NAME"  # 例: "octocat/ai-chat"
export GITHUB_USERNAME="YOUR_GITHUB_USERNAME"  # 例: "octocat"

# プロジェクト番号を取得
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

echo "====================================="
echo "GitHub Actions Workload Identity Setup"
echo "====================================="
echo "Project ID: $PROJECT_ID"
echo "Project Number: $PROJECT_NUMBER"
echo "GitHub Repo: $GITHUB_REPO"
echo "====================================="

# Workload Identity Pool 作成
echo "Creating Workload Identity Pool..."
gcloud iam workload-identity-pools create "github-pool" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool" || echo "Pool already exists"

# Provider 作成
echo "Creating Workload Identity Provider..."
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner=='${GITHUB_USERNAME}'" \
  --issuer-uri="https://token.actions.githubusercontent.com" || echo "Provider already exists"

# サービスアカウント作成
echo "Creating Service Account..."
gcloud iam service-accounts create github-actions \
  --project="${PROJECT_ID}" \
  --display-name="GitHub Actions Service Account" || echo "Service Account already exists"

export SERVICE_ACCOUNT="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

# IAM ポリシー設定
echo "Setting IAM policies..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/run.admin" --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudbuild.builds.editor" --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/artifactregistry.writer" --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/iam.serviceAccountUser" --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.admin" --quiet

# Workload Identity 紐付け
echo "Binding Workload Identity..."
gcloud iam service-accounts add-iam-policy-binding "${SERVICE_ACCOUNT}" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/${GITHUB_REPO}"

# 結果表示
echo ""
echo "====================================="
echo "Setup Complete!"
echo "====================================="
echo ""
echo "Please add the following secrets to your GitHub repository:"
echo ""
echo "WIF_PROVIDER:"
gcloud iam workload-identity-pools providers describe "github-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)"
echo ""
echo "WIF_SERVICE_ACCOUNT:"
echo "${SERVICE_ACCOUNT}"
echo ""
echo "====================================="
```

## 4. 動作確認

### 4.1 手動実行でテスト

GitHubリポジトリの Actions タブで、`Deploy to Cloud Run` ワークフローを選択し、`Run workflow` ボタンをクリックします。

### 4.2 自動デプロイのテスト

`main` ブランチに変更をプッシュすると、自動的にデプロイが実行されます。

```bash
git add .
git commit -m "feat: add GitHub Actions workflow"
git push origin main
```

## 5. トラブルシューティング

### エラー: "failed to get credentials"

- `WIF_PROVIDER` と `WIF_SERVICE_ACCOUNT` が正しく設定されているか確認
- サービスアカウントに必要な権限が付与されているか確認

### エラー: "permission denied"

- IAMポリシーが正しく設定されているか確認
- サービスアカウントに必要なロールが付与されているか確認

### ビルドは成功するがデプロイが失敗

- Cloud Run APIが有効になっているか確認
- Secret Managerに `anthropic-api-key` が登録されているか確認

## 6. 参考リンク

- [Google Cloud Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [GitHub Actions - Google Cloud Auth](https://github.com/google-github-actions/auth)
- [GitHub Actions - Setup gcloud](https://github.com/google-github-actions/setup-gcloud)
