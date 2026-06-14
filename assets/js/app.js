import { init as routerInit } from './router.js';

function checkStorage() {
  try {
    localStorage.setItem('_test', '1');
    localStorage.removeItem('_test');
    return true;
  } catch {
    return false;
  }
}

function showStorageWarning() {
  const banner = document.createElement('div');
  banner.id = 'storage-warning';
  banner.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0',
    'background:#E24A4A', 'color:#fff',
    'text-align:center', 'padding:8px', 'font-size:14px', 'z-index:9999',
  ].join(';');
  banner.textContent = 'ストレージが利用できないため、データは保存されません。';
  document.body.prepend(banner);
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').catch(e => {
    console.error('[app] SW 登録失敗:', e);
  });
}

// ── 起動 ────────────────────────────────────────────────────

if (!checkStorage()) {
  showStorageWarning();
}

routerInit();
registerSW();
