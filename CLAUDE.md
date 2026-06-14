# CLAUDE.md — 学習トラッカー 開発ガイド

## 設計資料

実装前に必ず参照すること。設計資料はコードより優先する。

| ファイル | 内容 |
|---------|------|
| [requirements.md](requirements.md) | 機能要件・非機能要件・MVP スコープ定義（**最優先**） |
| [architecture.md](architecture.md) | モジュール構成・ルーティング・PWA・CSS 設計 |
| [data-model.md](data-model.md) | LocalStorage キー・型定義・storage.js API 設計 |
| [tasks.md](tasks.md) | 実装タスク一覧と完了基準 |

---

## プロジェクト概要

個人用学習管理 PWA。GitHub Pages で公開、サーバーレス、LocalStorage でデータ管理。

- **公開先**: GitHub Pages（静的ファイルのみ）
- **エントリポイント**: `index.html`
- **データ**: LocalStorage（`studyTracker_` プレフィックス）

---

## 開発ルール

### 仕様と実装の同期（最重要）

- **requirements.md を最優先とする**。仕様・アーキテクチャ・データモデルの順に従う
- 実装前に対象タスク ID を確認し、関連する設計資料の箇所を特定してから着手する
- 着手前に「何を・なぜ・どう実装するか」を説明してから実装を開始する
- requirements.md にない機能は実装しない。追加したい場合は先に requirements.md を更新して承認を得る
- 仕様の不明点・矛盾を発見した場合は、実装を止めて仕様を先に修正する
- 設計変更（requirements / architecture / data-model）はコード変更より先にコミットする

### ビルド・ツール

- ビルドツール（webpack / vite 等）は**使用しない**
- ES Modules（`<script type="module">`）をブラウザで直接読み込む
- npm / package.json は作成しない
- TypeScript は使用しない（型は JSDoc コメントで補完可）
- **新規ライブラリを追加する場合は、採用前に確認を取る**

### ファイル・パス

- 全リソースは **`./` 相対パス**で参照する（絶対パス `/` は GitHub Pages のサブパスで壊れる）
- `sw.js` と `manifest.json` は**リポジトリルート**に置く
- `assets/` 以下はモジュール・スタイル・アイコンのみ

### JavaScript

- `storage.js` は他モジュールに依存しない（最下層として扱う）
- 循環依存を作らない（依存方向: `pages/* → storage.js / timer.js / charts.js`）
- DOM 操作は各 `pages/*.js` に閉じる。`storage.js` は DOM に触れない
- グローバル変数を使わない。ES Modules のスコープで管理する
- `id` の生成は `crypto.randomUUID()` を使う

### CSS

- `style.css` 一枚構成。外部 CSS フレームワークは使用しない
- **スマホファースト**で記述し `@media (min-width: 768px)` で上書き
- テーマ変数は `:root {}` の CSS カスタムプロパティで定義する

### 命名規約

**JavaScript**
- 関数・変数: camelCase（例: `getSubjects`, `timerState`）
- 定数: UPPER_SNAKE_CASE（例: `CACHE_VERSION`, `MAX_NOTE_LENGTH`）
- 各ページモジュールの公開エントリポイント関数名は `render()` に統一する

**CSS クラス名**
- kebab-case（例: `.bottom-nav`, `.subject-card`, `.btn-primary`）
- ページ固有クラスはページ名をプレフィックスにする（例: `.record-timer`, `.dashboard-graph`）

**LocalStorage キー**
- 既存のプレフィックス `studyTracker_` を維持する
- 新しいキーを追加する場合は data-model.md に先に追記する

### データ

- LocalStorage への読み書きは必ず `storage.js` 経由で行う
- `localStorage.setItem` を `storage.js` の外で直接書いてはいけない
- Subject 削除時に Session を連鎖削除しない（孤立データとして保持）

### コメント

- なぜ書いたか（WHY）が非自明な箇所のみコメントを書く
- WHAT を説明するコメントは書かない
- Phase 2 の拡張が見えている箇所には `// TODO(phase2): <内容>` を残してよい

### エラーハンドリング

- LocalStorage 書き込みは `try/catch` でラップする（容量不足対策）
- ユーザー向けエラーはトースト通知で表示する
- `console.error` は残してよいが `console.log` はデバッグ後に削除する

### ブラウザ互換性

- 対応ブラウザ: Chrome 最新 / Safari（iOS 15.4+）/ Firefox 最新
- 新しいブラウザ API を使う前に MDN の互換性テーブルで対応状況を確認する
- ポリフィルは原則追加しない。IE・旧 Edge は対象外

---

## タスク管理

