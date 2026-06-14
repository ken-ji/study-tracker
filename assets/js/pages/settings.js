import { exportAll, importAll, clearAll, getStorageSize } from '../storage.js';

const MAX_STORAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export function render() {
  const section = document.getElementById('settings');
  const usageBytes = getStorageSize();
  section.innerHTML = buildPage(usageBytes);
  attachEvents(section);
}

function buildPage(usageBytes) {
  const usageLabel = formatBytes(usageBytes);
  const pct = Math.min((usageBytes / MAX_STORAGE_BYTES) * 100, 100);
  const barColor = pct >= 80 ? '#DC2626' : 'var(--color-primary)';

  return `<h1 class="page-title">設定</h1>

<section class="settings-section">
  <h2 class="section-heading">ストレージ</h2>
  <div class="settings-card">
    <div class="settings-storage-row">
      <span class="settings-storage-label">使用量</span>
      <span class="settings-storage-value">${usageLabel} / 5 MB</span>
    </div>
    <div class="settings-bar">
      <div class="settings-bar-fill" style="width:${pct.toFixed(2)}%;background:${barColor}"></div>
    </div>
  </div>
</section>

<section class="settings-section">
  <h2 class="section-heading">データ管理</h2>
  <div class="settings-card">
    <div class="settings-action-item">
      <div class="settings-action-info">
        <p class="settings-action-title">データをエクスポート</p>
        <p class="settings-action-desc">全データを JSON ファイルとして保存します</p>
      </div>
      <button type="button" class="btn-secondary" id="btn-export">エクスポート</button>
    </div>
    <div class="settings-action-item">
      <div class="settings-action-info">
        <p class="settings-action-title">データをインポート</p>
        <p class="settings-action-desc">JSON ファイルから復元します（全データが上書きされます）</p>
      </div>
      <button type="button" class="btn-secondary" id="btn-import">インポート</button>
    </div>
    <div class="settings-action-item">
      <div class="settings-action-info">
        <p class="settings-action-title">全データを削除</p>
        <p class="settings-action-desc">すべての学習記録と科目を削除します</p>
      </div>
      <button type="button" class="btn-danger" id="btn-clear">削除</button>
    </div>
  </div>
  <p class="settings-message" aria-live="polite"></p>
</section>

<input type="file" id="file-import" accept=".json" class="sr-only">`;
}

function attachEvents(section) {
  section.querySelector('#btn-export').addEventListener('click', () => {
    const json = exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-tracker-${todayString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showMessage(section, 'エクスポートしました', 'success');
  });

  section.querySelector('#btn-import').addEventListener('click', () => {
    section.querySelector('#file-import').click();
  });

  section.querySelector('#file-import').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      if (!window.confirm('インポートするとすべてのデータが上書きされます。続けますか？')) {
        e.target.value = '';
        return;
      }
      try {
        importAll(evt.target.result);
      } catch (err) {
        showMessage(section, err.message, 'error');
        e.target.value = '';
        return;
      }
      render();
      showMessage(document.getElementById('settings'), 'インポートが完了しました', 'success');
    };
    reader.readAsText(file);
  });

  section.querySelector('#btn-clear').addEventListener('click', () => {
    if (!window.confirm('すべての学習データを削除しますか？')) return;
    if (!window.confirm('この操作は元に戻せません。本当に削除しますか？')) return;
    clearAll();
    render();
    showMessage(document.getElementById('settings'), 'データを削除しました', 'success');
  });
}

function showMessage(section, text, type) {
  const el = section.querySelector('.settings-message');
  if (!el) return;
  el.textContent = text;
  el.className = `settings-message settings-message-${type}`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
