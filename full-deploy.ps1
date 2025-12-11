# AI Chat - Full Deployment Script for Google Cloud Run
# Usage: .\full-deploy.ps1 -ApiKey "sk-ant-api03-your-key"

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey,

    [Parameter(Mandatory=$false)]
    [string]$ProjectId = "extended-acumen-480510-c3",

    [Parameter(Mandatory=$false)]
    [string]$Region = "asia-northeast1"
)

# Continue on error (gcloud outputs warnings to stderr)
$ErrorActionPreference = "Continue"

# Color output functions
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Step {
    param([string]$Message)
    Write-Host "`n" -NoNewline
    Write-ColorOutput "========================================" "Cyan"
    Write-ColorOutput $Message "Cyan"
    Write-ColorOutput "========================================" "Cyan"
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "[OK] $Message" "Green"
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput ">>> $Message" "Yellow"
}

function Write-Error-Custom {
    param([string]$Message)
    Write-ColorOutput "[ERROR] $Message" "Red"
}

# Main process
Write-Step "AI Chat - Google Cloud Run Deployment"

# Display configuration
Write-Info "Project ID: $ProjectId"
Write-Info "Region: $Region"
Write-Info "API Key: $(if($ApiKey.Length -gt 20) { $ApiKey.Substring(0,20) + '...' } else { 'Set' })"

# Step 1: Check gcloud CLI
Write-Step "[1/8] Checking gcloud CLI"

if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error-Custom "gcloud CLI not found"
    Write-Host ""
    Write-Info "Please install Google Cloud SDK from:"
    Write-Host "https://cloud.google.com/sdk/docs/install" -ForegroundColor White
    Write-Host ""
    Write-Info "After installation, restart PowerShell and run this script again."
    exit 1
}

Write-Success "gcloud CLI found"
$gcloudVersion = (gcloud version --format="value(version)" 2>&1 | Out-String).Trim()
if ($gcloudVersion) {
    Write-Info "Version: $gcloudVersion"
}

# Step 2: Check authentication
Write-Step "[2/8] Checking GCP authentication"

# Try to get current config account
$accountOutput = gcloud config get-value account 2>&1
$currentAccount = ($accountOutput | Where-Object { $_ -notmatch "unset" -and $_ -notmatch "^\s*$" } | Select-Object -First 1)

if ([string]::IsNullOrWhiteSpace($currentAccount) -or $currentAccount -match "^\(unset\)") {
    Write-Info "GCP authentication required"
    Write-Info "Browser will open for Google account login..."
    gcloud auth login
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Authentication failed"
        exit 1
    }
    $accountOutput = gcloud config get-value account 2>&1
    $currentAccount = ($accountOutput | Where-Object { $_ -notmatch "unset" -and $_ -notmatch "^\s*$" } | Select-Object -First 1)
}

if ($currentAccount) {
    Write-Success "Authenticated account: $currentAccount"
} else {
    Write-Success "Authenticated (account retrieved after login)"
}

# Step 3: Configure project and enable APIs
Write-Step "[3/8] Configuring GCP project and enabling APIs"

Write-Info "Setting project: $ProjectId"
$projectOutput = gcloud config set project $ProjectId 2>&1
Write-Success "Project configured"

Write-Info "Enabling required APIs..."
$apis = @(
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com"
)

foreach ($api in $apis) {
    Write-Info "  - Enabling $api"
    $apiOutput = gcloud services enable $api --quiet 2>&1
}
Write-Success "APIs enabled"

# Step 4: Save secret to Secret Manager
Write-Step "[4/8] Saving API key to Secret Manager"

# Check if secret already exists
$existingSecret = gcloud secrets describe anthropic-api-key 2>$null

if ($existingSecret) {
    Write-Info "Deleting existing secret 'anthropic-api-key'..."
    $deleteOutput = gcloud secrets delete anthropic-api-key --quiet 2>&1
}

Write-Info "Creating new secret..."
$secretOutput = echo $ApiKey | gcloud secrets create anthropic-api-key --data-file=- 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Failed to create secret"
    Write-Host $secretOutput
    exit 1
}
Write-Success "Secret created"

