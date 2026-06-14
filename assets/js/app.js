import { init as routerInit } from './router.js';

let deferredPrompt = null;

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

function showInstallBanner() {
  if (document.getElementById('install-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'install-banner';
  banner.className = 'install-banner';
  banner.innerHTML = `
    <span class="install-banner-text">ホーム画面に追加して使いやすくなります</span>
    <div class="install-banner-actions">
      <button type="button" id="btn-install" class="btn-primary install-banner-btn">追加</button>
      <button type="button" id="btn-install-close" class="install-banner-close" aria-label="閉じる">×</button>
    </div>
  `;
  document.body.prepend(banner);

  document.getElementById('btn-install').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    hideInstallBanner();
  });

  document.getElementById('btn-install-close').addEventListener('click', () => {
    hideInstallBanner();
  });
}

function hideInstallBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) banner.remove();
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

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBanner();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  hideInstallBanner();
});
