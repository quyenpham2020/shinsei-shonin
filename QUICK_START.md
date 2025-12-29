# クイックスタート - Railway デプロイ

最速でデプロイする手順（5分で完了）

## ステップ 1: GitHubにプッシュ

```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

## ステップ 2: Railway でデプロイ

### 2.1 アカウント作成とプロジェクト作成
1. https://railway.app にアクセス
2. "Start a New Project" → "Deploy from GitHub repo"
3. このリポジトリを選択

### 2.2 PostgreSQL 追加
1. プロジェクト画面で "+ New" → "Database" → "PostgreSQL"
2. データベースが自動作成されます

### 2.3 バックエンド設定
1. バックエンドサービスをクリック
2. "Variables" タブで以下を追加:
   ```
   NODE_ENV=production
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=<generate-random-32-chars>
   FRONTEND_URL=https://your-frontend.up.railway.app
   ```

3. "Settings" タブで設定:
   - Root Directory: `/`
   - Build Command: `cd backend && npm install && npm run build`
   - Start Command: `cd backend && npm start`

### 2.4 フロントエンド設定
1. プロジェクト画面で "+ New" → "GitHub Repo" → 同じリポジトリ
2. "Variables" タブで以下を追加:
   ```
   VITE_API_URL=https://your-backend.up.railway.app
   ```

3. "Settings" タブで設定:
   - Build Command: `cd frontend && npm install && npm run build`
   - Start Command: `cd frontend && npx vite preview --host 0.0.0.0 --port $PORT`

## ステップ 3: カスタムドメイン設定

1. フロントエンドサービスの "Settings" → "Domains"
2. "Custom Domain" をクリック → `vtinagoya.jp.co` を入力
3. DNSプロバイダーで CNAME レコードを追加:
   ```
   CNAME: vtinagoya.jp.co → your-app.up.railway.app
   ```

## 完了！

アクセス: https://vtinagoya.jp.co

## ロールバック方法

問題が発生した場合:
1. "Deployments" タブを開く
2. 正常に動作していたデプロイを選択
3. "Rollback to this version" をクリック

以上で完了です！
