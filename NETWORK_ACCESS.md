# External Network Access Configuration

このドキュメントでは、外部ユーザーが `http://192.168.3.5:3000` からアプリケーションにアクセスできるようにする設定方法を説明します。

## 設定概要

### Backend (Port 3001)
- ホスト: `0.0.0.0` (全ネットワークインターフェースでリスン)
- ポート: `3001`
- アクセス URL: `http://192.168.3.5:3001`

### Frontend (Port 3000)
- ホスト: `0.0.0.0` (全ネットワークインターフェースでリスン)
- ポート: `3000`
- アクセス URL: `http://192.168.3.5:3000`

## 起動方法

### オプション1: 開発モード (推奨 - ホットリロード有効)

```bash
# ルートディレクトリから両方のサーバーを同時起動
npm start
```

または個別に起動:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**開発モードの特徴:**
- ✅ コード変更時に自動リロード
- ✅ デバッグしやすい
- ⚠️ パフォーマンスは本番モードより低い

### オプション2: 本番ビルド + 静的サーバー

```bash
# 1. Frontend をビルド
cd frontend
npm run build

# 2. 静的ファイルサーバーで配信 (例: serve)
npx serve -s dist -p 3000 -l 0.0.0.0

# 3. Backend を起動 (別ターミナル)
cd backend
npm start
```

**本番モードの特徴:**
- ✅ 高パフォーマンス
- ✅ 最適化されたコード
- ⚠️ コード変更時は再ビルド必要

## 設定ファイル

### Backend: `backend/.env`
```env
PORT=3001
HOST=0.0.0.0
FRONTEND_URL=http://192.168.3.5:3000
```

### Frontend: `frontend/.env`
```env
VITE_API_URL=http://192.168.3.5:3001
```

### Frontend: `frontend/vite.config.ts`
```typescript
server: {
  port: 3000,
  host: '0.0.0.0',  // 外部アクセス許可
  // 開発モード時のプロキシ設定
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
  },
}
```

## ファイアウォール設定

外部からアクセスするには、以下のポートを開放する必要があります:

### Windows Firewall
```powershell
# Port 3000 (Frontend) を開放
netsh advfirewall firewall add rule name="Shinsei Frontend" dir=in action=allow protocol=TCP localport=3000

# Port 3001 (Backend) を開放
netsh advfirewall firewall add rule name="Shinsei Backend" dir=in action=allow protocol=TCP localport=3001
```

### Linux (ufw)
```bash
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
```

## 動作確認

### 1. ローカルマシンから確認
```bash
# Backend Health Check
curl http://localhost:3001/api/health

# Frontend アクセス
curl http://localhost:3000
```

### 2. 同じネットワーク内の別のマシンから確認
```bash
# Backend Health Check
curl http://192.168.3.5:3001/api/health

# Frontend アクセス (ブラウザで)
http://192.168.3.5:3000
```

## トラブルシューティング

### 問題: 外部からアクセスできない

**確認事項:**
1. ✅ サーバーが `0.0.0.0` でリスンしているか確認
   ```bash
   # Windows
   netstat -ano | findstr :3000
   netstat -ano | findstr :3001

   # Linux/Mac
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :3001
   ```

2. ✅ ファイアウォールが開放されているか確認
   ```powershell
   # Windows
   netsh advfirewall firewall show rule name="Shinsei Frontend"
   netsh advfirewall firewall show rule name="Shinsei Backend"
   ```

3. ✅ IPアドレスが正しいか確認
   ```bash
   # Windows
   ipconfig

   # Linux/Mac
   ifconfig
   # または
   ip addr show
   ```

4. ✅ Backend の CORS 設定を確認
   - `backend/.env` の `FRONTEND_URL` が正しいか
   - `backend/src/index.ts` で CORS が有効化されているか

### 問題: API 呼び出しが失敗する (401/403エラー)

前回修正した問題を確認:
- ✅ `userService.getApprovers()` を使用しているか (userService.getAll() ではない)
- ✅ Backend で `/users/approvers` エンドポイントが利用可能か

### 問題: ブラウザコンソールに CORS エラー

**解決方法:**
1. `backend/.env` の `FRONTEND_URL` を更新:
   ```env
   FRONTEND_URL=http://192.168.3.5:3000
   ```

2. Backend を再起動

## セキュリティ注意事項

⚠️ **重要:** 本番環境では以下を必ず設定してください:

1. **JWT Secret の変更**
   ```env
   JWT_SECRET=<ランダムで強力なシークレットキー>
   ```

2. **HTTPS の使用** (本番環境)
   - Let's Encrypt などで SSL証明書を取得
   - Nginx や Apache をリバースプロキシとして設定

3. **データベース認証情報の保護**
   - `.env` ファイルを Git にコミットしない
   - 環境変数で管理

4. **ファイアウォールルールの最小化**
   - 必要なポートのみ開放
   - 信頼できる IP からのみアクセス許可 (可能な場合)

## インターネット経由のアクセス (オプション)

ローカルネットワーク外からもアクセスしたい場合:

### オプション A: Ngrok (開発/テスト用)
```bash
# Frontend
ngrok http 3000

# Backend
ngrok http 3001
```

### オプション B: クラウドデプロイ (本番用)
- Render, Heroku, AWS, Azure などにデプロイ
- 詳細は各プラットフォームのドキュメントを参照

## 便利なスクリプト

以下のスクリプトが `package.json` で利用可能:

```bash
# 開発モードで両方起動
npm start

# Backend のみ起動 (開発モード)
npm run start:backend

# Frontend のみ起動 (開発モード)
npm run start:frontend

# 両方をビルド
npm run build

# Backend をビルド
npm run build:backend

# Frontend をビルド
npm run build:frontend
```

---

**更新日:** 2026-01-05
**対象バージョン:** v1.0.0
