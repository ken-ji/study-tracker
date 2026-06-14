import { getSubjects, getSessions, deleteSession } from '../storage.js';

export function render() {
  const section = document.getElementById('history');
  const subjects = getSubjects();
  const subjectMap = new Map(subjects.map(s => [s.id, s]));
  const sessions = getSessions().slice().sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.createdAt.localeCompare(a.createdAt);
  });

  section.innerHTML = buildPage(sessions, subjectMap);
  attachEvents(section);
}

function buildPage(sessions, subjectMap) {
  const listHtml = sessions.length === 0
    ? `<div class="empty-state">
        <div class="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </div>
        <p class="empty-state-title">記録がありません</p>
        <p class="empty-state-desc">記録画面からタイマーや手動入力で学習を記録しましょう</p>
        <a href="#record" class="btn-primary empty-state-action">記録する</a>
      </div>`
    : sessions.map(s => buildCard(s, subjectMap)).join('');

  return `<h1 class="page-title">履歴</h1>
<div class="history-list">${listHtml}</div>`;
}

function buildCard(session, subjectMap) {
  const subject = subjectMap.get(session.subjectId);
  const color = subject ? subject.color : '#9CA3AF';
  const name = subject ? escapeHtml(subject.name) : '削除済み科目';
  const date = formatDate(session.date);
  const duration = formatMinutes(session.durationMinutes);
  const note = session.note ? escapeHtml(session.note) : '';

  return `<div class="history-card">
  <div class="history-card-header">
    <div class="history-subject">
      <span class="history-subject-color" style="background-color:${color}"></span>
      <span class="history-subject-name">${name}</span>
    </div>
    <span class="history-date">${date}</span>
  </div>
  <div class="history-card-body">
    <div class="history-detail">
      <span class="history-duration">${duration}</span>
      ${note ? `<span class="history-note">${note}</span>` : ''}
    </div>
    <button type="button" class="btn-danger btn-delete"
      data-id="${session.id}"
      data-subject-name="${name}"
      data-date="${date}">削除</button>
  </div>
</div>`;
}

function attachEvents(section) {
  section.querySelector('.history-list').addEventListener('click', e => {
    const deleteBtn = e.target.closest('.btn-delete');
    if (!deleteBtn) return;

    const { id, subjectName, date } = deleteBtn.dataset;
    if (!window.confirm(`「${subjectName}」${date}の記録を削除しますか？`)) return;

    try {
      deleteSession(id);
    } catch {
      console.error('[history] deleteSession failed');
      return;
    }
    render();
  });
}

function formatDate(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}月${parseInt(d)}日`;
}

function formatMinutes(total) {
  if (total === 0) return '0分';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
