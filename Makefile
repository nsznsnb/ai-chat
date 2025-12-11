# AI Chat - Makefile
# 使用方法: make <target>

.PHONY: help init dev build test lint clean docker-up docker-down deploy deploy-manual deploy-full check-env gcp-setup

# デフォルトターゲット
help:
	@echo "AI Chat - 利用可能なコマンド:"
	@echo ""
	@echo "  make init          - プロジェクトの初期化（依存関係インストール、Prisma生成）"
	@echo "  make dev           - 開発サーバーを起動"
	@echo "  make build         - 本番用ビルド"
	@echo "  make test          - テスト実行"
	@echo "  make test-watch    - ウォッチモードでテスト実行"
	@echo "  make test-coverage - カバレッジ付きテスト実行"
	@echo "  make lint          - ESLintでコード品質チェック"
	@echo "  make clean         - ビルド成果物を削除"
	@echo ""
	@echo "  make docker-up     - Dockerコンテナを起動"
	@echo "  make docker-down   - Dockerコンテナを停止"
	@echo "  make docker-build  - Dockerイメージをビルド"
	@echo ""
	@echo "GCP Cloud Run デプロイコマンド:"
	@echo "  make gcp-setup     - GCP環境の初期セットアップ（初回のみ）"
	@echo "  make deploy        - GCP Cloud Runに再デプロイ（既存の設定を使用）"
	@echo "  make deploy-full   - フルデプロイ（Secret Manager含む全設定）"
	@echo "  make deploy-manual - GCP Cloud Runにデプロイ（手動コマンド）"
	@echo ""
	@echo "その他:"
	@echo "  make check-env     - 環境変数の設定を確認"
	@echo ""
	@echo "環境変数:"
	@echo "  API_KEY            - Claude APIキー（deploy-fullで使用）"
	@echo "  例: make deploy-full API_KEY=sk-ant-api03-..."
	@echo ""

# プロジェクト初期化
init:
	@echo "プロジェクトを初期化しています..."
	@if not exist .env.local ( \
		echo .env.local が存在しません。.env.example をコピーして設定してください。 && \
		copy .env.example .env.local \
	)
	npm install
	npx prisma generate
	@echo "初期化完了！ .env.local を編集してAPIキーを設定してください。"

# 開発サーバー起動
dev:
	@echo "開発サーバーを起動しています..."
	npm run dev

# 本番ビルド
build:
	@echo "本番用ビルドを実行しています..."
	npm run build

# テスト実行
test:
	@echo "テストを実行しています..."
	npm test

# ウォッチモードでテスト
test-watch:
	@echo "ウォッチモードでテストを実行しています..."
	npm test -- --watch

# カバレッジ付きテスト
test-coverage:
	@echo "カバレッジ付きテストを実行しています..."
	npm test -- --coverage

# ESLint実行
lint:
	@echo "ESLintを実行しています..."
	npm run lint

# 型チェック
typecheck:
	@echo "TypeScriptの型チェックを実行しています..."
	npx tsc --noEmit

# クリーンアップ
clean:
	@echo "ビルド成果物を削除しています..."
	@if exist .next rmdir /s /q .next
	@if exist node_modules\.cache rmdir /s /q node_modules\.cache
	@echo "クリーンアップ完了"

# Docker関連コマンド
docker-build:
	@echo "Dockerイメージをビルドしています..."
	docker build -t ai-chat:latest .

docker-up:
	@echo "Dockerコンテナを起動しています..."
	docker-compose up -d
	@echo "アプリケーション: http://localhost:3000"
	@echo "MongoDB: localhost:27017"

docker-down:
	@echo "Dockerコンテナを停止しています..."
	docker-compose down

docker-logs:
	@echo "Dockerコンテナのログを表示しています..."
	docker-compose logs -f

# GCP環境の初期セットアップ（初回のみ）
gcp-setup:
	@echo "=========================================="
	@echo "GCP環境の初期セットアップ"
	@echo "=========================================="
	@echo ""
	@echo "必要なAPIを有効化しています..."
	gcloud services enable run.googleapis.com
	gcloud services enable cloudbuild.googleapis.com
	gcloud services enable secretmanager.googleapis.com
	gcloud services enable artifactregistry.googleapis.com
	@echo ""
	@echo "Artifact Registryリポジトリを作成しています..."
	gcloud artifacts repositories create ai-chat-repo \
		--repository-format=docker \
		--location=asia-northeast1 \
		--description="AI Chat application repository" || echo "リポジトリは既に存在します"
	@echo ""
	@echo "Docker認証を設定しています..."
	gcloud auth configure-docker asia-northeast1-docker.pkg.dev --quiet
	@echo ""
	@echo "✓ GCP環境のセットアップが完了しました！"
	@echo ""
	@echo "次のステップ:"
	@echo "  1. API_KEY環境変数を設定してフルデプロイを実行:"
	@echo "     make deploy-full API_KEY=sk-ant-api03-..."
	@echo ""

# フルデプロイ（Secret Manager + ビルド + デプロイ）
deploy-full:
ifndef API_KEY
	@echo "エラー: API_KEY環境変数が設定されていません"
	@echo ""
	@echo "使用方法:"
	@echo "  make deploy-full API_KEY=sk-ant-api03-..."
	@echo ""
	@exit 1