# Step 5: Grant permissions to service account
Write-Step "[5/8] Granting permissions to service account"

$projectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
$serviceAccount = "${projectNumber}-compute@developer.gserviceaccount.com"

Write-Info "Service account: $serviceAccount"
Write-Info "Granting Secret Accessor role..."

$permissionOutput = gcloud secrets add-iam-policy-binding anthropic-api-key `
    --member="serviceAccount:$serviceAccount" `
    --role="roles/secretmanager.secretAccessor" `
    --quiet 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Failed to grant permissions"
    Write-Host $permissionOutput
    exit 1
}
Write-Success "Permissions granted"

# Step 6: Create Artifact Registry repository
Write-Step "[6/8] Creating Artifact Registry repository"

$existingRepo = gcloud artifacts repositories describe ai-chat-repo --location=$Region 2>$null

if (!$existingRepo) {
    Write-Info "Creating repository..."
    $repoOutput = gcloud artifacts repositories create ai-chat-repo `
        --repository-format=docker `
        --location=$Region `
        --description="AI Chat application repository" 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Failed to create repository"
        Write-Host $repoOutput
        exit 1
    }
    Write-Success "Repository created"
} else {
    Write-Success "Repository already exists"
}

Write-Info "Configuring Docker authentication..."
$dockerAuthOutput = gcloud auth configure-docker "${Region}-docker.pkg.dev" --quiet 2>&1
Write-Success "Docker authentication configured"

# Step 7: Build Docker image
Write-Step "[7/8] Building and pushing Docker image"

$imageTag = "${Region}-docker.pkg.dev/${ProjectId}/ai-chat-repo/ai-chat:latest"

Write-Info "Image tag: $imageTag"
Write-Info "Starting build (this will take 3-5 minutes)..."
Write-Host ""

gcloud builds submit --tag $imageTag

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Image build failed"
    exit 1
}
Write-Success "Image build complete"

# Step 8: Deploy to Cloud Run
Write-Step "[8/8] Deploying to Cloud Run"

Write-Info "Starting deployment..."
Write-Host ""

gcloud run deploy ai-chat `
    --image $imageTag `
    --platform managed `
    --region $Region `
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
    Write-Error-Custom "Deployment failed"
    exit 1
}

Write-Success "Deployment complete"

# Deployment complete - Get service URL
Write-Step "Deployment Successful!"

$serviceUrl = gcloud run services describe ai-chat --region $Region --format="value(status.url)"

Write-Host ""
Write-ColorOutput "Service URL: $serviceUrl" "Green"
Write-Host ""

# Health check
Write-Info "Running health check..."
Start-Sleep -Seconds 5

try {
    $response = Invoke-WebRequest -Uri "${serviceUrl}/api/health" -UseBasicParsing -TimeoutSec 10
    $healthData = $response.Content | ConvertFrom-Json

    if ($healthData.status -eq "ok") {
        Write-Success "Health check passed"
        Write-Info "  Status: $($healthData.status)"
        Write-Info "  Environment: $($healthData.environment)"
        Write-Info "  Version: $($healthData.version)"
    } else {
        Write-ColorOutput "Warning: Health check returned abnormal status" "Yellow"
    }
} catch {
    Write-ColorOutput "Warning: Health check failed (service may still be starting)" "Yellow"
}

# Completion message
Write-Host ""
Write-ColorOutput "========================================" "Cyan"
Write-ColorOutput "DEPLOYMENT COMPLETE!" "Green"
Write-ColorOutput "========================================" "Cyan"
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Access the URL in your browser:" -ForegroundColor White
Write-Host "     $serviceUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Test the chat functionality" -ForegroundColor White
Write-Host ""
Write-Host "  3. View logs:" -ForegroundColor White
Write-Host "     gcloud logging tail `"resource.type=cloud_run_revision AND resource.labels.service_name=ai-chat`"" -ForegroundColor Gray
Write-Host ""

Write-ColorOutput "Deployment finished successfully!" "Green"
