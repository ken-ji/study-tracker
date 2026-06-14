import { getSubjects, getSessions } from '../storage.js';
import * as charts from '../charts.js';

export function render() {
  charts.destroyAll();

  const section = document.getElementById('dashboard');
  const subjects = getSubjects();
  const sessions = getSessions();
  const todayMin = calcTodayMinutes(sessions);
  const weekMin = calcWeekMinutes(sessions);
  const hasSessions = sessions.length > 0;
  const weekData = hasSessions ? calcWeeklyData(sessions) : null;
  const subjectData = hasSessions ? calcSubjectData(sessions, subjects) : null;

  section.innerHTML = buildPage(todayMin, weekMin, hasSessions, subjectData);

  if (weekData) {
    charts.renderBarChart('chart-weekly', weekData.labels, weekData.values);
  }
  if (subjectData && subjectData.values.length > 0) {
    charts.renderPieChart('chart-subjects', subjectData.labels, subjectData.values, subjectData.colors);
  }
}

function buildPage(todayMin, weekMin, hasSessions, subjectData) {
  const weekChartHtml = hasSessions
    ? `<canvas id="chart-weekly" class="dashboard-canvas"></canvas>`
    : `<div class="empty-state">
        <div class="empty-state-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        <p class="empty-state-title">記録がありません</p>
        <p class="empty-state-desc">学習を記録するとグラフが表示されます</p>
      </div>`;

  const hasSubjectData = subjectData && subjectData.values.length > 0;
  const pieChartHtml = hasSubjectData
    ? `<canvas id="chart-subjects" class="dashboard-canvas"></canvas>`
    : `<div class="empty-state">
        <div class="empty-state-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.21 15.89A10 10 0 118 2.83"/><path d="M22 12A10 10 0 0012 2v10z"/>
          </svg>
        </div>
        <p class="empty-state-title">記録がありません</p>
        <p class="empty-state-desc">学習を記録するとグラフが表示されます</p>
      </div>`;

  return `<h1 class="page-title">ホーム</h1>

<div class="dashboard-stats">
  <div class="stat-card">
    <p class="stat-label">今日の学習時間</p>
    <p class="stat-value">${formatMinutes(todayMin)}</p>
  </div>
  <div class="stat-card">
    <p class="stat-label">今週の学習時間</p>
    <p class="stat-value">${formatMinutes(weekMin)}</p>
  </div>
</div>

<div class="dashboard-charts">
  <section class="dashboard-chart-section">
    <h2 class="section-heading">今週の学習時間</h2>
    ${weekChartHtml}
  </section>

  <section class="dashboard-chart-section">
    <h2 class="section-heading">科目別割合</h2>
    ${pieChartHtml}
  </section>
</div>`;
}

function calcTodayMinutes(sessions) {
  const today = todayString();
  return sessions
    .filter(s => s.date === today)
    .reduce((sum, s) => sum + s.durationMinutes, 0);
}

function calcWeekMinutes(sessions) {
  const weekSet = new Set(getWeekDates());
  return sessions
    .filter(s => weekSet.has(s.date))
    .reduce((sum, s) => sum + s.durationMinutes, 0);
}

function calcWeeklyData(sessions) {
  const dates = getWeekDates();
  const minutesByDate = Object.fromEntries(dates.map(d => [d, 0]));
  sessions.forEach(s => {
    if (s.date in minutesByDate) minutesByDate[s.date] += s.durationMinutes;
  });
  return {
    labels: ['月', '火', '水', '木', '金', '土', '日'],
    values: dates.map(d => minutesByDate[d]),
  };
}

function calcSubjectData(sessions, subjects) {
  const minutesById = Object.fromEntries(subjects.map(s => [s.id, 0]));
  sessions.forEach(s => {
    if (s.subjectId in minutesById) minutesById[s.subjectId] += s.durationMinutes;
  });
  const active = subjects.filter(s => minutesById[s.id] > 0);
  return {
    labels: active.map(s => s.name),
    values: active.map(s => minutesById[s.id]),
    colors: active.map(s => s.color),
  };
}

function getWeekDates() {
  const today = new Date();
  const daysSinceMonday = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysSinceMonday);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return dateToString(d);
  });
}

function formatMinutes(total) {
  if (total === 0) return '0分';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

function todayString() {
  return dateToString(new Date());
}

function dateToString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
