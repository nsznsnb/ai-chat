# AI Chat - GCP Cloud Run デプロイスクリプト
# 使用方法: .\deploy.ps1

# エラー時に停止
$ErrorActionPreference = "Stop"

# カラー出力用の関数
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# 設定
$PROJECT_ID = "extended-acumen-480510-c3"
$REGION = "asia-northeast1"
$SERVICE_NAME = "ai-chat"
$REPO_NAME = "ai-chat-repo"
$IMAGE_TAG = "latest"

# イメージパス
$IMAGE_PATH = "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:${IMAGE_TAG}"

Write-ColorOutput "`n========================================" "Cyan"
Write-ColorOutput "AI Chat - Cloud Run デプロイ" "Cyan"
Write-ColorOutput "========================================`n" "Cyan"

# ステップ1: 前提条件チェック
Write-ColorOutput "[1/5] 前提条件をチェック中..." "Yellow"

# gcloud コマンドの存在確認
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-ColorOutput "エラー: gcloud CLI がインストールされていません" "Red"
    Write-ColorOutput "https://cloud.google.com/sdk/docs/install からインストールしてください" "Red"
    exit 1
}

# 現在のプロジェクトを確認
$CURRENT_PROJECT = gcloud config get-value project 2>$null
if ($CURRENT_PROJECT -ne $PROJECT_ID) {
    Write-ColorOutput "プロジェクトを ${PROJECT_ID} に設定中..." "Yellow"
    gcloud config set project $PROJECT_ID
}

Write-ColorOutput "✓ 前提条件チェック完了`n" "Green"

# ステップ2: イメージビルド
Write-ColorOutput "[2/5] Docker イメージをビルド中..." "Yellow"
Write-ColorOutput "これには3〜5分かかります...`n" "Gray"

try {
    gcloud builds submit --tag $IMAGE_PATH
    if ($LASTEXITCODE -ne 0) {
        throw "ビルドが失敗しました"
    }
    Write-ColorOutput "`n✓ イメージビルド完了`n" "Green"
}
catch {
    Write-ColorOutput "エラー: イメージのビルドに失敗しました" "Red"
    Write-ColorOutput $_.Exception.Message "Red"
    exit 1
}

# ステップ3: Cloud Run にデプロイ
Write-ColorOutput "[3/5] Cloud Run にデプロイ中..." "Yellow"

try {
    gcloud run deploy $SERVICE_NAME `
        --image $IMAGE_PATH `
        --platform managed `
        --region $REGION `
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

    if ($LASTEXITCODE -ne 0) {
        throw "デプロイが失敗しました"
    }
    Write-ColorOutput "`n✓ デプロイ完了`n" "Green"
}
catch {
    Write-ColorOutput "エラー: デプロイに失敗しました" "Red"
    Write-ColorOutput $_.Exception.Message "Red"
    exit 1
}

# ステップ4: サービスURLを取得
Write-ColorOutput "[4/5] サービスURL を取得中..." "Yellow"

try {
    $SERVICE_URL = gcloud run services describe $SERVICE_NAME `
        --region $REGION `
        --format="value(status.url)"

    Write-ColorOutput "✓ サービスURL取得完了`n" "Green"
}
catch {
    Write-ColorOutput "警告: サービスURLの取得に失敗しました" "Yellow"
    $SERVICE_URL = "不明"
}

# ステップ5: ヘルスチェック
Write-ColorOutput "[5/5] ヘルスチェックを実行中..." "Yellow"

if ($SERVICE_URL -ne "不明") {
    Start-Sleep -Seconds 5  # サービスの起動を待つ

    try {
        $response = Invoke-WebRequest -Uri "${SERVICE_URL}/api/health" -UseBasicParsing
        $healthData = $response.Content | ConvertFrom-Json

        if ($healthData.status -eq "ok") {
            Write-ColorOutput "✓ ヘルスチェック成功`n" "Green"
        }
        else {
            Write-ColorOutput "警告: ヘルスチェックが異常な状態を返しました" "Yellow"
        }
    }
    catch {
        Write-ColorOutput "警告: ヘルスチェックに失敗しました（サービスの起動に時間がかかっている可能性があります）" "Yellow"
    }
}

# 完了メッセージ
Write-ColorOutput "`n========================================" "Cyan"
Write-ColorOutput "デプロイが完了しました！" "Green"
Write-ColorOutput "========================================`n" "Cyan"

Write-ColorOutput "サービスURL: $SERVICE_URL" "White"
Write-ColorOutput "ヘルスチェック: ${SERVICE_URL}/api/health" "White"
Write-ColorOutput "`nブラウザでアクセスして動作を確認してください。`n" "Gray"

# ログ確認方法の案内
Write-ColorOutput "ログを確認するには:" "Yellow"
Write-ColorOutput "  gcloud logging read `"resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME}`" --limit 50`n" "Gray"

Write-ColorOutput "リアルタイムログを確認するには:" "Yellow"
Write-ColorOutput "  gcloud logging tail `"resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME}`"`n" "Gray"