endif
	@echo "=========================================="
	@echo "フルデプロイを開始します"
	@echo "=========================================="
	@echo ""
	@echo "[1/5] プロジェクト設定..."
	gcloud config set project extended-acumen-480510-c3
	@echo ""
	@echo "[2/5] Secret Managerにシークレットを保存..."
	@echo "既存のシークレットを削除しています（存在する場合）..."
	-gcloud secrets delete anthropic-api-key --quiet 2>NUL
	@echo "新しいシークレットを作成しています..."
	@echo $(API_KEY) | gcloud secrets create anthropic-api-key --data-file=-
	@echo ""
	@echo "[3/5] サービスアカウントに権限を付与..."
	@powershell -Command "$$projectNumber = gcloud projects describe extended-acumen-480510-c3 --format='value(projectNumber)'; $$serviceAccount = \"$$projectNumber-compute@developer.gserviceaccount.com\"; gcloud secrets add-iam-policy-binding anthropic-api-key --member=\"serviceAccount:$$serviceAccount\" --role=\"roles/secretmanager.secretAccessor\" --quiet"
	@echo ""
	@echo "[4/5] Dockerイメージをビルド・プッシュ..."
	gcloud builds submit --tag asia-northeast1-docker.pkg.dev/extended-acumen-480510-c3/ai-chat-repo/ai-chat:latest
	@echo ""
	@echo "[5/5] Cloud Runにデプロイ..."
	gcloud run deploy ai-chat \
		--image asia-northeast1-docker.pkg.dev/extended-acumen-480510-c3/ai-chat-repo/ai-chat:latest \
		--platform managed \
		--region asia-northeast1 \
		--allow-unauthenticated \
		--set-env-vars NODE_ENV=production,NEXT_PUBLIC_APP_NAME="AI Chat" \
		--update-secrets ANTHROPIC_API_KEY=anthropic-api-key:latest \
		--min-instances 0 \
		--max-instances 10 \
		--memory 512Mi \
		--cpu 1 \
		--timeout 60 \
		--concurrency 80 \
		--port 3000
	@echo ""
	@echo "=========================================="
	@echo "✓ デプロイが完了しました！"
	@echo "=========================================="
	@echo ""
	@powershell -Command "$$url = gcloud run services describe ai-chat --region asia-northeast1 --format='value(status.url)'; Write-Host \"サービスURL: $$url\" -ForegroundColor Green"
	@echo ""

# GCP Cloud Run 再デプロイ（既存の設定を使用）
deploy:
	@echo "=========================================="
	@echo "Cloud Runに再デプロイしています..."
	@echo "=========================================="
	@echo ""
	@echo "[1/2] Dockerイメージをビルド・プッシュ..."
	gcloud builds submit --tag asia-northeast1-docker.pkg.dev/extended-acumen-480510-c3/ai-chat-repo/ai-chat:latest
	@echo ""
	@echo "[2/2] Cloud Runにデプロイ..."
	gcloud run deploy ai-chat --region asia-northeast1
	@echo ""
	@echo "✓ 再デプロイが完了しました！"
	@echo ""

# GCP Cloud Run デプロイ（手動）
deploy-manual:
	@echo "GCP Cloud Runにデプロイしています（手動）..."
	@echo "プロジェクトIDを設定中..."
	gcloud config set project extended-acumen-480510-c3
	@echo "Dockerイメージをビルド中..."
	gcloud builds submit --tag asia-northeast1-docker.pkg.dev/extended-acumen-480510-c3/ai-chat-repo/ai-chat:latest
	@echo "Cloud Runにデプロイ中..."
	gcloud run deploy ai-chat \
		--image asia-northeast1-docker.pkg.dev/extended-acumen-480510-c3/ai-chat-repo/ai-chat:latest \
		--platform managed \
		--region asia-northeast1 \
		--allow-unauthenticated \
		--set-env-vars NODE_ENV=production,NEXT_PUBLIC_APP_NAME="AI Chat" \
		--update-secrets ANTHROPIC_API_KEY=anthropic-api-key:latest \
		--min-instances 0 \
		--max-instances 10 \
		--memory 512Mi \
		--cpu 1 \
		--timeout 60 \
		--concurrency 80 \
		--port 3000
	@echo "デプロイ完了！"

# 環境変数の確認
check-env:
	@echo "環境変数の設定を確認しています..."
	@if exist .env.local ( \
		echo ✓ .env.local が存在します \
	) else ( \
		echo ✗ .env.local が存在しません \
	)
	@if defined ANTHROPIC_API_KEY ( \
		echo ✓ ANTHROPIC_API_KEY が設定されています \
	) else ( \
		echo ✗ ANTHROPIC_API_KEY が設定されていません \
	)
	@if defined DATABASE_URL ( \
		echo ✓ DATABASE_URL が設定されています \
	) else ( \
		echo ✗ DATABASE_URL が設定されていません \
	)

# Prisma関連
prisma-generate:
	@echo "Prismaクライアントを生成しています..."
	npx prisma generate

prisma-push:
	@echo "データベーススキーマをプッシュしています..."
	npx prisma db push

prisma-studio:
	@echo "Prisma Studioを起動しています..."
	npx prisma studio

# 依存関係の更新
update-deps:
	@echo "依存関係を更新しています..."
	npm update
	npm audit fix

# セキュリティ監査
audit:
	@echo "セキュリティ監査を実行しています..."
	npm audit
