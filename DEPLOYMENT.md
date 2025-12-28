# 申請承認システム - デプロイメントガイド

このガイドでは、申請承認システムを無料のクラウドホスティングサービスにデプロイする手順を説明します。

## 目次
1. [デプロイオプション](#デプロイオプション)
2. [Railway でのデプロイ（推奨）](#railway-でのデプロイ)
3. [Render でのデプロイ](#render-でのデプロイ)
4. [カスタムドメイン設定](#カスタムドメイン設定)
5. [バージョン管理とロールバック](#バージョン管理とロールバック)
6. [環境変数の設定](#環境変数の設定)

---

## デプロイオプション

### Railway（推奨）
✅ 完全無料プラン（$5/月のクレジット付き）
✅ 自動Git連携とデプロイ
✅ PostgreSQL データベース無料
✅ ワンクリックロールバック
✅ カスタムドメイン対応
✅ 日本リージョン対応

### Render
✅ 完全無料プラン
✅ 自動Git連携とデプロイ
✅ PostgreSQL データベース無料
✅ ワンクリックロールバック
✅ カスタムドメイン対応
⚠️ スリープモード（15分非アクティブ後）

---

## Railway でのデプロイ

### 1. 事前準備

1. **GitHubにプッシュ**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Railway アカウント作成**
   - https://railway.app にアクセス
   - "Start a New Project" をクリック
   - GitHub アカウントで連携

### 2. プロジェクト作成

1. **新規プロジェクト作成**
   - "New Project" → "Deploy from GitHub repo"
   - リポジトリ `shinsei-shonin-demo` を選択

2. **PostgreSQL データベース追加**
   - プロジェクト画面で "+ New" をクリック
   - "Database" → "Add PostgreSQL" を選択
   - データベースが自動作成されます

### 3. バックエンド設定

1. **環境変数を設定**
   - バックエンドサービスをクリック
   - "Variables" タブを開く
   - 以下の変数を追加：

   ```
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=your-super-secret-key-change-this
   FRONTEND_URL=https://your-app.up.railway.app
   ```

2. **ビルド設定**
   - "Settings" タブを開く
   - "Build Command": `cd backend && npm install && npm run build`
   - "Start Command": `cd backend && npm start`
   - "Root Directory": `/`

3. **ヘルスチェック設定**
   - "Settings" → "Healthcheck"
   - Path: `/api/health`
   - Timeout: 30s

### 4. フロントエンド設定

1. **新しいサービス追加**
   - プロジェクト画面で "+ New" をクリック
   - "GitHub Repo" → 同じリポジトリを選択

2. **環境変数を設定**
   ```
   VITE_API_URL=https://your-backend.up.railway.app
   ```

3. **ビルド設定**
   - "Build Command": `cd frontend && npm install && npm run build`
   - "Start Command": `cd frontend && npm run preview`

### 5. デプロイ確認

1. Railway が自動的にデプロイを開始します
2. "Deployments" タブでデプロイ状況を確認
3. デプロイ完了後、公開URLにアクセス

---

## Render でのデプロイ

### 1. 事前準備

1. **GitHubにプッシュ**（同上）

2. **Render アカウント作成**
   - https://render.com にアクセス
   - "Get Started" をクリック
   - GitHub アカウントで連携

### 2. PostgreSQL データベース作成

1. **新規データベース作成**
   - Dashboard → "New" → "PostgreSQL"
   - Name: `shinsei-shonin-db`
   - Region: Singapore (最も近いリージョン)
   - Plan: **Free**
   - "Create Database" をクリック

2. **接続情報をコピー**
   - "Internal Database URL" をコピー（後で使用）

### 3. バックエンド Web Service 作成

1. **新規 Web Service 作成**
   - Dashboard → "New" → "Web Service"
   - GitHub リポジトリを接続
   - Name: `shinsei-shonin-backend`
   - Region: Singapore
   - Branch: `main`
   - Root Directory: `backend`
   - Runtime: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

2. **環境変数を設定**
   - "Environment" タブを開く
   - 以下の変数を追加：
   ```
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=[PostgreSQLのInternal Database URLを貼り付け]
   JWT_SECRET=your-super-secret-key-change-this
   FRONTEND_URL=https://shinsei-shonin-frontend.onrender.com
   ```

3. **Plan を選択**
   - Plan: **Free**
   - "Create Web Service" をクリック

### 4. フロントエンド Static Site 作成

1. **新規 Static Site 作成**
   - Dashboard → "New" → "Static Site"
   - 同じGitHub リポジトリを選択
   - Name: `shinsei-shonin-frontend`
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

2. **環境変数を設定**
   ```
   VITE_API_URL=https://shinsei-shonin-backend.onrender.com
   ```

3. **Rewrite ルール設定**
   - "Redirects/Rewrites" タブを開く
   - Source: `/*`
   - Destination: `/index.html`
   - Action: Rewrite

---

## カスタムドメイン設定

### Railway でのカスタムドメイン設定

1. **ドメインを追加**
   - サービスの "Settings" → "Domains"
   - "Custom Domain" をクリック
   - ドメイン名を入力（例: `vtinagoya.jp.co`）

2. **DNS設定**
   Railway が提供するCNAMEレコードをドメインのDNS設定に追加：
   ```
   CNAME: vtinagoya.jp.co → your-app.up.railway.app
   ```

3. **SSL証明書**
   - Railway が自動的にLet's Encrypt SSL証明書を発行
   - 数分で HTTPS が有効になります

### Render でのカスタムドメイン設定

1. **ドメインを追加**
   - サービスの "Settings" → "Custom Domains"
   - "Add Custom Domain" をクリック
   - ドメイン名を入力（例: `vtinagoya.jp.co`）

2. **DNS設定**
   ```
   CNAME: vtinagoya.jp.co → your-app.onrender.com
   ```

3. **SSL証明書**
   - 自動的に発行されます

### サブドメイン設定例

```
# バックエンド
api.vtinagoya.jp.co → backend service

# フロントエンド
app.vtinagoya.jp.co → frontend service
または
vtinagoya.jp.co → frontend service
```

---

## バージョン管理とロールバック

### Railway でのバージョン管理

✅ **自動バージョン管理**
- すべてのデプロイがGitコミットに紐付けられます
- "Deployments" タブで全履歴を確認可能

✅ **ワンクリックロールバック**
1. "Deployments" タブを開く
2. 過去のデプロイを選択
3. "Rollback to this version" をクリック
4. 即座に以前のバージョンに戻ります

✅ **バックアップ戦略**
```bash
# デプロイ前にタグを付ける
git tag -a v1.0.0 -m "Production release 1.0.0"
git push origin v1.0.0

# 問題が発生した場合
git revert HEAD
git push origin main
# Railway が自動的に再デプロイ
```

### Render でのバージョン管理

✅ **自動バージョン管理**
- GitコミットベースでデプロイIDが割り当てられます

✅ **手動ロールバック**
1. Dashboard → サービスを選択
2. "Manual Deploy" → 過去のコミットを選択
3. "Deploy" をクリック

✅ **データベースバックアップ**
```bash
# PostgreSQL のバックアップ
# Render Dashboard → Database → "Backups" タブ
# 自動バックアップが毎日実行されます（無料プランは7日間保持）
```

### ベストプラクティス

1. **ステージング環境の使用**
   ```bash
   # staging ブランチを作成
   git checkout -b staging
   git push origin staging

   # Railway/Render で staging 環境を作成
   # テスト完了後に main にマージ
   ```

2. **リリースタグの使用**
   ```bash
   # production リリース前
   git tag -a v1.0.0 -m "Release 1.0.0"
   git push origin v1.0.0
   ```

3. **ロールバック手順**
   ```bash
   # 方法1: Git revert（推奨）
   git revert HEAD
   git push origin main

   # 方法2: 以前のコミットに強制プッシュ（注意）
   git reset --hard <commit-hash>
   git push --force origin main

   # 方法3: Railway/Render のUIからロールバック
   ```

---

## 環境変数の設定

### バックエンド環境変数

```bash
# 必須
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
FRONTEND_URL=https://your-frontend-url.com

# オプション
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=Admin123!
```

### フロントエンド環境変数

```bash
# 必須
VITE_API_URL=https://your-backend-url.com
```

### セキュリティのベストプラクティス

1. **JWT_SECRET の生成**
   ```bash
   # ランダムな32文字以上の文字列を生成
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **環境変数の管理**
   - ローカル開発: `.env` ファイル（Gitに含めない）
   - 本番環境: Railway/Render のダッシュボード
   - `.env.example` をリポジトリに含める

3. **初回デプロイ後の作業**
   - デフォルト管理者パスワードを変更
   - JWT_SECRET を定期的にローテーション

---

## デプロイ後の確認

### 1. ヘルスチェック

```bash
# API ヘルスチェック
curl https://your-backend-url.com/api/health

# 期待される応答
{"status":"ok","message":"Application API"}
```

### 2. データベース接続確認

```bash
# ログインテスト
curl -X POST https://your-backend-url.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}'
```

### 3. フロントエンド確認

- ブラウザで https://your-frontend-url.com にアクセス
- ログイン画面が表示されることを確認
- 管理者アカウントでログイン

---

## トラブルシューティング

### デプロイが失敗する場合

1. **ビルドエラー**
   ```bash
   # ローカルでビルドテスト
   cd backend && npm run build
   cd ../frontend && npm run build
   ```

2. **ポート設定エラー**
   - 環境変数 `PORT` が正しく設定されているか確認
   - Railway/Render が提供する PORT を使用

3. **データベース接続エラー**
   - DATABASE_URL が正しいか確認
   - PostgreSQL サービスが起動しているか確認

### アプリケーションが動作しない場合

1. **ログを確認**
   - Railway: "Deployments" → デプロイを選択 → "View Logs"
   - Render: サービスページ → "Logs" タブ

2. **環境変数を確認**
   - すべての必須変数が設定されているか
   - FRONTEND_URL と VITE_API_URL が正しいか

3. **CORS エラー**
   - バックエンドの FRONTEND_URL が正しく設定されているか確認

---

## コスト管理

### Railway 無料プラン
- 月額 $5 のクレジット（初回）
- 使用量に応じて消費
- 小規模アプリなら無料範囲内で運用可能

### Render 無料プラン
- 完全無料
- 15分非アクティブ後にスリープ
- 初回アクセス時の起動に30秒程度かかる

### 推奨構成
- **Railway**: 常時稼働が必要な場合
- **Render**: トラフィックが少ない場合

---

## まとめ

✅ **バージョン管理**: Git コミットベースで自動管理
✅ **ロールバック**: UIから数クリックで以前のバージョンに復元
✅ **無料**: Railway または Render の無料プランで運用可能
✅ **カスタムドメイン**: vtinagoya.jp.co などを設定可能

これで要件を満たすデプロイメント環境が構築できます！
