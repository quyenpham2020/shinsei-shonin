# 申請・承認管理システム デモ

申請・承認ワークフローを管理するWebアプリケーションのデモです。

## 技術スタック

### フロントエンド
- React 18
- TypeScript
- Material-UI (MUI)
- Vite
- React Router

### バックエンド
- Node.js
- Express
- TypeScript
- sql.js (SQLite)
- JWT認証

## プロジェクト構成

```
shinsei-shonin-demo/
├── backend/
│   ├── src/
│   │   ├── config/         # DB・環境設定
│   │   ├── controllers/    # APIコントローラー
│   │   ├── middlewares/    # 認証ミドルウェア
│   │   ├── routes/         # APIルート
│   │   ├── index.ts        # エントリポイント
│   │   └── seed.ts         # デモデータ投入
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/     # 共通コンポーネント
    │   ├── contexts/       # React Context
    │   ├── pages/          # ページコンポーネント
    │   ├── services/       # API通信
    │   ├── types/          # 型定義
    │   └── App.tsx
    └── package.json
```

## セットアップ

### 必要な環境
- Node.js 18以上
- npm

### インストール

```bash
# バックエンド
cd backend
npm install
npm run seed    # デモデータ投入

# フロントエンド
cd ../frontend
npm install
```

### 起動

```bash
# バックエンド（ポート3001）
cd backend
npm run dev

# フロントエンド（ポート3000）- 別ターミナルで実行
cd frontend
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

## デモアカウント

| ロール | 社員ID | パスワード | 権限 |
|--------|--------|------------|------|
| 一般ユーザー | EMP001 | password123 | 自分の申請の作成・閲覧 |
| 承認者 | EMP002 | password123 | 全申請の閲覧・承認・却下 |
| 管理者 | EMP003 | password123 | 全機能 + ユーザー管理 |

## 機能

### 一般ユーザー
- ダッシュボード（申請状況サマリー）
- 新規申請作成
- 自分の申請一覧・詳細閲覧
- 申請へのコメント

### 承認者・管理者
- 全申請の一覧・詳細閲覧
- 申請の承認・却下
- 却下理由の入力

### 申請種別
- 出張申請
- 経費精算
- 休暇申請
- 備品購入
- その他

## API エンドポイント

### 認証
- `POST /api/auth/login` - ログイン
- `GET /api/auth/profile` - プロフィール取得

### 申請
- `GET /api/applications` - 申請一覧
- `GET /api/applications/:id` - 申請詳細
- `POST /api/applications` - 新規申請
- `POST /api/applications/:id/approve` - 承認
- `POST /api/applications/:id/reject` - 却下
- `POST /api/applications/:id/comments` - コメント追加

### ユーザー
- `GET /api/users` - ユーザー一覧（管理者のみ）
- `GET /api/users/approvers` - 承認者一覧

## ライセンス

MIT
