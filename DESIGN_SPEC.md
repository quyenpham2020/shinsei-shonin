# 申請承認システム - 設計仕様書 / Design Specification

## 📋 目次 / Table of Contents

1. [権限モデル / Permission Model](#権限モデル--permission-model)
2. [週次報告管理機能 / Weekly Report Management](#週次報告管理機能--weekly-report-management)
3. [チーム管理機能 / Team Management](#チーム管理機能--team-management)
4. [今後の機能 / Future Features](#今後の機能--future-features)
5. [テストシナリオ / Test Scenarios](#テストシナリオ--test-scenarios)

---

## 権限モデル / Permission Model

### ユーザー役割階層 / User Role Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    会社全体 / Company-wide                   │
│                    ├─ BOD (取締役会)                         │
│                    └─ Admin (人事・管理者)                    │
├─────────────────────────────────────────────────────────────┤
│              部署レベル / Department Level                    │
│              └─ GM (ゼネラルマネージャー)                     │
├─────────────────────────────────────────────────────────────┤
│              チームレベル / Team Level                        │
│              └─ Onsite Leader (オンサイトリーダー)           │
├─────────────────────────────────────────────────────────────┤
│              メンバーレベル / Member Level                    │
│              └─ User (一般ユーザー)                          │
└─────────────────────────────────────────────────────────────┘
```

### 役割別データアクセス範囲 / Data Access Scope by Role

| 役割 / Role | 日本語名 | アクセス範囲 / Access Scope | 説明 / Description |
|-------------|----------|---------------------------|-------------------|
| `user` | 一般ユーザー | 自分のデータのみ | Own data only |
| `approver` | 承認者 | 担当部署の全データ | Department(s) they approve |
| `onsite_leader` | オンサイトリーダー | 管理チームの全データ | Managed team members |
| `gm` | ゼネラルマネージャー | 所属部署の全データ | Entire department |
| `bod` | 取締役 | 全社データ | Company-wide data |
| `admin` | 管理者(人事) | 全社データ | Company-wide data |

### データアクセスパターン / Data Access Pattern

**重要**: この権限モデルは以下の機能に適用される:
- ✅ 週次報告管理 (Weekly Reports)
- 🔜 タイムシート管理 (Timesheets)
- 🔜 勤怠管理 (Attendance)
- 🔜 評価管理 (Performance Reviews)
- 🔜 その他のメンバーデータ (Other member data)

---

## 週次報告管理機能 / Weekly Report Management

**ファイル**: `frontend/src/pages/WeeklyReportPage.tsx`
**バックエンド**: `backend/src/controllers/weeklyReportController.ts`

### タブ構成 / Tab Structure

#### 1. 報告入力タブ (Report Input)
**アクセス**: 全ユーザー (All users)

**機能**:
- 週次報告の入力・編集
- 前週データの自動プリフィル
- AIによるOverview生成
- 週次比較表示

**フィールド**:
- 今週の報告内容 (必須)
- 成果・達成事項
- 課題・問題点
- 来週の予定
- Overview (部署共有用)

#### 2. 週次比較タブ (Weekly Comparison)
**アクセス**: 全ユーザー (All users)

**機能**:
- 先週と今週の報告内容を並べて表示
- 進捗確認・継続性チェック

#### 3. メンバー一覧タブ (Member List)
**アクセス**: `onsite_leader`, `gm`, `bod`, `admin`, `approver`

**機能**:
| 役割 | 表示データ範囲 | 制限 |
|------|--------------|------|
| `onsite_leader` | チームメンバーのみ | 直近3週間のみ |
| `gm` | 所属部署全体 | 無制限(最大52週) |
| `bod` | 全社 | 無制限(最大52週) |
| `admin` | 全社 | 無制限(最大52週) |
| `approver` | 担当部署 | 無制限(最大52週) |

**表示内容**:
- 社員番号、氏名、部門
- 直近3週間の提出状況 (○提出済 / ✗未提出)
- 提出率の集計
- メンバークリックで詳細履歴モーダル表示

**パフォーマンス最適化**:
- 初期ロード: 3週間分
- "過去データを読み込む" ボタン: +4週間ずつ
- 最大: 52週間 (1年分)

#### 4. AI Overview生成機能 (AI-Powered Overview Generation)
**アクセス**: 全ユーザー (All users)

**機能**:
詳細な週次報告から、部署共有用の簡潔なOverviewを自動生成

**AI Failover Mechanism (フェイルオーバー機構)**:

システムは2つのAI APIを使用して高い可用性を実現:

```
┌─────────────────────────────────────────────────┐
│  1. Primary: Claude AI API                      │
│     Model: claude-3-5-sonnet-20241022           │
│     ↓                                            │
│  2. Fallback: Gemini AI API                     │
│     Model: gemini-2.0-flash (Latest stable)     │
│     (Claude APIが失敗した場合に自動切り替え)      │
└─────────────────────────────────────────────────┘
```

**動作フロー**:
1. **Primary試行**: Claude AI APIを呼び出し
   - 成功 → Overviewを返す
   - 失敗 → Step 2へ

2. **Fallback試行**: Gemini AI APIを呼び出し
   - 成功 → Overviewを返す
   - 失敗 → エラーメッセージ

**エラーハンドリング**:
- Claude API失敗時: 自動的にGemini APIへ切り替え
- 両方失敗時: 「両方のAI APIが利用できません」エラー
- ログ出力: どちらのAPIを使用したかを記録

**レスポンス**:
```json
{
  "overview": "生成されたOverview文章",
  "usedProvider": "Claude AI" または "Gemini AI"
}
```

**設定**:
- Claude AI Key: `ANTHROPIC_API_KEY` (環境変数)
- Gemini AI Key: `GEMINI_API_KEY` (環境変数)

**プロンプト要件**:
- 3-5文程度
- プロジェクト名・主な業務内容を明記
- 他メンバーが理解できる簡潔な表現
- 技術用語は必要最小限

#### 5. Excel出力機能
**アクセス**: `onsite_leader`, `gm`, `bod`, `admin`

**フィルター**:
- 部署フィルター
- チームフィルター
- 期間フィルター (開始日・終了日)

**出力内容**:
- 社員番号、氏名、部署、チーム
- 週開始日、週終了日
- 報告内容、成果、課題、来週予定、Overview
- 作成日時、更新日時

---

## チーム管理機能 / Team Management

**ファイル**: `frontend/src/pages/TeamManagementPage.tsx`
**バックエンド**: `backend/src/controllers/teamController.ts`

### 権限別機能 / Features by Role

#### オンサイトリーダー (Onsite Leader)
- 自分が管理するチームのみ表示
- メンバー追加・削除
- チーム情報編集

#### GM以上 (GM, BOD, Admin)
- 全チーム表示・管理
- チーム作成・削除
- リーダー割り当て

### チーム階層構造 / Team Hierarchy

```
部署 (Department)
  ├─ チームA (Team A)
  │   ├─ オンサイトリーダー1
  │   ├─ メンバー1
  │   ├─ メンバー2
  │   └─ メンバー3
  └─ チームB (Team B)
      ├─ オンサイトリーダー2
      ├─ メンバー4
      └─ メンバー5
```

---

## 部署管理機能 / Department Management

**ファイル**: `frontend/src/pages/DepartmentListPage.tsx`
**バックエンド**: `backend/src/controllers/departmentController.ts`

### CASCADE更新 / Cascade Updates

**重要**: 部署名変更時、関連データを自動更新

#### 影響を受けるテーブル:
1. `users` テーブル
   - `department` フィールドを新しい部署名に更新
   - Fuzzy matching対応 (大文字小文字・スペースの差異を許容)

#### 実装詳細:
```typescript
// Step 1: 完全一致で更新
UPDATE users SET department = '新部署名' WHERE department = '旧部署名'

// Step 2: 一致なしの場合、類似名で検索・更新
UPDATE users SET department = '新部署名'
WHERE TRIM(LOWER(department)) = TRIM(LOWER('旧部署名'))
```

#### ログ出力:
- 更新件数の表示
- 不整合の警告
- Fuzzy match時の詳細情報

### データ整合性チェックツール

**ファイル**:
- `backend/check-department-consistency.js` - 不整合検出
- `backend/fix-department-inconsistencies.js` - 自動修正

---

## ユーザー管理機能 / User Management

**ファイル**: `frontend/src/pages/UserListPage.tsx`
**バックエンド**: `backend/src/controllers/userController.ts`

### リアルタイム更新機能

#### 自動更新トリガー:
1. **タブ表示時**: `visibilitychange` イベント
2. **ポーリング**: 15秒ごと (ページが表示されている時のみ)
3. **手動更新**: 「更新」ボタン

#### 目的:
- 部署名変更時の即時反映
- 他ユーザーの変更を自動同期

---

## 今後の機能 / Future Features

### 🔜 タイムシート管理 / Timesheet Management

**同じ権限モデルを適用**:
- Onsite Leader → チームメンバーのタイムシート閲覧
- GM → 部署全体のタイムシート閲覧・承認
- BOD/Admin → 全社タイムシート閲覧

**機能要件**:
- 日次・週次・月次集計
- Excel出力
- 承認ワークフロー
- 残業時間アラート

### 🔜 勤怠管理 / Attendance Management

**同じ権限モデルを適用**:
- 出勤・退勤記録
- 休暇申請・承認
- 遅刻・早退管理
- 月次集計レポート

### 🔜 評価管理 / Performance Review

**権限モデル**:
- Onsite Leader → 直属メンバーの評価
- GM → 部署全体の評価・調整
- BOD/Admin → 全社評価の閲覧・最終承認

---

## テストシナリオ / Test Scenarios

### 週次報告管理 - 基本機能テスト

#### TC-WR-001: ユーザーが自分の週次報告を作成
**前提条件**:
- Role: `user`
- ログイン済み

**手順**:
1. 週次報告管理ページにアクセス
2. "報告入力" タブを選択
3. 報告内容を入力 (必須)
4. 成果・課題・来週予定を入力 (任意)
5. "Overviewを生成" ボタンをクリック
6. 生成されたOverviewを確認・編集
7. "報告を保存" ボタンをクリック

**期待結果**:
- ✅ 報告が正常に保存される
- ✅ 成功メッセージが表示される
- ✅ 週次比較タブに今週のデータが表示される

---

#### TC-WR-002: オンサイトリーダーがチームメンバーの報告を閲覧
**前提条件**:
- Role: `onsite_leader`
- チームにメンバーが3人以上
- メンバーのうち2人が今週の報告を提出済み

**手順**:
1. 週次報告管理ページにアクセス
2. "メンバー一覧" タブを選択
3. 提出状況を確認
4. メンバーをクリックして詳細モーダルを表示

**期待結果**:
- ✅ 自分のチームメンバーのみ表示される
- ✅ 直近3週間のデータのみ表示される
- ✅ 提出済みメンバーは "提出済" と表示
- ✅ 未提出メンバーは "未提出" と表示
- ✅ 提出率が正しく表示される (例: 2/3)
- ✅ メンバー詳細モーダルに報告内容が表示される
- ❌ "過去データを読み込む" ボタンは表示されない

---

#### TC-WR-003: GMが部署全体の報告を閲覧・エクスポート
**前提条件**:
- Role: `gm`
- 部署に10人以上のメンバー

**手順**:
1. 週次報告管理ページにアクセス
2. "メンバー一覧" タブを選択
3. 部署全体のメンバーが表示されることを確認
4. "過去データを読み込む" ボタンをクリック
5. Excel出力セクションで部署フィルターを設定
6. "Excel出力" ボタンをクリック

**期待結果**:
- ✅ 自分の部署の全メンバーが表示される
- ✅ 他部署のメンバーは表示されない
- ✅ 初期表示は直近3週間
- ✅ "過去データを読み込む" ボタンが表示される
- ✅ クリック後、7週間分のデータが表示される (+4週間)
- ✅ Excelファイルが正常にダウンロードされる
- ✅ Excelに正しいフィルター条件が適用されている

---

#### TC-WR-004: BOD/Adminが全社データを閲覧
**前提条件**:
- Role: `bod` または `admin`

**手順**:
1. 週次報告管理ページにアクセス
2. "メンバー一覧" タブを選択
3. 全社員が表示されることを確認
4. 複数回 "過去データを読み込む" をクリック
5. 異なる部署・チームでフィルタリング

**期待結果**:
- ✅ 全社員のデータが表示される
- ✅ 最大52週間まで読み込み可能
- ✅ Excel出力で任意の部署・チーム・期間を指定可能

---

### 週次報告管理 - バグ修正テスト

#### TC-WR-BUG-001: タイムゾーン不整合の修正確認
**背景**: Issue #6 - メンバーが報告を提出したのに "未提出" と表示される

**前提条件**:
- メンバーが週次報告を提出済み
- データベースに報告が存在することを確認

**手順**:
1. リーダーとしてログイン
2. "メンバー一覧" タブを選択
3. 提出済みメンバーの状態を確認

**期待結果**:
- ✅ 提出済みの報告が "提出済" と正しく表示される
- ✅ week_start_date のフォーマットが一致している (YYYY-MM-DD)
- ❌ "未提出" と誤表示されない

**技術詳細**:
- `formatLocalDate()` 関数がローカルタイムゾーンで日付を正しくフォーマット
- `toISOString()` による UTC変換の問題を回避
- reportMap のキーフォーマットが一致: `"userId-YYYY-MM-DD"`

---

### 部署管理 - CASCADE更新テスト

#### TC-DEPT-001: 部署名変更時のユーザー情報自動更新
**前提条件**:
- 部署 "VTI Nagoya" に5人のユーザーが所属
- ユーザーの `department` フィールドが "VTI Nagoya"

**手順**:
1. 部署管理ページにアクセス
2. "VTI Nagoya" を "VTI Nagoya Office" に変更
3. 保存
4. ユーザー管理ページを開く
5. 対象ユーザーの部署名を確認

**期待結果**:
- ✅ 5人全員の部署名が "VTI Nagoya Office" に更新されている
- ✅ CASCADE UPDATEのログが出力されている
- ✅ ユーザー管理ページが自動的にリフレッシュされる (15秒以内)

---

#### TC-DEPT-002: 部署名の大文字小文字・スペース差異の処理
**前提条件**:
- データベース部署名: "VTINagoya" (スペースなし)
- ユーザーA: department = "VTI Nagoya" (スペースあり)
- ユーザーB: department = "vti nagoya" (小文字)

**手順**:
1. 部署名を "VTINagoya" → "VTI Nagoya Office" に変更
2. データ整合性チェックツールを実行
   ```bash
   node backend/check-department-consistency.js
   ```
3. 自動修正ツールを実行
   ```bash
   node backend/fix-department-inconsistencies.js
   ```

**期待結果**:
- ✅ Fuzzy matching でユーザーA, Bの部署名が検出される
- ✅ 両ユーザーの部署名が "VTI Nagoya Office" に更新される
- ✅ 警告ログに不整合の詳細が出力される

---

### チーム管理テスト

#### TC-TEAM-001: オンサイトリーダーがチームを管理
**前提条件**:
- Role: `onsite_leader`
- チーム "Dev Team Alpha" のリーダー

**手順**:
1. チーム管理ページにアクセス
2. 自分のチームのみ表示されることを確認
3. 折りたたみメニューを展開
4. メンバーを追加
5. メンバーを削除

**期待結果**:
- ✅ 自分のチームのみ表示される
- ✅ 他のチームは表示されない
- ✅ メンバー追加・削除が正常に動作する
- ❌ チーム作成・削除ボタンは表示されない

---

#### TC-TEAM-002: GMがチームを作成・管理
**前提条件**:
- Role: `gm`
- 部署内に2つ以上のチーム

**手順**:
1. チーム管理ページにアクセス
2. 全チームが表示されることを確認
3. "チーム作成" ボタンをクリック
4. 新規チームを作成
5. オンサイトリーダーを割り当て

**期待結果**:
- ✅ 部署内の全チームが表示される
- ✅ チーム作成・編集・削除が可能
- ✅ リーダー割り当てが正常に動作する

---

### ユーザー管理 - リアルタイム更新テスト

#### TC-USER-001: 部署変更時の自動リフレッシュ
**前提条件**:
- ブラウザAとBで同時にユーザー管理ページを開く
- ユーザーAで部署名を変更

**手順**:
1. ブラウザA: 部署名を変更
2. ブラウザB: ユーザー管理ページを開いたまま待機
3. 15秒以内に自動更新されることを確認

**期待結果**:
- ✅ ブラウザBが15秒以内に自動更新される
- ✅ 変更後の部署名が表示される
- ❌ ローディング表示は出ない (サイレント更新)

---

#### TC-USER-002: タブ切り替え時の即時更新
**前提条件**:
- ユーザー管理ページを開く
- 別タブに切り替え
- バックグラウンドで部署名を変更

**手順**:
1. ユーザー管理タブを開く
2. 別タブに切り替え (Gmail, etc.)
3. 別の方法で部署名を変更 (API直接 or 別ブラウザ)
4. ユーザー管理タブに戻る

**期待結果**:
- ✅ タブに戻った瞬間に最新データが取得される
- ✅ `visibilitychange` イベントが正常に動作する

---

## テストデータセットアップ / Test Data Setup

### 推奨テストユーザー構成

```javascript
// 部署: VTI Nagoya
// GM: gm1 / gm1

// チーム: Dev Team Alpha
// Onsite Leader: leader1 / leader1
// Members: member1, member2, member3

// チーム: Dev Team Beta
// Onsite Leader: leader2 / leader2
// Members: member4, member5

// 他部署: VTI Tokyo
// GM: gm2 / gm2
// Members: tokyo1, tokyo2

// 全社管理
// BOD: bod / bod
// Admin: admin / admin
```

### テストデータ作成スクリプト

```bash
# ユーザー作成
node backend/create-test-users.js

# 週次報告サンプルデータ
node backend/seed-weekly-reports.js

# 部署・チーム構成
node backend/setup-test-departments.js
```

---

## 回帰テスト チェックリスト / Regression Test Checklist

新機能追加時、以下を必ず確認:

### ✅ 週次報告管理
- [ ] ユーザーが自分の報告を作成・編集できる
- [ ] Onsite Leaderがチームメンバーの報告を閲覧できる (3週間のみ)
- [ ] GMが部署全体の報告を閲覧できる (無制限)
- [ ] BOD/Adminが全社データを閲覧できる
- [ ] 提出済み報告が "提出済" と正しく表示される
- [ ] 未提出報告が "未提出" と正しく表示される
- [ ] Excel出力が正常に動作する
- [ ] 過去データ読み込みが正常に動作する (GM以上のみ)

### ✅ 部署管理
- [ ] 部署名変更時にユーザー情報が自動更新される
- [ ] CASCADE UPDATEが正常に動作する
- [ ] Fuzzy matchingが動作する (大文字小文字・スペース)
- [ ] データ整合性チェックツールが正常に動作する

### ✅ チーム管理
- [ ] Onsite Leaderが自分のチームのみ管理できる
- [ ] GMが全チームを管理できる
- [ ] メンバー追加・削除が正常に動作する
- [ ] 折りたたみメニューが正常に動作する

### ✅ ユーザー管理
- [ ] 15秒ごとの自動更新が動作する
- [ ] タブ切り替え時の即時更新が動作する
- [ ] 手動更新ボタンが動作する
- [ ] 部署名変更が即座に反映される

---

## パフォーマンス要件 / Performance Requirements

### 週次報告管理
- 初期ロード: < 2秒 (100ユーザー)
- メンバー一覧表示: < 3秒 (3週間、100ユーザー)
- 過去データ読み込み: < 2秒 (+4週間)
- Excel出力: < 5秒 (52週間、100ユーザー)

### データベースクエリ
- メンバー取得: < 500ms
- 報告取得: < 500ms
- CASCADE UPDATE: < 1秒 (100ユーザー)

---

## セキュリティ要件 / Security Requirements

### 権限チェック
- ✅ 全APIエンドポイントでroleベースの権限チェック
- ✅ フロントエンドとバックエンドの両方で検証
- ✅ 不正アクセス時は403エラーを返す

### データ隔離
- ✅ Onsite Leaderは他チームのデータにアクセスできない
- ✅ GMは他部署のデータにアクセスできない
- ✅ 一般ユーザーは他人のデータにアクセスできない

---

## 変更履歴 / Change Log

### 2026-01-05
- ✅ 週次報告管理: タイムゾーンバグ修正 (Issue #6)
- ✅ 週次報告管理: パフォーマンス最適化 (lazy loading)
- ✅ 週次報告管理: Onsite Leader権限を3週間に制限
- ✅ 部署管理: CASCADE UPDATE実装
- ✅ 部署管理: Fuzzy matching実装
- ✅ ユーザー管理: リアルタイム更新実装 (polling + visibility detection)
- ✅ 週次報告管理: メンバー一覧タブの権限拡張 (onsite_leader, gm, bod, admin)
- ✅ 週次報告管理: AI Overview生成機能のフェイルオーバー実装 (Claude AI → Gemini AI)
- ✅ 設計仕様書作成 (このファイル)

---

## 今後の改善項目 / Future Improvements

### 🔜 優先度: 高
- [ ] タイムシート管理機能の実装
- [ ] 週次報告のリマインダー通知最適化
- [ ] Excel出力のテンプレートカスタマイズ機能

### 🔜 優先度: 中
- [ ] 週次報告の承認ワークフロー
- [ ] ダッシュボード: 提出率グラフ
- [ ] メンバー詳細モーダルのパフォーマンス改善

### 🔜 優先度: 低
- [ ] 週次報告のテンプレート機能
- [ ] AI生成Overviewの精度向上
- [ ] 多言語対応 (英語・ベトナム語)

---

**Last Updated**: 2026-01-05
**Document Version**: 1.0
**Maintainer**: Development Team
