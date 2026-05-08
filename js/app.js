// 易経ビジュアライザー / Entry point
//
// このファイルは段階的に拡張する: 現時点ではタブ切替とデータロードの骨格のみ。
// 後続 issue で各セクションのレンダラを `sections/` 風に追加していく予定。

const state = {
  trigrams: [],
  hexagrams: [],
};

async function loadData() {
  const [trigrams, hexagrams] = await Promise.all([
    fetch('data/trigrams.json').then((r) => r.json()),
    fetch('data/hexagrams.json').then((r) => r.json()),
  ]);
  state.trigrams = trigrams;
  state.hexagrams = hexagrams;
}

function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const sections = document.querySelectorAll('.section');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => activate(tab.dataset.target));
    tab.addEventListener('keydown', (e) => {
      const order = Array.from(tabs);
      const i = order.indexOf(tab);
      if (e.key === 'ArrowRight') order[(i + 1) % order.length].focus();
      if (e.key === 'ArrowLeft')  order[(i - 1 + order.length) % order.length].focus();
    });
  });

  function activate(id) {
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.target === id)));
    sections.forEach((s) => s.classList.toggle('is-active', s.id === id));
    if (location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
  }

  // Honor URL hash on load
  const initial = location.hash.replace('#', '') || 'overview';
  if (document.getElementById(initial)) activate(initial);
}

async function main() {
  setupTabs();
  try {
    await loadData();
    // Hook for section renderers (added in later issues)
    document.dispatchEvent(new CustomEvent('eki:data-loaded', { detail: state }));
  } catch (err) {
    console.error('[eki] データロード失敗', err);
    document.querySelectorAll('.section__placeholder').forEach((el) => {
      el.textContent = 'データのロードに失敗しました。`python3 -m http.server` 経由で開いてください。';
    });
  }
}

document.addEventListener('DOMContentLoaded', main);

export { state };
