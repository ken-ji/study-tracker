const KEYS = {
  subjects:   'studyTracker_subjects',
  sessions:   'studyTracker_sessions',
  settings:   'studyTracker_settings',
  timerState: 'studyTracker_timerState',
};

const DEFAULTS = {
  subjects:   [],
  sessions:   [],
  settings:   { version: 1 },
  timerState: { subjectId: null, startedAt: null, elapsed: 0 },
};

// ── 内部ユーティリティ ───────────────────────────────────────

function _read(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function _write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // QuotaExceededError など — 呼び出し元でハンドリング
    throw e;
  }
}

// ── Getter ───────────────────────────────────────────────────

export function getSubjects() {
  return _read(KEYS.subjects, DEFAULTS.subjects);
}

export function getSessions() {
  return _read(KEYS.sessions, DEFAULTS.sessions);
}

export function getSettings() {
  return _read(KEYS.settings, DEFAULTS.settings);
}

export function getTimerState() {
  return _read(KEYS.timerState, DEFAULTS.timerState);
}

// ── Subject CRUD ─────────────────────────────────────────────

export function saveSubject(subject) {
  const list = getSubjects();
  const idx = list.findIndex(s => s.id === subject.id);
  if (idx >= 0) {
    list[idx] = subject;
  } else {
    list.push(subject);
  }
  _write(KEYS.subjects, list);
}

export function deleteSubject(id) {
  const list = getSubjects().filter(s => s.id !== id);
  _write(KEYS.subjects, list);
}

// ── Session CRUD ─────────────────────────────────────────────

export function saveSession(session) {
  const list = getSessions();
  const idx = list.findIndex(s => s.id === session.id);
  if (idx >= 0) {
    list[idx] = session;
  } else {
    list.push(session);
  }
  _write(KEYS.sessions, list);
}

export function deleteSession(id) {
  const list = getSessions().filter(s => s.id !== id);
  _write(KEYS.sessions, list);
}

// ── Settings / TimerState ────────────────────────────────────

export function saveSettings(settings) {
  _write(KEYS.settings, settings);
}

export function saveTimerState(timerState) {
  _write(KEYS.timerState, timerState);
}

// ── ユーティリティ ───────────────────────────────────────────

export function exportAll() {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    version:    getSettings().version,
    subjects:   getSubjects(),
    sessions:   getSessions(),
    settings:   getSettings(),
  });
}

export function importAll(json) {
  let data;

  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('JSONの形式が正しくありません');
  }

  if (typeof data.version === 'undefined') {
    throw new Error('バージョン情報がありません');
  }
  if (!Array.isArray(data.subjects) || !Array.isArray(data.sessions)) {
    throw new Error('subjects または sessions が配列ではありません');
  }

  const subjectFields = ['id', 'name', 'color', 'createdAt'];
  for (const s of data.subjects) {
    if (subjectFields.some(f => !(f in s))) {
      throw new Error('科目データに必須フィールドがありません');
    }
  }

  const sessionFields = ['id', 'subjectId', 'date', 'durationMinutes', 'note', 'createdAt'];
  for (const s of data.sessions) {
    if (sessionFields.some(f => !(f in s))) {
      throw new Error('セッションデータに必須フィールドがありません');
    }
  }

  clearAll();
  _write(KEYS.subjects,   data.subjects);
  _write(KEYS.sessions,   data.sessions);
  _write(KEYS.settings,   data.settings ?? DEFAULTS.settings);
}

export function clearAll() {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
}

export function getStorageSize() {
  return Object.values(KEYS).reduce((total, key) => {
    const item = localStorage.getItem(key);
    return total + (item ? new Blob([item]).size : 0);
  }, 0);
}
