#!/bin/bash

# AI Chat - GCP Cloud Run デプロイスクリプト
# 使用方法: ./deploy.sh

set -e  # エラー時に停止

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# 設定
PROJECT_ID="extended-acumen-480510-c3"
REGION="asia-northeast1"
SERVICE_NAME="ai-chat"
REPO_NAME="ai-chat-repo"
IMAGE_TAG="latest"

# イメージパス
IMAGE_PATH="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:${IMAGE_TAG}"

echo -e "${CYAN}"
echo "========================================"
echo "AI Chat - Cloud Run デプロイ"
echo "========================================"
echo -e "${NC}"

# ステップ1: 前提条件チェック
echo -e "${YELLOW}[1/5] 前提条件をチェック中...${NC}"

if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}エラー: gcloud CLI がインストールされていません${NC}"
    echo -e "${RED}https://cloud.google.com/sdk/docs/install からインストールしてください${NC}"
    exit 1
fi

# 現在のプロジェクトを確認
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo -e "${YELLOW}プロジェクトを ${PROJECT_ID} に設定中...${NC}"
    gcloud config set project $PROJECT_ID
fi

echo -e "${GREEN}✓ 前提条件チェック完了${NC}\n"

# ステップ2: イメージビルド
echo -e "${YELLOW}[2/5] Docker イメージをビルド中...${NC}"
echo -e "${GRAY}これには3〜5分かかります...${NC}\n"

if ! gcloud builds submit --tag $IMAGE_PATH; then
    echo -e "${RED}エラー: イメージのビルドに失敗しました${NC}"
    exit 1
fi

echo -e "\n${GREEN}✓ イメージビルド完了${NC}\n"

# ステップ3: Cloud Run にデプロイ
echo -e "${YELLOW}[3/5] Cloud Run にデプロイ中...${NC}"

if ! gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_PATH \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars NODE_ENV=production,NEXT_PUBLIC_APP_NAME="AI Chat" \
    --update-secrets ANTHROPIC_API_KEY=anthropic-api-key:latest \
    --min-instances 0 \
    --max-instances 10 \
    --memory 512Mi \
    --cpu 1 \
    --timeout 60 \
    --concurrency 80 \
    --port 3000; then
    echo -e "${RED}エラー: デプロイに失敗しました${NC}"
    exit 1
fi

echo -e "\n${GREEN}✓ デプロイ完了${NC}\n"

# ステップ4: サービスURLを取得
echo -e "${YELLOW}[4/5] サービスURL を取得中...${NC}"

SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --region $REGION \
    --format="value(status.url)" 2>/dev/null || echo "不明")

echo -e "${GREEN}✓ サービスURL取得完了${NC}\n"

# ステップ5: ヘルスチェック
echo -e "${YELLOW}[5/5] ヘルスチェックを実行中...${NC}"

if [ "$SERVICE_URL" != "不明" ]; then
    sleep 5  # サービスの起動を待つ

    if curl -s "${SERVICE_URL}/api/health" | grep -q '"status":"ok"'; then
        echo -e "${GREEN}✓ ヘルスチェック成功${NC}\n"
    else
        echo -e "${YELLOW}警告: ヘルスチェックが異常な状態を返しました${NC}"
    fi
else
    echo -e "${YELLOW}警告: ヘルスチェックをスキップしました${NC}"
fi

# 完了メッセージ
echo -e "${CYAN}"
echo "========================================"
echo "デプロイが完了しました！"
echo "========================================"
echo -e "${NC}"

echo -e "サービスURL: ${SERVICE_URL}"
echo -e "ヘルスチェック: ${SERVICE_URL}/api/health"
echo -e "\n${GRAY}ブラウザでアクセスして動作を確認してください。${NC}\n"

# ログ確認方法の案内
echo -e "${YELLOW}ログを確認するには:${NC}"
echo -e "${GRAY}  gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME}\" --limit 50${NC}\n"

echo -e "${YELLOW}リアルタイムログを確認するには:${NC}"
echo -e "${GRAY}  gcloud logging tail \"resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME}\"${NC}\n"
