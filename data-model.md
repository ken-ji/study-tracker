# データモデル設計

## LocalStorage キー一覧

| キー | 型 | 初期値 |
|------|----|--------|
| `studyTracker_subjects` | `Subject[]` | `[]` |
| `studyTracker_sessions` | `Session[]` | `[]` |
| `studyTracker_settings` | `Settings` | 下記参照 |
| `studyTracker_timerState` | `TimerState` | 下記参照 |

プレフィックス `studyTracker_` で他アプリとの衝突を回避する。

---

## 型定義

### Subject（科目）

```typescript
type Subject = {
  id: string;        // crypto.randomUUID() で生成
  name: string;      // 1〜20文字
  color: string;     // CSS カラーコード例: "#4A90E2"
  createdAt: string; // ISO 8601 UTC 例: "2026-06-13T00:00:00Z"
};
```

**バリデーション:**
- `name`: 空文字不可、20文字以内
- `color`: `#RRGGBB` 形式
- 同名科目の重複は許可（ユーザーの判断に委ねる）

---

### Session（学習セッション）

```typescript
type Session = {
  id: string;              // crypto.randomUUID()
  subjectId: string;       // Subject.id への参照
  date: string;            // "YYYY-MM-DD"（ローカル時刻基準）
  durationMinutes: number; // 整数、1 以上 1440 以下（1日24時間）
  note: string;            // 空文字可、200文字以内
  createdAt: string;       // ISO 8601 UTC
};
```

**バリデーション:**
- `subjectId`: 存在する Subject.id であること（削除された科目のセッションは孤立データとして保持し、表示時は「削除済み科目」と表示）
- `date`: `YYYY-MM-DD` フォーマット
- `durationMinutes`: 1〜1440 の整数

---

### Settings（アプリ設定）

```typescript
type Settings = {
  version: number; // データマイグレーション用。現在: 1
};
```

**初期値:**
```json
{ "version": 1 }
```

> Phase 2 でテーマ設定などを追加する際はここに追加し、`version` を上げてマイグレーション処理を行う。

---

### TimerState（タイマー状態）

```typescript
type TimerState = {
  subjectId: string | null; // null = タイマー未使用
  startedAt: string | null; // ISO 8601 UTC。null = 一時停止 or 停止中
  elapsed: number;          // 一時停止時点の経過秒数（再開時に加算）
};
```

**初期値:**
```json
{ "subjectId": null, "startedAt": null, "elapsed": 0 }
```

**状態遷移:**
```
停止中:     { subjectId: null,  startedAt: null, elapsed: 0 }
計測中:     { subjectId: "s1",  startedAt: "2026-...", elapsed: 0 }
一時停止:   { subjectId: "s1",  startedAt: null, elapsed: 120 }
```

タブを閉じて再度開いた場合、`startedAt` が非 null なら経過時間を `Date.now() - startedAt + elapsed` で復元する。

---

## ストレージ操作 API（storage.js の設計）

```javascript
// 読み込み
storage.getSubjects()   // Subject[]
storage.getSessions()   // Session[]
storage.getSettings()   // Settings
storage.getTimerState() // TimerState

// 書き込み
storage.saveSubject(subject)      // 追加 or 更新（id で判定）
storage.deleteSubject(id)         // 削除（関連セッションは孤立のまま残す）
storage.saveSession(session)      // 追加 or 更新
storage.deleteSession(id)
storage.saveSettings(settings)
storage.saveTimerState(timerState)

// ユーティリティ
storage.exportAll()   // { subjects, sessions, settings } の JSON 文字列
storage.importAll(json) // 上書きインポート（バリデーション後に保存）
storage.clearAll()    // 全キー削除
storage.getStorageSize() // 使用バイト数（概算）
```

---

## データの関連

```
Subject 1 ──< Session *
  id  ────────  subjectId
```

- Subject を削除してもそのセッションは削除しない（集計の整合性維持のため）
- 孤立セッション（`subjectId` が存在しない）は「削除済み科目」として表示
- Subject の `id` は不変（名前変更してもセッションの紐付けは維持される）

---

## サンプルデータ

```json
// studyTracker_subjects
[
  {
    "id": "11111111-0000-0000-0000-000000000001",
    "name": "英語",
    "color": "#4A90E2",
    "createdAt": "2026-06-01T00:00:00Z"
  },
  {
    "id": "11111111-0000-0000-0000-000000000002",
    "name": "数学",
    "color": "#E24A4A",
    "createdAt": "2026-06-01T00:00:00Z"
  }
]

// studyTracker_sessions
[
  {
    "id": "22222222-0000-0000-0000-000000000001",
    "subjectId": "11111111-0000-0000-0000-000000000001",
    "date": "2026-06-13",
    "durationMinutes": 45,
    "note": "単語帳 100 個",
    "createdAt": "2026-06-13T01:30:00Z"
  },
  {
    "id": "22222222-0000-0000-0000-000000000002",
    "subjectId": "11111111-0000-0000-0000-000000000002",
    "date": "2026-06-13",
    "durationMinutes": 30,
    "note": "",
    "createdAt": "2026-06-13T05:00:00Z"
  }
]

// studyTracker_settings
{ "version": 1 }

// studyTracker_timerState
{ "subjectId": null, "startedAt": null, "elapsed": 0 }
```

---

## export/import フォーマット

```json
{
  "exportedAt": "2026-06-13T10:00:00Z",
  "version": 1,
  "subjects": [ ...Subject[] ],
  "sessions": [ ...Session[] ],
  "settings": { ...Settings }
}
```

import 時のバリデーション:
1. `version` フィールドの存在確認
2. `subjects` / `sessions` が配列であること
3. 各要素に必須フィールドが存在すること
4. バリデーション通過後に全データを上書き保存

---

## ストレージ容量の目安

| データ | 1件あたり | 1000件 |
|--------|-----------|--------|
| Subject | ~120 bytes | ~120 KB |
| Session | ~180 bytes | ~180 KB |

LocalStorage の上限は一般に 5MB。毎日 10 セッション記録しても **約 2 年半** で上限に達する計算。警告は使用量が 4MB を超えたタイミングで表示する。
