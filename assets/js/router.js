const PAGES = ['dashboard', 'record', 'history', 'subjects', 'settings'];
const DEFAULT_PAGE = 'dashboard';

async function navigate(pageId) {
  const target = PAGES.includes(pageId) ? pageId : DEFAULT_PAGE;

  document.querySelectorAll('.page').forEach(section => {
    section.classList.toggle('active', section.id === target);
  });

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === target);
  });

  try {
    const module = await import(`./pages/${target}.js`);
    if (typeof module.render === 'function') {
      module.render();
    }
  } catch (e) {
    console.error(`[router] render error on ${target}:`, e);
  }
}

function onHashChange() {
  const pageId = location.hash.slice(1) || DEFAULT_PAGE;
  navigate(pageId);
}

export function init() {
  window.addEventListener('hashchange', onHashChange);
  onHashChange();
}
