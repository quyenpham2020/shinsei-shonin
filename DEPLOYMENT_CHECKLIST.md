# デプロイメントチェックリスト

このチェックリストを使用して、本番環境へのデプロイを確実に行います。

## 📋 デプロイ前チェックリスト

### 1. コードの準備

- [ ] すべての変更をコミット
  ```bash
  git add .
  git commit -m "Production ready"
  ```

- [ ] リリースタグを作成
  ```bash
  git tag -a v1.0.0 -m "Release 1.0.0"
  git push origin v1.0.0
  ```

- [ ] GitHubにプッシュ
  ```bash
  git push origin main
  ```

### 2. 環境変数の準備

#### バックエンド環境変数

- [ ] `NODE_ENV=production` を設定
- [ ] `DATABASE_URL` を PostgreSQL の接続文字列に設定
- [ ] `JWT_SECRET` を32文字以上のランダム文字列に設定
  ```bash
  # 生成方法
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] `FRONTEND_URL` をフロントエンドのURLに設定
- [ ] `PORT=5000` を設定（Railwayの場合は自動）

#### フロントエンド環境変数

- [ ] `VITE_API_URL` をバックエンドのURLに設定

### 3. Railway デプロイ（推奨）

#### プロジェクト作成

- [ ] https://railway.app にアクセス
- [ ] "Start a New Project" をクリック
- [ ] "Deploy from GitHub repo" を選択
- [ ] リポジトリを接続

#### PostgreSQL データベース追加

- [ ] "+ New" → "Database" → "PostgreSQL" を選択
- [ ] データベースが作成されたことを確認

#### バックエンドサービス設定

- [ ] バックエンドサービスを選択
- [ ] "Variables" タブで環境変数を設定:
  ```
  NODE_ENV=production
  DATABASE_URL=${{Postgres.DATABASE_URL}}
  JWT_SECRET=[生成したランダム文字列]
  FRONTEND_URL=https://[your-frontend].up.railway.app
  ```

- [ ] "Settings" タブでビルド設定:
  - Root Directory: `/`
  - Build Command: `cd backend && npm install && npm run build`
  - Start Command: `cd backend && npm start`

- [ ] ヘルスチェック設定:
  - Path: `/api/health`
  - Timeout: 30s

#### フロントエンドサービス設定

- [ ] "+ New" → "GitHub Repo" → 同じリポジトリを選択
- [ ] "Variables" タブで環境変数を設定:
  ```
  VITE_API_URL=https://[your-backend].up.railway.app
  ```

- [ ] "Settings" タブでビルド設定:
  - Build Command: `cd frontend && npm install && npm run build`
  - Start Command: `cd frontend && npx vite preview --host 0.0.0.0 --port $PORT`

#### デプロイ確認

- [ ] "Deployments" タブでデプロイ状況を確認
- [ ] ログにエラーがないことを確認
- [ ] 公開URLにアクセスして動作確認

### 4. カスタムドメイン設定

#### Railway でのドメイン設定

- [ ] フロントエンドサービスの "Settings" → "Domains" を開く
- [ ] "Custom Domain" をクリック
- [ ] ドメイン名を入力（例: `vtinagoya.jp.co`）
- [ ] 提供されたCNAMEレコードをメモ

#### DNS設定

- [ ] ドメインプロバイダーのDNS設定を開く
- [ ] CNAMEレコードを追加:
  ```
  Type: CNAME
  Name: vtinagoya (またはサブドメイン)
  Value: [Railway提供のURL]
  TTL: 3600
  ```

- [ ] DNS伝播を待つ（最大48時間、通常は数分）
- [ ] SSL証明書が自動発行されたことを確認

#### バックエンドのドメイン設定（オプション）

- [ ] バックエンドサービスにもカスタムドメインを設定（例: `api.vtinagoya.jp.co`）
- [ ] フロントエンドの `VITE_API_URL` を更新
- [ ] バックエンドの `FRONTEND_URL` を更新

### 5. デプロイ後の動作確認

#### ヘルスチェック

- [ ] バックエンドヘルスチェック:
  ```bash
  curl https://your-backend-url.com/api/health
  ```
  期待される応答: `{"status":"ok","message":"Application API"}`

#### ログイン確認

- [ ] フロントエンドURL（https://vtinagoya.jp.co）にアクセス
- [ ] ログイン画面が表示されることを確認
- [ ] デフォルト管理者でログイン:
  ```
  Email: admin@example.com
  Password: Admin123!
  ```

#### 機能確認

- [ ] ダッシュボードが表示される
- [ ] 申請一覧が表示される
- [ ] ユーザー管理ページにアクセスできる
- [ ] 言語切り替えが動作する
- [ ] Excel インポート/エクスポートが動作する

### 6. セキュリティ確認

- [ ] デフォルト管理者パスワードを変更
- [ ] JWT_SECRET が安全なランダム文字列である
- [ ] HTTPS が有効になっている
- [ ] データベース接続がSSLで保護されている

### 7. バックアップ設定

#### Railway の場合

- [ ] PostgreSQL データベースのバックアップが自動設定されている
- [ ] ロールバック手順を確認:
  1. "Deployments" タブを開く
  2. 過去のデプロイを選択
  3. "Rollback to this version" をクリック

#### Render の場合

- [ ] PostgreSQL データベースのバックアップ設定を確認
  - Dashboard → Database → "Backups" タブ
  - 自動バックアップが有効になっている（毎日）

### 8. 監視設定

- [ ] Railway/Render のアラート設定を確認
- [ ] エラーログ監視の設定
- [ ] アップタイム監視（UptimeRobot など）の設定（オプション）

### 9. ドキュメント更新

- [ ] README.md に本番URLを記載
- [ ] デプロイ手順を最新化
- [ ] チームメンバーに本番環境のURLを共有

### 10. ロールバック手順の確認

#### テストロールバック（本番前）

- [ ] テストデプロイを実施
- [ ] Railway/Render のUIからロールバックをテスト
- [ ] ロールバック後に正常動作することを確認

#### 緊急時のロールバック手順

1. **Railway の場合:**
   - [ ] Dashboard → Deployments
   - [ ] 安定版のデプロイを選択
   - [ ] "Rollback to this version"

2. **Git経由:**
   ```bash
   # 直前のコミットを取り消し
   git revert HEAD
   git push origin main

   # または特定のコミットに戻す
   git reset --hard [stable-commit-hash]
   git push --force origin main
   ```

## ✅ デプロイ完了確認

すべてのチェックが完了したら、以下を確認:

- [ ] 本番URL（https://vtinagoya.jp.co）が正常にアクセスできる
- [ ] すべての主要機能が動作する
- [ ] SSL証明書が有効
- [ ] バックアップ設定が完了
- [ ] ロールバック手順を理解している
- [ ] チームメンバーに展開完了を通知

## 🔄 今後のデプロイフロー

### 定期リリース

1. 開発完了後、ステージング環境でテスト
2. main ブランチにマージ
3. リリースタグを作成
4. Railway/Render が自動デプロイ
5. 本番環境で動作確認
6. 問題があればロールバック

### ホットフィックス

1. 緊急修正をコミット
2. 即座に main にプッシュ
3. 自動デプロイを確認
4. 問題が解決したことを確認

---

このチェックリストを印刷して、各デプロイ時に確認することをお勧めします！
