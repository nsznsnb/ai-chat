#!/bin/bash

# GitHub Actions Workload Identity Federation セットアップスクリプト
#
# 使用方法:
#   ./setup-github-actions.sh YOUR_GITHUB_USERNAME YOUR_REPO_NAME
#
# 例:
#   ./setup-github-actions.sh octocat ai-chat

set -e

# 引数チェック
if [ $# -ne 2 ]; then
  echo "使用方法: $0 <GITHUB_USERNAME> <REPO_NAME>"
  echo "例: $0 octocat ai-chat"
  exit 1
fi

# 変数設定
export PROJECT_ID="extended-acumen-480510-c3"
export GITHUB_USERNAME="$1"
export REPO_NAME="$2"
export GITHUB_REPO="${GITHUB_USERNAME}/${REPO_NAME}"

# プロジェクト番号を取得
echo "プロジェクト情報を取得しています..."
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

echo ""
echo "====================================="
echo "GitHub Actions Workload Identity Setup"
echo "====================================="
echo "Project ID: $PROJECT_ID"
echo "Project Number: $PROJECT_NUMBER"
echo "GitHub Repo: $GITHUB_REPO"
echo "====================================="
echo ""

# 確認プロンプト
read -p "上記の設定で続行しますか？ (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "セットアップを中止しました。"
  exit 1
fi

# 必要なAPIを有効化
echo ""
echo "[1/7] 必要なAPIを有効化しています..."
gcloud services enable iamcredentials.googleapis.com --project=$PROJECT_ID
gcloud services enable cloudresourcemanager.googleapis.com --project=$PROJECT_ID
gcloud services enable iam.googleapis.com --project=$PROJECT_ID

# Workload Identity Pool 作成
echo ""
echo "[2/7] Workload Identity Pool を作成しています..."
gcloud iam workload-identity-pools create "github-pool" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool" 2>/dev/null || echo "  ℹ Pool は既に存在します"

# Provider 作成
echo ""
echo "[3/7] Workload Identity Provider を作成しています..."
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner=='${GITHUB_USERNAME}'" \
  --issuer-uri="https://token.actions.githubusercontent.com" 2>/dev/null || echo "  ℹ Provider は既に存在します"

# サービスアカウント作成
echo ""
echo "[4/7] サービスアカウントを作成しています..."
gcloud iam service-accounts create github-actions \
  --project="${PROJECT_ID}" \
  --display-name="GitHub Actions Service Account" 2>/dev/null || echo "  ℹ Service Account は既に存在します"

export SERVICE_ACCOUNT="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

# IAM ポリシー設定
echo ""
echo "[5/7] IAMポリシーを設定しています..."
echo "  - Cloud Run Admin"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/run.admin" --quiet

echo "  - Cloud Build Editor"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudbuild.builds.editor" --quiet

echo "  - Artifact Registry Writer"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/artifactregistry.writer" --quiet

echo "  - Service Account User"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/iam.serviceAccountUser" --quiet

echo "  - Secret Manager Secret Accessor"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" --quiet

echo "  - Storage Admin"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.admin" --quiet

# Workload Identity 紐付け
echo ""
echo "[6/7] Workload Identity を紐付けています..."
gcloud iam service-accounts add-iam-policy-binding "${SERVICE_ACCOUNT}" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/${GITHUB_REPO}" --quiet

# Workload Identity Provider の完全な名前を取得
echo ""
echo "[7/7] 設定情報を取得しています..."
WIF_PROVIDER=$(gcloud iam workload-identity-pools providers describe "github-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)")

# 結果表示
echo ""
echo "====================================="
echo "✓ セットアップが完了しました！"
echo "====================================="
echo ""
echo "次のステップ:"
echo "1. GitHubリポジトリの Settings > Secrets and variables > Actions に移動"
echo "2. 以下のSecretsを追加してください:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Secret名: WIF_PROVIDER"
echo "値:"
echo "$WIF_PROVIDER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Secret名: WIF_SERVICE_ACCOUNT"
echo "値:"
echo "$SERVICE_ACCOUNT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Secret名: ANTHROPIC_API_KEY"
echo "値: sk-ant-api03-... (あなたのClaude APIキー)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "3. mainブランチにコミットをプッシュして自動デプロイをテスト"
echo ""
echo "詳細なドキュメント: .github/SETUP.md"
echo "====================================="
