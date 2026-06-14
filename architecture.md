# アーキテクチャ設計

## システム概要

ビルドツールなしの静的 SPA。ES Modules を直接ブラウザで読み込み、GitHub Pages からそのまま配信する。

```
ブラウザ
  └── index.html（シェル）
        ├── ES Modules（assets/js/）
        ├── Service Worker（sw.js）
        └── LocalStorage（データ永続化）
```

---

## 技術選定の根拠

| 選定 | 理由 |
|------|------|
| Vanilla JS + ES Modules | ビルド不要、GitHub Pages に直デプロイ可能 |
| ハッシュルーティング（`#page`） | サーバー設定不要（GitHub Pages は 404 リダイレクト不可） |
| LocalStorage | サーバーレス要件、IndexedDB より API が単純でスキーマ管理しやすい |
| Chart.js（CDN） | グラフ描画の唯一の外部依存、SW でオフラインキャッシュ済み |
| CSS カスタムプロパティ | テーマ管理を JS なしで実現、ダークモード対応が容易 |

---

## モジュール構成

```
assets/js/
├── app.js          # エントリポイント。SW 登録・初期化・ルーター起動
├── router.js       # ハッシュ変化を監視し pages/* を呼び出す
├── storage.js      # LocalStorage の読み書きを一元管理するラッパー
├── timer.js        # タイマーのロジック（開始・停止・経過時間計算）
├── charts.js       # Chart.js インスタンスの生成・更新・破棄
│
└── pages/
    ├── dashboard.js   # 集計計算 + グラフ描画
    ├── record.js      # タイマー UI + 手動入力フォーム
    ├── history.js     # 一覧表示・削除
    ├── subjects.js    # 科目 CRUD + カラーピッカー
    └── settings.js    # export/import・ストレージ使用量表示
```

### モジュール依存関係

```
app.js
  ├── router.js
  │     └── pages/*.js
  │           ├── storage.js   ← 全 page が依存
  │           ├── timer.js     ← record.js のみ
  │           └── charts.js    ← dashboard.js のみ
  └── storage.js（初期化時）
```

- `storage.js` は他モジュールに依存しない（最下層）
- `timer.js` は `storage.js` のみに依存（タイマー状態の永続化）
- 循環依存は禁止

---

## SPA ルーティング

`index.html` に全画面の `<section>` を埋め込み、`router.js` が表示/非表示を切り替える。

```html
<!-- index.html の構造 -->
<body>
  <main>
    <section id="dashboard" class="page">...</section>
    <section id="record"    class="page">...</section>
    <section id="history"   class="page">...</section>
    <section id="subjects"  class="page">...</section>
    <section id="settings"  class="page">...</section>
  </main>
  <nav id="bottom-nav">...</nav>
</body>
```

```javascript
// router.js の動作
window.addEventListener('hashchange', () => {
  const page = location.hash.slice(1) || 'dashboard';
  // .page を全非表示 → 対象 section のみ表示
  // 各 page モジュールの render() を呼び出す
});
```

デフォルトハッシュ: `#dashboard`

---

## PWA アーキテクチャ

### Service Worker キャッシュ戦略

| リソース | 戦略 | 理由 |
|---------|------|------|
| HTML / CSS / JS（自前） | Cache First | 変更頻度低、オフライン必須 |
| Chart.js（CDN） | Cache First | 外部リソースのオフライン対応 |
| アイコン画像 | Cache First | 変更なし |

```
sw.js の動作フロー:
  install  → 全静的ファイルを precache
  activate → 古いキャッシュを削除
  fetch    → Cache First で応答（キャッシュなければネットワーク）
```

### キャッシュバージョン管理

```javascript
const CACHE_VERSION = 'v1';
// デプロイ時に v2, v3 ... と上げてキャッシュを更新する
```

### manifest.json

```json
{
  "name": "学習トラッカー",
  "short_name": "StudyLog",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4A90E2",
  "icons": [
    { "src": "assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## CSS アーキテクチャ

`style.css` 一枚構成。セクション分割はコメントで管理。

```css
/* 構造 */
/* 1. CSS カスタムプロパティ（テーマ変数） */
/* 2. リセット・ベーススタイル            */
/* 3. レイアウト（シェル・ナビ）          */
/* 4. 各ページ共通コンポーネント          */
/* 5. ページ固有スタイル                  */
/* 6. ユーティリティ                      */
```

### ブレークポイント

| 名前 | 幅 | 対象 |
|------|-----|------|
| base | 375px〜 | スマホ（デフォルト） |
| md   | 768px〜 | タブレット |
| lg   | 1024px〜 | PC |

スマホファーストで記述し、`@media (min-width: 768px)` で上書き。

---

## GitHub Pages デプロイ構成

```
リポジトリルート = 公開ルート
  → ビルドステップなし
  → main ブランチへの push で即時反映（Pages 設定後）

公開 URL: https://<username>.github.io/<repo-name>/
```

### パス解決の注意点

- 全リソースパスは `./` 相対パスで記述（絶対パス `/` は GitHub Pages のサブパスで壊れる）
- `manifest.json` の `start_url` は `"./"` にする
- SW 登録スコープはデフォルト（`./sw.js` と同階層）

---

## エラーハンドリング方針

| 状況 | 対処 |
|------|------|
| LocalStorage が利用不可 | 起動時に検出し、画面上部にバナー警告を表示。機能は制限なし（書き込み失敗は無視） |
| LocalStorage 容量不足 | 書き込み前に `try/catch` で捕捉し、トースト通知 |
| 科目が 0 件で記録画面を開く | 「科目を登録してください」のガイダンスと科目管理への誘導リンクを表示 |
| Chart.js CDN 読み込み失敗（オフライン初回） | SW キャッシュ済みなら問題なし。未キャッシュ時はグラフ非表示＋メッセージ |
