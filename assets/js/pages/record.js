import { getSubjects, saveSession } from '../storage.js';
import * as timer from '../timer.js';

let tickId = null;

export function render() {
  clearInterval(tickId);
  tickId = null;

  const section = document.getElementById('record');
  const subjects = getSubjects();

  if (subjects.length === 0) {
    section.innerHTML = buildEmpty();
    return;
  }

  const state = timer.getState();
  section.innerHTML = buildPage(subjects, state);
  attachEvents(section);

  if (state.startedAt !== null) startTick(section);
}

function buildEmpty() {
  return `<h1 class="page-title">記録する</h1>
<div class="record-empty">
  <p class="record-empty-text">科目が登録されていません</p>
  <a href="#subjects" class="btn-primary record-empty-link">科目を登録する</a>
</div>`;
}

function buildSubjectOptions(subjects, selectedId) {
  return `<option value="">科目を選択</option>` +
    subjects.map(s => {
      const sel = s.id === selectedId ? ' selected' : '';
      return `<option value="${s.id}"${sel}>${escapeHtml(s.name)}</option>`;
    }).join('');
}

function buildPage(subjects, state) {
  const isRunning = state.startedAt !== null;
  const isPaused = !isRunning && state.elapsed > 0;
  const isStopped = !isRunning && !isPaused;

  const mainBtnLabel = isRunning ? '一時停止' : isPaused ? '再開' : '開始';
  const subjectDisabled = (isRunning || isPaused) ? ' disabled' : '';
  const resetDisabled = isStopped ? ' disabled' : '';

  return `<h1 class="page-title">記録する</h1>

<section class="record-timer-section">
  <h2 class="section-heading">タイマー</h2>
  <select class="record-select record-timer-subject"${subjectDisabled}>
    ${buildSubjectOptions(subjects, state.subjectId)}
  </select>
  <div class="record-timer-display">${formatTime(timer.getElapsedSeconds())}</div>
  <div class="record-timer-buttons">
    <button type="button" class="btn-primary btn-timer-main">${mainBtnLabel}</button>
    <button type="button" class="btn-secondary btn-timer-reset"${resetDisabled}>リセット</button>
  </div>
  ${isRunning || isPaused ? `<button type="button" class="btn-primary btn-timer-save">この時間を記録する</button>` : ''}
  <p class="form-error record-timer-error" aria-live="polite"></p>
</section>

<section class="record-manual-section">
  <h2 class="section-heading">手動で記録</h2>
  <div class="record-manual-form">
    <div class="record-field">
      <label class="record-label" for="manual-subject">科目</label>
      <select id="manual-subject" class="record-select">
        ${buildSubjectOptions(subjects, subjects[0].id)}
      </select>
      <p class="form-error" id="manual-subject-error" aria-live="polite"></p>
    </div>
    <div class="record-field">
      <label class="record-label" for="manual-date">日付</label>
      <input type="date" id="manual-date" class="subject-name-input" value="${todayString()}">
      <p class="form-error" id="manual-date-error" aria-live="polite"></p>
    </div>
    <div class="record-field">
      <label class="record-label" for="manual-duration">時間（分）</label>
      <input type="number" id="manual-duration" class="subject-name-input" min="1" max="1440" placeholder="例：45">
      <p class="form-error" id="manual-duration-error" aria-live="polite"></p>
    </div>
    <div class="record-field">
      <label class="record-label" for="manual-note">メモ（任意）</label>
      <textarea id="manual-note" class="record-textarea" maxlength="200" placeholder="学習内容など（200文字以内）"></textarea>
    </div>
    <button type="button" class="btn-primary btn-manual-save">保存</button>
  </div>
</section>`;
}

function attachEvents(section) {
  section.querySelector('.btn-timer-main').addEventListener('click', () => {
    const errorEl = section.querySelector('.record-timer-error');
    const state = timer.getState();
    const isRunning = state.startedAt !== null;
    const isPaused = !isRunning && state.elapsed > 0;

    if (isRunning) { timer.pause(); render(); return; }
    if (isPaused)  { timer.start(state.subjectId); render(); return; }

    const subjectId = section.querySelector('.record-timer-subject').value;
    if (!subjectId) { errorEl.textContent = '科目を選択してください'; return; }
    errorEl.textContent = '';
    timer.start(subjectId);
    render();
  });

  section.querySelector('.btn-timer-reset').addEventListener('click', () => {
    if (!window.confirm('タイマーをリセットしますか？')) return;
    timer.reset();
    render();
  });

  const saveTimerBtn = section.querySelector('.btn-timer-save');
  if (saveTimerBtn) {
    saveTimerBtn.addEventListener('click', () => {
      const errorEl = section.querySelector('.record-timer-error');
      const state = timer.getState();
      const isRunning = state.startedAt !== null;

      if (isRunning) timer.pause();

      const elapsed = timer.getElapsedSeconds();
      const durationMinutes = Math.floor(elapsed / 60);

      if (durationMinutes < 1) {
        errorEl.textContent = '1分未満の記録は保存できません';
        if (isRunning) timer.start(state.subjectId);
        return;
      }
      errorEl.textContent = '';

      const savedState = timer.getState();
      try {
        saveSession({
          id: crypto.randomUUID(),
          subjectId: savedState.subjectId,
          date: todayString(),
          durationMinutes,
          note: '',
          createdAt: new Date().toISOString(),
        });
      } catch {
        errorEl.textContent = 'ストレージへの保存に失敗しました';
        return;
      }
      timer.reset();
      render();
    });
  }

  section.querySelector('.btn-manual-save').addEventListener('click', () => {
    const subjectId = section.querySelector('#manual-subject').value;
    const date = section.querySelector('#manual-date').value;
    const durationRaw = section.querySelector('#manual-duration').value.trim();
    const note = section.querySelector('#manual-note').value;

    section.querySelector('#manual-subject-error').textContent = '';
    section.querySelector('#manual-date-error').textContent = '';
    section.querySelector('#manual-duration-error').textContent = '';

    let hasError = false;

    if (!subjectId) {
      section.querySelector('#manual-subject-error').textContent = '科目を選択してください';
      hasError = true;
    }
    if (!date) {
      section.querySelector('#manual-date-error').textContent = '日付を入力してください';
      hasError = true;
    }

    const durationMinutes = Number(durationRaw);
    if (!durationRaw || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) {
      section.querySelector('#manual-duration-error').textContent = '1〜1440の整数を入力してください';
      hasError = true;
    }

    if (hasError) return;

    try {
      saveSession({
        id: crypto.randomUUID(),
        subjectId,
        date,
        durationMinutes,
        note,
        createdAt: new Date().toISOString(),
      });
    } catch {
      section.querySelector('#manual-duration-error').textContent = 'ストレージへの保存に失敗しました';
      return;
    }
    render();
  });
}

function startTick(section) {
  tickId = setInterval(() => {
    const el = section.querySelector('.record-timer-display');
    if (!el) { clearInterval(tickId); return; }
    el.textContent = formatTime(timer.getElapsedSeconds());
  }, 1000);
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
