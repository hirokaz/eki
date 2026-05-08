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

// ============================================================
// Yin-Yang section: interactive 6-yao bit toggle
// ============================================================
function setupYinYang() {
  const stack = document.getElementById('yy-yao');
  if (!stack) return;
  // bits[0] = bottom (line 1), bits[5] = top (line 6)
  const bits = [0, 0, 0, 0, 0, 0];

  // Render six yao buttons; column-reverse means bits[0] visually at bottom
  bits.forEach((_, i) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'yao-large yin';
    el.setAttribute('aria-label', `第${i + 1}爻 (現在: 陰)`);
    el.dataset.idx = String(i);
    el.addEventListener('click', () => {
      bits[i] ^= 1;
      el.classList.toggle('yin', bits[i] === 0);
      el.setAttribute('aria-label', `第${i + 1}爻 (現在: ${bits[i] ? '陽' : '陰'})`);
      updateReadout();
    });
    stack.appendChild(el);
  });

  function updateReadout() {
    // Top → bottom display order = bits[5..0]
    const binTopDown = bits.slice().reverse().map((b) => b).join('');
    const dec = parseInt(binTopDown, 2);
    // Fuxi value: lower trigram = bits[2,1,0], upper = bits[5,4,3]
    const lower = bits[0] + bits[1] * 2 + bits[2] * 4;
    const upper = bits[3] + bits[4] * 2 + bits[5] * 4;
    const fuxi = upper * 8 + lower;
    const hex = state.hexagrams.find((h) => h.fuxi === fuxi);
    document.getElementById('yy-bin').textContent  = binTopDown;
    document.getElementById('yy-dec').textContent  = String(dec);
    document.getElementById('yy-fuxi').textContent = String(fuxi);
    if (hex) {
      document.getElementById('yy-kw').textContent   = String(hex.kw);
      document.getElementById('yy-sym').textContent  = hex.symbol;
      document.getElementById('yy-name').textContent = `${hex.name_zh} (${hex.name_jp})`;
    }
  }

  document.addEventListener('eki:data-loaded', updateReadout, { once: true });
}

async function main() {
  setupTabs();
  setupYinYang();
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