- 実装を進めたら `tasks.md` の該当チェックボックスを更新する
- フェーズ 0 → フェーズ 10 の順番に実装する（依存関係あり）
- **MVP 期間中は大規模リファクタを行わない**（動作を壊すリスクと scope creep を避けるため）

### タスク開始前の標準プロセス

各タスクの実装を開始する前に、以下を必ず提示してユーザーのレビュー承認を得ること。
承認が得られるまで実装を開始しない。

```
1. タスクの目的
2. 完了条件
3. 変更対象ファイル
4. 処理フロー
5. 手動テスト項目
6. requirements.md との整合性確認
7. architecture.md との整合性確認
8. data-model.md との整合性確認
```

### コミット規約

形式: `T-XXX: <変更内容の要約>`

```
T-010: storage.js の CRUD 操作を実装
T-030: 科目管理画面の追加・編集・削除を実装
docs: architecture.md のキャッシュ戦略を更新   ← 設計資料のみ変更の場合
```

### ローカルサーバーでのテスト（必須）

`file://` で直接開くと ES Modules・manifest.json が CORS エラーになる。
手動テストは **VS Code Live Server 拡張機能**を使うこと。

```
起動方法: index.html を右クリック → "Open with Live Server"
URL: http://127.0.0.1:5500/study-tracker/
ブラウザ: Microsoft Edge をデフォルトとする
```

手動テスト手順を提示する際は、上記 URL を使うよう明記すること。

**Live Server 起動時の既知の警告（無視してよい）:**
- `favicon.ico 404` — T-004 でアイコン配置時に解消
- `icon-192.png / icon-512.png 404` — T-004 完了まで出続ける（想定内）

### タスク完了の定義

コードを書いただけでは完了としない。以下を満たして初めて完了とする:

1. **ローカルサーバー経由**でブラウザを開いて目視確認した
2. スマホ幅（DevTools > 375px）でレイアウトが崩れていない
3. LocalStorage の読み書きが DevTools > Application で正しく確認できた
4. `tasks.md` のチェックボックスを更新した

PWA 関連タスク（T-080〜T-083）は追加で:
- DevTools > Network: Offline にしてリロードしても動作する
- Lighthouse の PWA 監査をパスしている

### タスク完了後の標準報告

タスク完了後は以下を必ず報告し、ユーザーのレビューを待つこと。
報告後は次のタスクへ自動的に進まない。

```
1. 実装内容サマリ
2. 変更ファイル一覧
3. 手動テスト手順
4. 推奨コミットメッセージ
5. requirements.md との差異有無
6. architecture.md との差異有無
```

---

## MVP スコープ外（実装しないこと）

- ユーザー認証・クラウド同期
- 複数デバイス間のリアルタイム同期
- ダークモード（Phase 2）
- 目標設定・進捗バー（Phase 2）
- カレンダーヒートマップ・ストリーク（Phase 2）
- プッシュ通知（Phase 2）

---

## GitHub 操作ルール

- `git push` は**ユーザーの明示的な指示があった場合のみ**実行する
- 実装完了後に push が必要な場合は「push してよいですか？」と確認を取る
- ユーザーが自分で push する場合は、実行すべきコマンドを提示するにとどめる

**作業ディレクトリについて:**
- ワークスペースルートは `d:\20_ClaudeCode`（シェルの起動ディレクトリ）
- `cd "d:/20_ClaudeCode/study-tracker"` は不要
- リポジトリ操作は `git -C "d:/20_ClaudeCode/study-tracker" <コマンド>` で行う

以下の**読み取り専用 Git コマンド**は確認不要で随時実行してよい（`&&` で組み合わせた場合も、`-C "d:/20_ClaudeCode/study-tracker"` と組み合わせた場合も含む）:
- `git status` — 変更状態の確認
- `git log` / `git log --oneline` — コミット履歴の確認
- `git diff` / `git diff --stat` — 差分の確認
- `git log --oneline origin/main` — Push 後のリモートとの比較
- 組み合わせ例（確認不要）:
  - `git -C "d:/20_ClaudeCode/study-tracker" status && git -C "d:/20_ClaudeCode/study-tracker" log --oneline`
  - `git -C "d:/20_ClaudeCode/study-tracker" log --oneline origin/main`

---

## デプロイ手順（要約）

1. GitHub リポジトリを作成し `main` ブランチにプッシュ
2. Settings > Pages > Source: `main` / `(root)` を選択して Save
3. 公開 URL: `https://<username>.github.io/<repo-name>/`
4. キャッシュ更新時は `sw.js` の `CACHE_VERSION` を上げてプッシュ

詳細は [architecture.md](architecture.md) の「GitHub Pages デプロイ構成」を参照。
