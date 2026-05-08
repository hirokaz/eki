// 易経ビジュアライザー / Entry point
//
// このファイルは段階的に拡張する: 現時点ではタブ切替とデータロードの骨格のみ。
// 後続 issue で各セクションのレンダラを `sections/` 風に追加していく予定。

const state = {
  trigrams: [],
  hexagrams: [],
};

async function loadData() {
  const [trigrams, hexagrams, worldview, applications, figures, disciplines, diagnose, curriculum, sequence, deep, cases, wuxing] = await Promise.all([
    fetch('data/trigrams.json').then((r) => r.json()),
    fetch('data/hexagrams.json').then((r) => r.json()),
    fetch('data/worldview.json').then((r) => r.json()),
    fetch('data/applications.json').then((r) => r.json()),
    fetch('data/figures.json').then((r) => r.json()),
    fetch('data/disciplines.json').then((r) => r.json()),
    fetch('data/diagnose.json').then((r) => r.json()),
    fetch('data/curriculum.json').then((r) => r.json()),
    fetch('data/sequence.json').then((r) => r.json()),
    fetch('data/hexagrams-deep.json').then((r) => r.json()),
    fetch('data/cases.json').then((r) => r.json()),
    fetch('data/wuxing.json').then((r) => r.json()),
  ]);
  // Merge deep info into hexagrams by kw
  const deepByKw = Object.fromEntries(deep.map((d) => [d.kw, d]));
  hexagrams.forEach((h) => {
    const d = deepByKw[h.kw];
    if (d) h.deep = { image: d.image, modern: d.modern, key_question: d.key_question };
  });
  state.trigrams = trigrams;
  state.hexagrams = hexagrams;
  state.worldview = worldview;
  state.applications = applications;
  state.figures = figures;
  state.disciplines = disciplines;
  state.diagnose = diagnose;
  state.curriculum = curriculum;
  state.sequence = sequence;
  state.cases = cases;
  state.wuxing = wuxing;
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
    const cur = parseHash();
    if (cur.section !== id) {
      history.replaceState(null, '', `#${id}`);
    }
  }

  // Expose for deep-linking
  window._ekiActivate = activate;

  // Initial routing handled later (after data loads) via routeFromHash()
  const initial = parseHash();
  if (initial.section && document.getElementById(initial.section)) {
    activate(initial.section);
  } else {
    activate('overview');
  }
}

// ============================================================
// Deep linking (#40)
// ============================================================
// Hash format:
//   #<section>                — top of section
//   #<section>/<itemId>       — section + item (e.g., #hexagrams/11, #worldview/jichu, #cases/B05)
function parseHash() {
  const raw = (location.hash || '').replace(/^#/, '');
  if (!raw) return { section: null, item: null };
  const [section, ...rest] = raw.split('/');
  const item = rest.join('/') || null;
  return { section, item };
}

function setHash(section, item) {
  const hash = item ? `#${section}/${item}` : `#${section}`;
  if (location.hash !== hash) history.replaceState(null, '', hash);
}

function routeFromHash() {
  const { section, item } = parseHash();
  if (!section) return;
  if (typeof window._ekiActivate === 'function') window._ekiActivate(section);
  if (!item) return;
  // Route to specific item per section
  switch (section) {
    case 'hexagrams': {
      const kw = Number(item);
      const h = state.hexagrams.find((x) => x.kw === kw);
      if (h) {
        showHexDetail(state.trigrams, h);
        document.getElementById('hex-detail')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      break;
    }
    case 'worldview': {
      // Find the card by id, scroll into view
      const cards = document.querySelectorAll('.wv-card');
      const idx = (state.worldview || []).findIndex((p) => p.id === item);
      if (idx >= 0 && cards[idx]) cards[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
      break;
    }
    case 'cases': {
      const c = (state.cases || []).find((x) => x.id === item);
      if (!c) break;
      // Switch sub-cat to the case's category
      const tab = document.querySelector(`#case-cat .seg__btn[data-cat="${c.category}"]`);
      if (tab) tab.click();
      // Scroll to card
      setTimeout(() => {
        const target = Array.from(document.querySelectorAll('#case-cards .case-card .head .id'))
          .find((el) => el.textContent === c.id)?.closest('.case-card');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 80);
      break;
    }
    case 'applications': {
      // Filter by category if item matches a category
      if (['life','business','relationships'].includes(item)) {
        const tab = document.querySelector(`#app-subtabs .seg__btn[data-cat="${item}"]`);
        if (tab) tab.click();
      }
      break;
    }
    case 'legacy': {
      if (['figures','disciplines'].includes(item)) {
        const tab = document.querySelector(`#leg-subtabs .seg__btn[data-cat="${item}"]`);
        if (tab) tab.click();
      }
      break;
    }
    case 'trigrams': {
      const id = Number(item);
      const t = state.trigrams.find((x) => x.id === id);
      if (t) showTrigDetail(t);
      break;
    }
  }
}

window.addEventListener('popstate', routeFromHash);
window.addEventListener('hashchange', routeFromHash);

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

// ============================================================
// Trigrams section
// ============================================================
const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}, children = []) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const c of children) el.appendChild(c);
  return el;
}

function renderYaoSvg(lines, opts = {}) {
  // lines: [bottom, middle, top] of 0/1
  const w = opts.width  || 60;
  const h = opts.height || 8;
  const gap = opts.gap || 4;
  const totalH = h * 3 + gap * 2;
  const svg = svgEl('svg', {
    xmlns: SVG_NS, viewBox: `0 0 ${w} ${totalH}`,
    width: w, height: totalH, role: 'img',
  });
  // Render top→bottom for SVG (line index 2 = top → y=0)
  for (let visualRow = 0; visualRow < 3; visualRow++) {
    const lineIdx = 2 - visualRow; // top first
    const y = visualRow * (h + gap);
    if (lines[lineIdx] === 1) {
      svg.appendChild(svgEl('rect', { x: 0, y, width: w, height: h, rx: 1.5, fill: 'var(--yang)' }));
    } else {
      const seg = w * 0.42;
      svg.appendChild(svgEl('rect', { x: 0, y, width: seg, height: h, rx: 1.5, fill: 'var(--yin)' }));
      svg.appendChild(svgEl('rect', { x: w - seg, y, width: seg, height: h, rx: 1.5, fill: 'var(--yin)' }));
    }
  }
  return svg;
}

function setupTrigrams(trigrams) {
  const grid = document.getElementById('trig-cards');
  if (!grid) return;
  grid.innerHTML = '';
  // Display order: by binary id ascending (0 → 7)
  const ordered = [...trigrams].sort((a, b) => a.id - b.id);
  ordered.forEach((t) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'trig-card';
    card.dataset.id = String(t.id);
    card.setAttribute('aria-label', `${t.name_zh} (${t.name_en})`);

    const sym = document.createElement('div');
    sym.className = 'trig-card__symbol';
    sym.textContent = t.symbol;
    card.appendChild(sym);

    const yao = renderYaoSvg(t.lines, { width: 60, height: 7, gap: 5 });
    card.appendChild(yao);

    const name = document.createElement('div');
    name.className = 'trig-card__name';
    name.textContent = t.name_zh;
    card.appendChild(name);

    const nat = document.createElement('div');
    nat.className = 'trig-card__nat';
    nat.textContent = `${t.natural} / ${t.name_en}`;
    card.appendChild(nat);

    const bin = document.createElement('div');
    bin.className = 'trig-card__bin';
    bin.textContent = `bin ${t.binary} · dec ${t.id}`;
    card.appendChild(bin);

    card.addEventListener('click', () => showTrigDetail(t));
    grid.appendChild(card);
  });

  setupBagua(trigrams);
  setupTrigCounter(trigrams);
  // Auto-show first trigram (Earth = 0) detail
  showTrigDetail(ordered[0]);
}

function showTrigDetail(t) {
  const card = document.getElementById('trig-detail');
  if (!card) return;
  card.hidden = false;
  setHash('trigrams', String(t.id));
  document.getElementById('trig-detail-symbol').textContent = t.symbol;
  document.getElementById('trig-detail-title').textContent  = `${t.name_zh} ─ ${t.name_en}`;
  document.getElementById('trig-detail-sub').textContent    = `読み: ${t.name_jp} ・ 二進: ${t.binary} (${t.id}) ・ 自然象: ${t.natural}`;
  const grid = document.getElementById('trig-detail-grid');
  grid.innerHTML = '';
  const fields = [
    ['属性', t.attribute],
    ['家族', t.family],
    ['方位', t.direction],
    ['季節', t.season],
    ['身体', t.body],
    ['爻配列', t.lines.slice().reverse().map((b) => b ? '─' : '⚋').join(' / ')],
  ];
  for (const [k, v] of fields) {
    const wrap = document.createElement('div');
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    wrap.appendChild(dt); wrap.appendChild(dd);
    grid.appendChild(wrap);
  }
  document.getElementById('trig-detail-summary').textContent = t.summary;

  // Highlight selected card
  document.querySelectorAll('.trig-card').forEach((c) => {
    c.classList.toggle('is-selected', Number(c.dataset.id) === t.id);
  });
}

// 先天八卦 (Fuxi) 円配置: 上から時計回りに 7,3,5,1,0,4,2,6
function setupBagua(trigrams) {
  const wrap = document.getElementById('bagua-svg');
  if (!wrap) return;
  wrap.innerHTML = '';
  const order = [7, 3, 5, 1, 0, 4, 2, 6]; // clockwise from top
  const byId = Object.fromEntries(trigrams.map((t) => [t.id, t]));

  const size = 360;
  const cx = 0, cy = 0;
  const R = 120;
  const svg = svgEl('svg', {
    xmlns: SVG_NS, viewBox: `${-size/2} ${-size/2} ${size} ${size}`,
    width: '100%', height: '100%',
  });

  // Center taiji-like circle
  svg.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 30, fill: 'none', stroke: 'var(--gold)', 'stroke-width': 1, opacity: 0.5 }));
  svg.appendChild(svgEl('circle', { cx: 0, cy: 0, r: R + 30, fill: 'none', stroke: 'var(--line)', 'stroke-width': 1 }));

  order.forEach((id, idx) => {
    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / 8; // start at top
    const x = cx + R * Math.cos(angle);
    const y = cy + R * Math.sin(angle);
    const t = byId[id];
    const g = svgEl('g', { transform: `translate(${x},${y})`, class: 'bagua-node' });

    // Yao lines (small)
    const yaoG = svgEl('g', { transform: 'translate(-26, -36)' });
    const lh = 4, gap = 3, lw = 52;
    for (let v = 0; v < 3; v++) {
      const li = 2 - v;
      const yy = v * (lh + gap);
      if (t.lines[li] === 1) {
        yaoG.appendChild(svgEl('rect', { x: 0, y: yy, width: lw, height: lh, rx: 1, fill: 'var(--gold)' }));
      } else {
        yaoG.appendChild(svgEl('rect', { x: 0, y: yy, width: lw * 0.42, height: lh, rx: 1, fill: 'var(--yin)' }));
        yaoG.appendChild(svgEl('rect', { x: lw * 0.58, y: yy, width: lw * 0.42, height: lh, rx: 1, fill: 'var(--yin)' }));
      }
    }
    g.appendChild(yaoG);

    const nameTxt = svgEl('text', { x: 0, y: 18, 'text-anchor': 'middle', class: 'bg-name' });
    nameTxt.textContent = t.name_zh;
    g.appendChild(nameTxt);

    const binTxt = svgEl('text', { x: 0, y: 32, 'text-anchor': 'middle', class: 'bg-bin' });
    binTxt.textContent = `${t.binary} (${t.id})`;
    g.appendChild(binTxt);

    // Connection line to opposite (drawn once: only when idx < 4)
    if (idx < 4) {
      const oppIdx = (idx + 4) % 8;
      const a2 = -Math.PI / 2 + (oppIdx * 2 * Math.PI) / 8;
      const x2 = R * Math.cos(a2), y2 = R * Math.sin(a2);
      svg.insertBefore(svgEl('line', { x1: x, y1: y, x2, y2, class: 'bagua-line', 'stroke-dasharray': '2 4', opacity: 0.35 }), svg.firstChild);
    }

    svg.appendChild(g);
  });

  wrap.appendChild(svg);
}

function setupTrigCounter(trigrams) {
  const root = document.getElementById('trig-counter');
  if (!root) return;
  root.innerHTML = '';
  const byId = Object.fromEntries(trigrams.map((t) => [t.id, t]));
  for (let i = 0; i < 8; i++) {
    const t = byId[i];
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.id = String(i);
    cell.innerHTML = `<span class="sym">${t.symbol}</span><span class="num">${t.binary}</span><span>${t.name_zh}</span>`;
    root.appendChild(cell);
  }
  const btn = document.getElementById('trig-counter-play');
  if (btn) btn.addEventListener('click', () => playTrigCounter());
}

function playTrigCounter() {
  const cells = document.querySelectorAll('#trig-counter .cell');
  cells.forEach((c) => c.classList.remove('is-active'));
  let i = 0;
  const tick = () => {
    cells.forEach((c) => c.classList.remove('is-active'));
    if (i < cells.length) {
      cells[i].classList.add('is-active');
      i += 1;
      setTimeout(tick, 320);
    }
  };
  tick();
}

// ============================================================
// Hexagrams matrix + detail
// ============================================================
const hexState = {
  order: 'fuxi',          // 'fuxi' | 'kw'
  filter: null,           // { type: 'upper'|'lower', id: 0-7 } or null
  selectedKw: null,
};

function setupHexagrams(trigrams, hexagrams) {
  const grid = document.getElementById('hex-grid');
  const chipsRoot = document.getElementById('hex-filter-chips');
  if (!grid || !chipsRoot) return;
  // Filter chips: 16 chips (上卦 8 + 下卦 8) compressed: show 8 trigram chips, click cycles upper/lower/off
  const trigById = Object.fromEntries(trigrams.map((t) => [t.id, t]));
  chipsRoot.innerHTML = '';
  for (let id = 0; id < 8; id++) {
    const t = trigById[id];
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.dataset.id = String(id);
    chip.innerHTML = `<span style="font-size:14px;color:var(--gold);margin-right:4px;">${t.symbol}</span>${t.name_zh}`;
    chip.title = `${t.name_zh} を含む卦をハイライト`;
    chip.addEventListener('click', () => {
      // cycle: off -> upper -> lower -> off
      if (!hexState.filter || hexState.filter.id !== id) {
        hexState.filter = { type: 'upper', id };
        chip.dataset.cycle = 'upper';
      } else if (hexState.filter.type === 'upper') {
        hexState.filter = { type: 'lower', id };
        chip.dataset.cycle = 'lower';
      } else {
        hexState.filter = null;
        chip.dataset.cycle = '';
      }
      // Visual: highlight the active chip with a label
      document.querySelectorAll('.hex-filter .chip').forEach((c) => c.classList.remove('is-on'));
      if (hexState.filter) {
        chip.classList.add('is-on');
        chip.innerHTML = `<span style="font-size:14px;color:inherit;margin-right:4px;">${t.symbol}</span>${t.name_zh}<small style="margin-left:6px;opacity:.8;">${hexState.filter.type === 'upper' ? '上卦' : '下卦'}</small>`;
      } else {
        chip.innerHTML = `<span style="font-size:14px;color:var(--gold);margin-right:4px;">${t.symbol}</span>${t.name_zh}`;
      }
      renderHexGrid(trigrams, hexagrams);
    });
    chipsRoot.appendChild(chip);
  }
  document.getElementById('hex-filter-clear').addEventListener('click', () => {
    hexState.filter = null;
    document.querySelectorAll('.hex-filter .chip').forEach((c, i) => {
      c.classList.remove('is-on');
      c.innerHTML = `<span style="font-size:14px;color:var(--gold);margin-right:4px;">${trigById[i].symbol}</span>${trigById[i].name_zh}`;
    });
    renderHexGrid(trigrams, hexagrams);
  });

  // Order toggle
  document.querySelectorAll('.hex-controls .seg__btn[data-order]').forEach((btn) => {
    btn.addEventListener('click', () => {
      hexState.order = btn.dataset.order;
      document.querySelectorAll('.hex-controls .seg__btn[data-order]').forEach((b) => b.classList.toggle('is-on', b === btn));
      renderHexGrid(trigrams, hexagrams);
    });
  });

  renderHexGrid(trigrams, hexagrams);
  // Initial detail: KW#1 乾
  showHexDetail(trigrams, hexagrams.find((h) => h.kw === 1));
}

function renderHexGrid(trigrams, hexagrams) {
  const grid = document.getElementById('hex-grid');
  grid.innerHTML = '';
  grid.className = `hex-grid is-${hexState.order}`;
  const trigById = Object.fromEntries(trigrams.map((t) => [t.id, t]));
  const hexByFuxi = Object.fromEntries(hexagrams.map((h) => [h.fuxi, h]));

  if (hexState.order === 'fuxi') {
    // Header row: corner + lower trigram headers (id 0..7)
    const corner = document.createElement('div');
    corner.className = 'corner';
    corner.textContent = '↓上 →下';
    grid.appendChild(corner);
    for (let lower = 0; lower < 8; lower++) {
      const h = document.createElement('div');
      h.className = 'h';
      h.title = `下卦: ${trigById[lower].name_zh}`;
      h.textContent = trigById[lower].symbol;
      grid.appendChild(h);
    }
    for (let upper = 0; upper < 8; upper++) {
      const rowHead = document.createElement('div');
      rowHead.className = 'h';
      rowHead.title = `上卦: ${trigById[upper].name_zh}`;
      rowHead.textContent = trigById[upper].symbol;
      grid.appendChild(rowHead);
      for (let lower = 0; lower < 8; lower++) {
        const fuxi = upper * 8 + lower;
        grid.appendChild(makeHexCell(hexByFuxi[fuxi], trigrams, hexagrams));
      }
    }
  } else {
    // KW order
    [...hexagrams].sort((a, b) => a.kw - b.kw).forEach((h) => {
      grid.appendChild(makeHexCell(h, trigrams, hexagrams, true));
    });
  }
}

function makeHexCell(h, trigrams, hexagrams, showKw = false) {
  const cell = document.createElement('button');
  cell.type = 'button';
  cell.className = 'cell';
  cell.dataset.kw = String(h.kw);
  cell.title = `KW#${h.kw} ${h.name_zh} (${h.name_jp}) ─ ${h.name_en}`;
  cell.innerHTML = `
    <span class="sym">${h.symbol}</span>
    ${showKw ? `<span class="kw-num">#${h.kw}</span>` : ''}
    <span class="nm">${h.name_zh}</span>
  `;
  cell.addEventListener('click', () => showHexDetail(trigrams, h));
  // Apply filter dim
  if (hexState.filter) {
    const f = hexState.filter;
    const match = (f.type === 'upper' ? h.upper : h.lower) === f.id;
    cell.classList.toggle('is-dim', !match);
    cell.classList.toggle('is-on', match);
  }
  if (hexState.selectedKw === h.kw) cell.classList.add('is-on');
  return cell;
}

function bitsFromHex(h) {
  // bits[0..2] = lower trigram, bits[3..5] = upper
  const lower = h.lower, upper = h.upper;
  return [
    lower & 1,
    (lower >> 1) & 1,
    (lower >> 2) & 1,
    upper & 1,
    (upper >> 1) & 1,
    (upper >> 2) & 1,
  ];
}

function showHexDetail(trigrams, h) {
  const card = document.getElementById('hex-detail');
  if (!card || !h) return;
  card.hidden = false;
  hexState.selectedKw = h.kw;
  setHash('hexagrams', String(h.kw));
  const trigById = Object.fromEntries(trigrams.map((t) => [t.id, t]));
  const upper = trigById[h.upper];
  const lower = trigById[h.lower];

  document.getElementById('hex-detail-symbol').textContent = h.symbol;
  document.getElementById('hex-detail-title').textContent  = `KW #${h.kw} ${h.name_zh} ─ ${h.name_en}`;
  document.getElementById('hex-detail-sub').textContent    =
    `読み: ${h.name_jp} ・ Fuxi: ${h.fuxi} (binary ${h.fuxi.toString(2).padStart(6, '0')}) ・ 上卦: ${upper.name_zh}/${upper.symbol} ・ 下卦: ${lower.name_zh}/${lower.symbol}`;

  // 6 yao
  const yaoRoot = document.getElementById('hex-detail-yao');
  yaoRoot.innerHTML = '';
  bitsFromHex(h).forEach((b, i) => {
    const row = document.createElement('div');
    row.className = `yao-row ${b ? '' : 'yin'}`;
    row.title = `第${i + 1}爻 (${b ? '陽' : '陰'})`;
    yaoRoot.appendChild(row);
  });

  const grid = document.getElementById('hex-detail-grid');
  grid.innerHTML = '';
  const fields = [
    ['王弼 KW#', String(h.kw)],
    ['Fuxi 二進値', `${h.fuxi} (${h.fuxi.toString(2).padStart(6, '0')})`],
    ['上卦', `${upper.name_zh} (${upper.name_en}) ${upper.symbol}`],
    ['下卦', `${lower.name_zh} (${lower.name_en}) ${lower.symbol}`],
    ['錯卦 (補数)', describeOpposite(h, hexState_resolve)],
    ['総卦 (反転)', describeReverse(h, hexState_resolve)],
  ];
  for (const [k, v] of fields) {
    const wrap = document.createElement('div');
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.innerHTML = v;
    wrap.appendChild(dt); wrap.appendChild(dd);
    grid.appendChild(wrap);
  }
  document.getElementById('hex-detail-summary').textContent = h.summary;

  // Deep insights (#23)
  let deepEl = document.getElementById('hex-detail-deep');
  if (!deepEl) {
    deepEl = document.createElement('div');
    deepEl.id = 'hex-detail-deep';
    deepEl.className = 'hex-detail-deep';
    document.getElementById('hex-detail').appendChild(deepEl);
  }
  if (h.deep) {
    deepEl.innerHTML = `
      <h4>深層解説</h4>
      <dl>
        <div><dt>象 (Image)</dt><dd>${h.deep.image}</dd></div>
        <div><dt>現代訳</dt><dd>${h.deep.modern}</dd></div>
        <div><dt>自分への問い</dt><dd>${h.deep.key_question}</dd></div>
      </dl>
    `;
    deepEl.hidden = false;
  } else {
    deepEl.hidden = true;
  }

  // Re-render grid to update "is-on" highlight
  renderHexGrid(state.trigrams, state.hexagrams);
}

// 錯卦 (cuogua): bitwise complement = 63 - fuxi
// 綜卦 (zonggua): line-reverse (read upside down). Same as reversing the 6-bit string.
function describeOpposite(h, resolver) {
  const fuxi = 63 - h.fuxi;
  const o = resolver().hexByFuxi[fuxi];
  return o ? clickableHex(o) : '—';
}
function describeReverse(h, resolver) {
  const bits = bitsFromHex(h);
  const reversed = bits.slice().reverse(); // [top,...,bottom] → new bottom..top
  const lower = reversed[0] | (reversed[1] << 1) | (reversed[2] << 2);
  const upper = reversed[3] | (reversed[4] << 1) | (reversed[5] << 2);
  const fuxi = upper * 8 + lower;
  const o = resolver().hexByFuxi[fuxi];
  return o ? clickableHex(o) : '—';
}
function clickableHex(o) {
  return `<a href="#" data-jump-kw="${o.kw}">${o.symbol} KW#${o.kw} ${o.name_zh}</a>`;
}
function hexState_resolve() {
  return {
    hexByFuxi: Object.fromEntries(state.hexagrams.map((h) => [h.fuxi, h])),
  };
}

// Click-to-jump on detail links (works from any section)
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-jump-kw]');
  if (!a) return;
  e.preventDefault();
  const kw = Number(a.dataset.jumpKw);
  const h = state.hexagrams.find((x) => x.kw === kw);
  if (!h) return;
  // Activate hexagrams tab
  document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.target === 'hexagrams')));
  document.querySelectorAll('.section').forEach((s) => s.classList.toggle('is-active', s.id === 'hexagrams'));
  showHexDetail(state.trigrams, h);
  document.getElementById('hex-detail').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// ============================================================
// Worldview section
// ============================================================
function setupWorldview(worldview, hexagrams) {
  const root = document.getElementById('wv-cards');
  if (!root) return;
  root.innerHTML = '';
  const hexByKw = Object.fromEntries(hexagrams.map((h) => [h.kw, h]));

  worldview.forEach((p) => {
    const card = document.createElement('article');
    card.className = 'wv-card';
    const related = (p.related_kw || [])
      .map((kw) => hexByKw[kw])
      .filter(Boolean)
      .map((h) => `<a href="#hexagrams" data-jump-kw="${h.kw}" title="${h.name_zh} (${h.name_jp})">${h.symbol} ${h.name_zh}</a>`)
      .join('');
    card.innerHTML = `
      <h3 class="wv-card__title">${p.name_zh}<small>${p.name_jp} ・ ${p.name_en}</small></h3>
      <p class="wv-card__concept">${p.concept}</p>
      <p class="wv-card__summary">${p.summary}</p>
      <div class="wv-card__practice"><strong>応用:</strong>${p.practice}</div>
      <div class="wv-card__related"><span style="margin-right:6px;">関連卦:</span>${related || '<em>該当卦なし</em>'}</div>
      <p class="wv-card__src">出典: ${p.source}</p>
    `;
    root.appendChild(card);
  });
}

// ============================================================
// Applications section
// ============================================================
function setupApplications(applications, hexagrams, worldview) {
  const tabs = document.querySelectorAll('#app-subtabs .seg__btn');
  if (!tabs.length) return;
  let current = 'life';
  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabs.forEach((b) => b.classList.toggle('is-on', b === btn));
      current = btn.dataset.cat;
      renderAppCards(current, applications, hexagrams, worldview);
    });
  });
  renderAppCards(current, applications, hexagrams, worldview);
}

function renderAppCards(category, applications, hexagrams, worldview) {
  const root = document.getElementById('app-cards');
  if (!root) return;
  root.innerHTML = '';
  const hexByKw = Object.fromEntries(hexagrams.map((h) => [h.kw, h]));
  const wvById  = Object.fromEntries(worldview.map((p) => [p.id, p]));

  applications.filter((a) => a.category === category).forEach((sc) => {
    const card = document.createElement('article');
    card.className = 'app-card';
    const related = (sc.related_kw || [])
      .map((kw) => hexByKw[kw])
      .filter(Boolean)
      .map((h) => `<a href="#hexagrams" data-jump-kw="${h.kw}" title="${h.name_zh} (${h.name_jp})">${h.symbol} ${h.name_zh}</a>`)
      .join('');
    const principles = (sc.principles || [])
      .map((id) => wvById[id])
      .filter(Boolean)
      .map((p) => `<span title="${p.concept}">${p.name_zh}</span>`)
      .join('');
    const questions = (sc.questions || []).map((q) => `<li>${q}</li>`).join('');
    card.innerHTML = `
      <h3>${sc.title}</h3>
      <p class="situation">${sc.situation}</p>
      <ul class="questions">${questions}</ul>
      <div class="related"><span style="margin-right:6px;">関連卦:</span>${related || '<em>—</em>'}</div>
      <div class="principles"><span style="margin-right:6px;">関連原理:</span>${principles || '<em>—</em>'}</div>
    `;
    root.appendChild(card);
  });
}

// ============================================================
// Legacy section
// ============================================================
const LEVEL_LABEL = {
  fact:        ['事実',     'lvl-fact'],
  tradition:   ['伝統',     'lvl-tradition'],
  interpretation: ['解釈・並行', 'lvl-interp'],
};

function setupLegacy(figures, disciplines, hexagrams, worldview) {
  const tabs = document.querySelectorAll('#leg-subtabs .seg__btn');
  if (!tabs.length) return;
  let current = 'figures';
  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabs.forEach((b) => b.classList.toggle('is-on', b === btn));
      current = btn.dataset.cat;
      renderLegacyCards(current, figures, disciplines, hexagrams, worldview);
    });
  });
  renderLegacyCards(current, figures, disciplines, hexagrams, worldview);
}

function renderLegacyCards(cat, figures, disciplines, hexagrams, worldview) {
  const root = document.getElementById('leg-cards');
  if (!root) return;
  root.innerHTML = '';
  const hexByKw = Object.fromEntries(hexagrams.map((h) => [h.kw, h]));
  const wvById  = Object.fromEntries(worldview.map((p) => [p.id, p]));
  const figById = Object.fromEntries(figures.map((f) => [f.id, f]));

  const items = cat === 'figures' ? figures : disciplines;
  items.forEach((it) => {
    const card = document.createElement('article');
    card.className = 'legacy-card';
    const [levelLabel, levelClass] = LEVEL_LABEL[it.level] || ['—', ''];
    const related = (it.related_kw || [])
      .map((kw) => hexByKw[kw])
      .filter(Boolean)
      .map((h) => `<a href="#hexagrams" data-jump-kw="${h.kw}">${h.symbol} ${h.name_zh}</a>`)
      .join('');
    if (cat === 'figures') {
      const principles = (it.principles || [])
        .map((id) => wvById[id])
        .filter(Boolean)
        .map((p) => `<span style="color:var(--gold);">${p.name_zh}</span>`)
        .join('');
      card.innerHTML = `
        <h3>
          <span class="name-zh">${it.name_zh}</span>
          <span class="name-en">${it.name_en}</span>
          <span class="lvl ${levelClass}">${levelLabel}</span>
        </h3>
        <p class="meta">
          <span><strong>時代:</strong>${it.era}</span>
          <span><strong>地域:</strong>${it.region}</span>
          <span><strong>領域:</strong>${it.domain}</span>
        </p>
        <p class="body">${it.contribution}</p>
        <div class="footer">
          <span>関連卦:</span>${related || '<em>—</em>'}
          ${principles ? `<span style="margin-left:8px;">関連原理:</span>${principles}` : ''}
        </div>
      `;
    } else {
      const exemplars = (it.exemplars || [])
        .map((id) => figById[id])
        .filter(Boolean)
        .map((f) => `<a href="#legacy" data-jump-figure="${f.id}">${f.name_zh}</a>`)
        .join('');
      card.innerHTML = `
        <h3>
          <span class="name-zh">${it.name_jp}</span>
          <span class="name-en">${it.name_en}</span>
          <span class="lvl ${levelClass}">${levelLabel}</span>
        </h3>
        <p class="meta"><span><strong>核となる接続:</strong>${it.core_link}</span></p>
        <p class="body">${it.summary}</p>
        <div class="footer">
          <span>関連卦:</span>${related || '<em>—</em>'}
          ${exemplars ? `<span style="margin-left:8px;">代表例:</span>${exemplars}` : ''}
        </div>
      `;
    }
    root.appendChild(card);
  });
}

// Cross-link: discipline → figure
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-jump-figure]');
  if (!a) return;
  e.preventDefault();
  // Switch to figures subtab and scroll to that card
  const figTab = document.querySelector('#leg-subtabs .seg__btn[data-cat="figures"]');
  if (figTab) figTab.click();
  setTimeout(() => {
    const target = Array.from(document.querySelectorAll('#leg-cards .legacy-card'))
      .find((c) => c.querySelector('.name-zh')?.textContent === state.figures.find((f) => f.id === a.dataset.jumpFigure)?.name_zh);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 50);
});

// ============================================================
// Science section
// ============================================================
const STATE_READING = {
  0: '安定 (低エネルギー基底状態) ─ 物質の充満',
  1: '励起 (運動量パルス) ─ インパルス・始動',
  2: '流動 (連続変形) ─ 流体の流れ',
  3: '蓄積 (相変化点) ─ 容量に蓄える液面',
  4: '固定 (相平衡) ─ 構造の停止・限界',
  5: '反応 (発熱・放射) ─ 燃焼・依存反応',
  6: '拡散 (粒子拡散) ─ 浸透・拡散場',
  7: '極限 (最大活性) ─ 純粋ポテンシャル',
};

function setupScience(trigrams, hexagrams) {
  setupSciLeibniz(hexagrams);
  setupSciHamming(hexagrams);
  setupSciStatesTable(trigrams);
}

function setupSciLeibniz(hexagrams) {
  const root = document.getElementById('sci-leibniz');
  if (!root) return;
  root.innerHTML = '';
  const byFuxi = Object.fromEntries(hexagrams.map((h) => [h.fuxi, h]));
  // 8x8 in Fuxi binary order: row = upper (0..7), col = lower (0..7)
  for (let upper = 0; upper < 8; upper++) {
    for (let lower = 0; lower < 8; lower++) {
      const fuxi = upper * 8 + lower;
      const h = byFuxi[fuxi];
      const cell = document.createElement('div');
      cell.className = 'lcell';
      cell.title = `${h.name_zh} (KW#${h.kw}) ─ Fuxi ${fuxi}`;
      cell.innerHTML = `
        <span class="sym">${h.symbol}</span>
        <span class="bin">${fuxi.toString(2).padStart(6, '0')}</span>
        <span class="kw">${fuxi} · KW${h.kw}</span>
      `;
      root.appendChild(cell);
    }
  }
}

function setupSciHamming(hexagrams) {
  const root = document.getElementById('sci-hamming');
  const sel  = document.getElementById('sci-h-pick');
  if (!root || !sel) return;
  sel.innerHTML = '';
  // Default to KW#1 乾
  [...hexagrams].sort((a, b) => a.kw - b.kw).forEach((h) => {
    const o = document.createElement('option');
    o.value = String(h.kw);
    o.textContent = `KW#${h.kw} ${h.symbol} ${h.name_zh} (${h.name_jp})`;
    sel.appendChild(o);
  });
  const render = () => {
    const kw = Number(sel.value);
    const base = hexagrams.find((h) => h.kw === kw);
    if (!base) return;
    const baseFuxi = base.fuxi;
    const byFuxi = Object.fromEntries(hexagrams.map((h) => [h.fuxi, h]));
    const neighbors = [];
    for (let bit = 0; bit < 6; bit++) {
      const f = baseFuxi ^ (1 << bit);
      neighbors.push({ bit, h: byFuxi[f] });
    }
    root.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'sci-hamming__row';
    const baseCell = document.createElement('div');
    baseCell.className = 'sci-hamming__base';
    baseCell.innerHTML = `
      <span class="sym">${base.symbol}</span>
      <span class="nm">${base.name_zh}</span>
      <span class="lbl">基準 KW#${base.kw}</span>
    `;
    row.appendChild(baseCell);
    for (const { bit, h } of neighbors) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'sci-hamming__neighbor';
      cell.title = `第${bit + 1}爻を反転 → KW#${h.kw} ${h.name_zh}`;
      cell.innerHTML = `
        <span class="sym">${h.symbol}</span>
        <span class="nm">${h.name_zh}</span>
        <span class="lbl">第${bit + 1}爻反転</span>
      `;
      cell.addEventListener('click', () => {
        sel.value = String(h.kw);
        render();
      });
      row.appendChild(cell);
    }
    root.appendChild(row);
  };
  sel.addEventListener('change', render);
  sel.value = '1';
  render();
}

function setupSciStatesTable(trigrams) {
  const tbody = document.getElementById('sci-states-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  [...trigrams].sort((a, b) => a.id - b.id).forEach((t) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="sym">${t.symbol}</span>${t.name_zh} <small style="color:var(--ink-3);">(${t.name_jp})</small></td>
      <td>${t.natural} (${t.name_en})</td>
      <td>${t.attribute}</td>
      <td>${STATE_READING[t.id] || '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ============================================================
// Diagnose wizard
// ============================================================
function setupDiagnose(diagnose, hexagrams, worldview) {
  const card = document.getElementById('diagnose-card');
  const intro = document.getElementById('diagnose-intro');
  const bar = document.querySelector('#diagnose-progress .diag-progress__bar');
  if (!card) return;
  if (intro && diagnose.intro) intro.innerHTML = diagnose.intro.replace('占断ではありません', '<strong>占断ではありません</strong>');

  const questions = diagnose.questions;
  const answers = []; // selected option objects
  let step = 0;

  const render = () => {
    card.innerHTML = '';
    if (bar) bar.style.width = `${(step / questions.length) * 100}%`;

    if (step >= questions.length) {
      renderResult();
      if (bar) bar.style.width = '100%';
      return;
    }
    const q = questions[step];
    const stepEl = document.createElement('div');
    stepEl.className = 'step';
    stepEl.textContent = `質問 ${step + 1} / ${questions.length}`;
    card.appendChild(stepEl);

    const promptEl = document.createElement('p');
    promptEl.className = 'prompt';
    promptEl.textContent = q.prompt;
    card.appendChild(promptEl);

    const opts = document.createElement('div');
    opts.className = 'diag-options';
    q.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'diag-option';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        answers.push(opt);
        step += 1;
        render();
      });
      opts.appendChild(btn);
    });
    card.appendChild(opts);

    if (step > 0) {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'btn';
      back.textContent = '← 前の質問';
      back.style.alignSelf = 'flex-start';
      back.addEventListener('click', () => {
        step -= 1;
        answers.pop();
        render();
      });
      card.appendChild(back);
    }
  };

  const renderResult = () => {
    const hexByKw = Object.fromEntries(hexagrams.map((h) => [h.kw, h]));
    const wvById  = Object.fromEntries(worldview.map((p) => [p.id, p]));

    // Aggregate KW counts
    const kwCount = new Map();
    const principleCount = new Map();
    const userQuestions = [];
    answers.forEach((a) => {
      (a.kw || []).forEach((k) => kwCount.set(k, (kwCount.get(k) || 0) + 1));
      (a.principles || []).forEach((p) => principleCount.set(p, (principleCount.get(p) || 0) + 1));
      if (a.question) userQuestions.push(a.question);
    });
    const topHex = [...kwCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const topPrinciples = [...principleCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

    card.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'diag-result';

    wrap.innerHTML = `
      <p class="muted" style="margin: 0;">あなたの回答から導かれる候補です。決定論ではなく、考える鏡として使ってください。</p>
      <div>
        <h3>関連する卦 (上位 ${topHex.length})</h3>
        <div class="diag-result__hex">${topHex.map(([kw, score]) => {
          const h = hexByKw[kw];
          return `<a href="#hexagrams" class="item" data-jump-kw="${kw}">
            <span class="sym">${h.symbol}</span>
            <span>
              <span class="name">${h.name_zh} <small style="color:var(--ink-3);font-weight:normal;">${h.name_en}</small></span><br/>
              <span class="meta">KW#${h.kw} ・ ${h.summary}</span>
            </span>
            <span class="score">×${score}</span>
          </a>`;
        }).join('')}</div>
      </div>
      <div>
        <h3>関連する原理</h3>
        <div class="diag-result__principles">${topPrinciples.map(([id, score]) => {
          const p = wvById[id]; if (!p) return '';
          return `<span class="chip" title="${p.concept}">${p.name_zh} ×${score}</span>`;
        }).join('')}</div>
      </div>
      <div>
        <h3>自分に投げかけたい問い</h3>
        <ul class="diag-result__questions">${userQuestions.map((q) => `<li>${q}</li>`).join('')}</ul>
      </div>
      <div class="diag-result__actions">
        <button type="button" class="btn" id="diag-restart">↺ もう一度やる</button>
        <button type="button" class="btn" id="diag-journal">📖 これをジャーナルに残す</button>
      </div>
    `;
    card.appendChild(wrap);

    document.getElementById('diag-restart').addEventListener('click', () => {
      answers.length = 0; step = 0; render();
    });
    document.getElementById('diag-journal').addEventListener('click', () => {
      // Save snapshot to localStorage; the actual journal UI is implemented separately (#25)
      const snap = {
        ts: Date.now(),
        type: 'diagnose',
        topHex: topHex.map(([k]) => k),
        topPrinciples: topPrinciples.map(([id]) => id),
        userQuestions,
        answers: answers.map((a, i) => ({ q: questions[i].id, label: a.label })),
      };
      try {
        const list = JSON.parse(localStorage.getItem('eki:journal') || '[]');
        list.unshift(snap);
        localStorage.setItem('eki:journal', JSON.stringify(list));
        const btn = document.getElementById('diag-journal');
        btn.textContent = '✓ 保存しました';
        btn.disabled = true;
      } catch (e) {
        alert('localStorage への保存に失敗しました: ' + e.message);
      }
    });
  };

  render();
}

// ============================================================
// Journal (localStorage)
// ============================================================
const JR_KEY = 'eki:journal';

function loadJournal() {
  try { return JSON.parse(localStorage.getItem(JR_KEY) || '[]'); }
  catch { return []; }
}
function saveJournal(entries) {
  localStorage.setItem(JR_KEY, JSON.stringify(entries));
}

function setupJournal(hexagrams, worldview) {
  const listRoot = document.getElementById('jr-list');
  const editor   = document.getElementById('jr-editor');
  const newBtn   = document.getElementById('jr-new');
  const expBtn   = document.getElementById('jr-export');
  const impInput = document.getElementById('jr-import');
  const countEl  = document.getElementById('jr-count');
  if (!listRoot) return;

  const renderList = () => {
    const entries = loadJournal();
    countEl.textContent = `${entries.length} 件`;
    if (entries.length === 0) {
      listRoot.innerHTML = `<div class="journal-empty">まだ記録がありません。「＋ 新規記録」または「自己診断」の結果から保存できます。</div>`;
      return;
    }
    const hexByKw = Object.fromEntries(hexagrams.map((h) => [h.kw, h]));
    const wvById  = Object.fromEntries(worldview.map((p) => [p.id, p]));
    listRoot.innerHTML = '';
    entries.forEach((e, idx) => {
      const item = document.createElement('article');
      item.className = 'jr-item';
      const date = e.date || new Date(e.ts).toISOString().slice(0, 10);
      const primaryKw = (e.kw && e.kw[0]) || (e.topHex && e.topHex[0]);
      const h = primaryKw ? hexByKw[primaryKw] : null;
      const principles = (e.principles || e.topPrinciples || []).map((id) => wvById[id]).filter(Boolean);
      const summary = e.note || (e.userQuestions ? e.userQuestions.join(' / ') : '(メモなし)');
      const title = e.title || (e.type === 'diagnose' ? '自己診断の記録' : '記録');
      item.innerHTML = `
        <span class="sym">${h ? h.symbol : '☯'}</span>
        <div class="body">
          <h4>${title}${h ? ` ─ ${h.name_zh}` : ''}</h4>
          <span class="date">${date}</span>
          <p class="summary">${summary.length > 200 ? summary.slice(0, 200) + '…' : summary}</p>
          <div class="principles">${principles.map((p) => `<span>${p.name_zh}</span>`).join('')}</div>
        </div>
        <div class="actions">
          <button data-act="edit"   data-idx="${idx}">編集</button>
          <button data-act="delete" data-idx="${idx}">削除</button>
        </div>
      `;
      listRoot.appendChild(item);
    });
  };

  const showEditor = (entry, idx) => {
    editor.hidden = false;
    const isNew = idx == null;
    const hexOptions = hexagrams.map((h) => `<option value="${h.kw}" ${entry?.kw?.[0] === h.kw ? 'selected' : ''}>KW#${h.kw} ${h.symbol} ${h.name_zh} (${h.name_jp})</option>`).join('');
    const wvOptions  = worldview.map((p) => `<option value="${p.id}" ${(entry?.principles || []).includes(p.id) ? 'selected' : ''}>${p.name_zh} (${p.concept})</option>`).join('');
    const today = new Date().toISOString().slice(0, 10);
    editor.innerHTML = `
      <h3 style="margin:0;color:var(--gold);font-family:var(--font-serif);">${isNew ? '新規記録' : '記録の編集'}</h3>
      <div class="row">
        <label>日付<input type="date" id="jr-date" value="${entry?.date || today}" /></label>
        <label>見出し<input type="text" id="jr-title" placeholder="例: チームの方針会議で揺らいだ" value="${entry?.title || ''}" /></label>
      </div>
      <label>引いた卦
        <select id="jr-kw"><option value="">— 選択 —</option>${hexOptions}</select>
      </label>
      <label>関連する原理 (Ctrl/Cmd+クリックで複数選択)
        <select id="jr-principles" multiple size="4">${wvOptions}</select>
      </label>
      <label>状況・観察したこと
        <textarea id="jr-situation" placeholder="どんな状況だったか">${entry?.situation || ''}</textarea>
      </label>
      <label>取った行動 / 取りたい行動
        <textarea id="jr-action" placeholder="それを受けてどうしたか/どうするか">${entry?.action || ''}</textarea>
      </label>
      <label>結果・振り返り (時間が経ってから書き加えてOK)
        <textarea id="jr-reflection" placeholder="後から書き足す">${entry?.reflection || ''}</textarea>
      </label>
      <div class="actions">
        <button type="button" class="btn" id="jr-save">${isNew ? '保存' : '更新'}</button>
        <button type="button" class="seg__btn" id="jr-cancel">キャンセル</button>
      </div>
    `;
    document.getElementById('jr-cancel').addEventListener('click', () => {
      editor.hidden = true;
    });
    document.getElementById('jr-save').addEventListener('click', () => {
      const kw = document.getElementById('jr-kw').value;
      const principles = Array.from(document.getElementById('jr-principles').selectedOptions).map((o) => o.value);
      const next = {
        ts: entry?.ts || Date.now(),
        date: document.getElementById('jr-date').value,
        title: document.getElementById('jr-title').value,
        kw: kw ? [Number(kw)] : [],
        principles,
        situation: document.getElementById('jr-situation').value,
        action: document.getElementById('jr-action').value,
        reflection: document.getElementById('jr-reflection').value,
        note: document.getElementById('jr-situation').value,
        type: 'manual',
      };
      const all = loadJournal();
      if (isNew) all.unshift(next);
      else       all[idx] = next;
      saveJournal(all);
      editor.hidden = true;
      renderList();
    });
  };

  newBtn.addEventListener('click', () => showEditor(null, null));

  listRoot.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const all = loadJournal();
    if (btn.dataset.act === 'edit') {
      showEditor(all[idx], idx);
    } else if (btn.dataset.act === 'delete') {
      if (confirm('この記録を削除しますか?')) {
        all.splice(idx, 1);
        saveJournal(all);
        renderList();
      }
    }
  });

  expBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(loadJournal(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eki-journal-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  impInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      if (!Array.isArray(imported)) throw new Error('JSON は配列である必要があります');
      const merged = [...imported, ...loadJournal()];
      saveJournal(merged);
      renderList();
      alert(`${imported.length} 件をインポートしました`);
    } catch (err) {
      alert('インポート失敗: ' + err.message);
    }
    e.target.value = '';
  });

  renderList();
}

// ============================================================
// Search
// ============================================================
function buildSearchIndex(s) {
  const idx = [];
  s.hexagrams.forEach((h) => idx.push({
    kind: '六十四卦', icon: h.symbol,
    title: `KW#${h.kw} ${h.name_zh} (${h.name_jp}) ─ ${h.name_en}`,
    text: `${h.summary} ${h.name_jp} ${h.name_en}`,
    target: 'hexagrams', payload: { jumpKw: h.kw },
  }));
  s.trigrams.forEach((t) => idx.push({
    kind: '八卦', icon: t.symbol,
    title: `${t.name_zh} (${t.name_jp}) ─ ${t.name_en}`,
    text: `${t.natural} ${t.attribute} ${t.family} ${t.summary}`,
    target: 'trigrams', payload: {},
  }));
  s.worldview.forEach((p) => idx.push({
    kind: '見方', icon: '◇',
    title: `${p.name_zh} (${p.name_jp}) ─ ${p.name_en}`,
    text: `${p.concept} ${p.summary} ${p.practice}`,
    target: 'worldview', payload: {},
  }));
  s.applications.forEach((a) => idx.push({
    kind: `応用 / ${a.category}`, icon: '✦',
    title: a.title,
    text: `${a.situation} ${(a.questions || []).join(' ')}`,
    target: 'applications', payload: {},
  }));
  s.figures.forEach((f) => idx.push({
    kind: '偉人', icon: '人',
    title: `${f.name_zh} (${f.name_en})`,
    text: `${f.era} ${f.region} ${f.domain} ${f.contribution}`,
    target: 'legacy', payload: {},
  }));
  s.disciplines.forEach((d) => idx.push({
    kind: '他学問', icon: '∞',
    title: `${d.name_jp} (${d.name_en})`,
    text: `${d.core_link} ${d.summary}`,
    target: 'legacy', payload: {},
  }));
  (s.cases || []).forEach((c) => idx.push({
    kind: `ケース / ${c.category}`, icon: '◆',
    title: c.title,
    text: `${c.situation} ${c.action} ${c.outcome} ${c.reflection}`,
    target: 'cases', payload: {},
  }));
  return idx;
}

function setupSearch() {
  const trigger = document.getElementById('search-trigger');
  const overlay = document.getElementById('search-overlay');
  const input   = document.getElementById('search-input');
  const closeB  = document.getElementById('search-close');
  const results = document.getElementById('search-results');
  if (!trigger || !overlay) return;
  let index = [];
  let activeIdx = 0;
  let lastResults = [];

  const open = () => {
    overlay.hidden = false;
    setTimeout(() => input.focus(), 0);
  };
  const close = () => {
    overlay.hidden = true;
    input.value = '';
    results.innerHTML = '';
  };

  document.addEventListener('eki:data-loaded', () => {
    index = buildSearchIndex(state);
  });

  trigger.addEventListener('click', open);
  closeB.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); open(); }
    else if (e.key === 'Escape' && !overlay.hidden) close();
    else if (!overlay.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const items = results.querySelectorAll('.search-result');
      if (!items.length) return;
      activeIdx = (activeIdx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((el, i) => el.classList.toggle('is-active', i === activeIdx));
      items[activeIdx].scrollIntoView({ block: 'nearest' });
    }
    else if (!overlay.hidden && e.key === 'Enter') {
      const items = results.querySelectorAll('.search-result');
      if (items[activeIdx]) items[activeIdx].click();
    }
  });

  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (!q) { results.innerHTML = `<div class="search-empty">キーワードを入力してください (例: 対立、決断、二進、ライプニッツ)</div>`; return; }
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = index.map((entry) => {
      const haystack = (entry.title + ' ' + entry.text).toLowerCase();
      const hits = tokens.every((t) => haystack.includes(t));
      if (!hits) return null;
      const score = tokens.reduce((acc, t) => acc + (entry.title.toLowerCase().includes(t) ? 3 : 0) + (haystack.split(t).length - 1), 0);
      return { entry, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 30);
    lastResults = matches;
    activeIdx = 0;
    if (!matches.length) {
      results.innerHTML = `<div class="search-empty">該当なし</div>`; return;
    }
    const grouped = {};
    matches.forEach(({ entry }) => {
      (grouped[entry.kind] ||= []).push(entry);
    });
    results.innerHTML = '';
    Object.entries(grouped).forEach(([kind, list]) => {
      const g = document.createElement('div');
      g.className = 'search-results__group';
      g.innerHTML = `<h4>${kind}</h4>`;
      list.forEach((entry) => {
        const row = document.createElement('div');
        row.className = 'search-result';
        row.innerHTML = `<span class="ico">${entry.icon}</span>
          <div>
            <div class="title">${highlight(entry.title, tokens)}</div>
            <div class="snippet">${highlight(truncate(entry.text, 100), tokens)}</div>
          </div>`;
        row.addEventListener('click', () => {
          activate(entry);
        });
        g.appendChild(row);
      });
      results.appendChild(g);
    });
    const allRows = results.querySelectorAll('.search-result');
    if (allRows[0]) allRows[0].classList.add('is-active');
  });

  const activate = (entry) => {
    close();
    const tabs = document.querySelectorAll('.tab');
    const sections = document.querySelectorAll('.section');
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.target === entry.target)));
    sections.forEach((s) => s.classList.toggle('is-active', s.id === entry.target));
    if (entry.payload?.jumpKw) {
      const h = state.hexagrams.find((x) => x.kw === entry.payload.jumpKw);
      if (h) {
        showHexDetail(state.trigrams, h);
        document.getElementById('hex-detail')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      document.getElementById(entry.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Initial empty state
  results.innerHTML = `<div class="search-empty">キーワードを入力してください (例: 対立、決断、二進、ライプニッツ)</div>`;
}

function highlight(text, tokens) {
  let escaped = text.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]);
  for (const t of tokens) {
    if (!t) continue;
    const re = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    escaped = escaped.replace(re, '<mark>$1</mark>');
  }
  return escaped;
}
function truncate(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : s; }

// ============================================================
// Learning courses
// ============================================================
const LEARN_KEY = 'eki:progress';
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(LEARN_KEY) || '{}'); } catch { return {}; }
}
function saveProgress(p) { localStorage.setItem(LEARN_KEY, JSON.stringify(p)); }

function setupLearn(curriculum) {
  const root = document.getElementById('learn-courses');
  if (!root) return;
  let progress = loadProgress();

  const render = () => {
    root.innerHTML = '';
    curriculum.forEach((course) => {
      const total = course.steps.length;
      const done = course.steps.filter((s) => progress[s.id]).length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      const div = document.createElement('article');
      div.className = 'learn-course';
      div.innerHTML = `
        <div class="learn-course__head">
          <h3>${course.title}</h3>
          <span class="lvl-tag">${course.level}</span>
        </div>
        <p class="summary">${course.summary}</p>
        <div class="learn-progress">
          <div class="learn-progress__bar"><div style="width:${pct}%;"></div></div>
          <span class="learn-progress__txt">${done} / ${total} (${pct}%)</span>
        </div>
        <div class="learn-steps">
          ${course.steps.map((s) => `
            <div class="learn-step ${progress[s.id] ? 'is-done' : ''}">
              <button type="button" class="learn-step__check" data-step="${s.id}" aria-label="${progress[s.id] ? '完了マークを外す' : '完了マークを付ける'}">${progress[s.id] ? '✓' : ''}</button>
              <div>
                <div class="learn-step__title">${s.title}</div>
                <div class="learn-step__sum">${s.summary}</div>
              </div>
              <span class="learn-step__time">${s.duration_min}分</span>
              <button type="button" class="learn-step__go" data-anchor="${s.anchor}">開く →</button>
            </div>
          `).join('')}
        </div>
        <div class="learn-checks">
          <h4>確認の問い</h4>
          <ul>${course.checks.map((c) => `<li>${c}</li>`).join('')}</ul>
        </div>
      `;
      root.appendChild(div);
    });
  };

  root.addEventListener('click', (e) => {
    const check = e.target.closest('.learn-step__check');
    if (check) {
      const id = check.dataset.step;
      progress[id] = !progress[id];
      saveProgress(progress);
      render();
      return;
    }
    const go = e.target.closest('.learn-step__go');
    if (go) {
      const target = go.dataset.anchor;
      document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.target === target)));
      document.querySelectorAll('.section').forEach((s) => s.classList.toggle('is-active', s.id === target));
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  render();
}

// ============================================================
// Sequence story
// ============================================================
function setupStory(sequence, hexagrams) {
  const intro = document.getElementById('story-intro');
  const card = document.getElementById('story-card');
  const bar  = document.getElementById('story-bar');
  const stepEl = document.getElementById('story-step');
  if (!card) return;
  intro.textContent = sequence.intro;
  const transitions = sequence.transitions;
  const hexByKw = Object.fromEntries(hexagrams.map((h) => [h.kw, h]));
  let idx = 0;

  const render = () => {
    const t = transitions[idx];
    const from = hexByKw[t.from], to = hexByKw[t.to];
    bar.style.width = `${((idx + 1) / transitions.length) * 100}%`;
    stepEl.textContent = `${idx + 1} / ${transitions.length}`;
    card.innerHTML = `
      <button type="button" class="pane" data-jump-kw="${from.kw}">
        <span class="sym">${from.symbol}</span>
        <span class="nm">${from.name_zh}</span>
        <span class="meta">KW#${from.kw} ・ ${from.name_jp}</span>
        <span class="summary">${from.summary}</span>
      </button>
      <span class="story-arrow" aria-hidden="true">→</span>
      <button type="button" class="pane" data-jump-kw="${to.kw}">
        <span class="sym">${to.symbol}</span>
        <span class="nm">${to.name_zh}</span>
        <span class="meta">KW#${to.kw} ・ ${to.name_jp}</span>
        <span class="summary">${to.summary}</span>
      </button>
      <div class="story-reason">${t.reason}</div>
    `;
  };

  document.getElementById('story-prev').addEventListener('click', () => {
    idx = (idx - 1 + transitions.length) % transitions.length;
    render();
  });
  document.getElementById('story-next').addEventListener('click', () => {
    idx = (idx + 1) % transitions.length;
    render();
  });
  document.getElementById('story-reset').addEventListener('click', () => { idx = 0; render(); });

  // Keyboard navigation when story tab is active
  document.addEventListener('keydown', (e) => {
    if (document.getElementById('story').classList.contains('is-active')) {
      if (e.key === 'ArrowLeft') document.getElementById('story-prev').click();
      if (e.key === 'ArrowRight') document.getElementById('story-next').click();
    }
  });

  render();
}

// ============================================================
// Cases (#29)
// ============================================================
const CAT_LABEL = { life: '人生', business: '経営', relationships: '人間関係' };

function setupCases(cases, hexagrams, worldview) {
  const root = document.getElementById('case-cards');
  const sel  = document.getElementById('case-kw');
  const tabs = document.querySelectorAll('#case-cat .seg__btn');
  if (!root || !sel) return;
  let curCat = 'all';
  let curKw  = '';

  // Populate kw select with only the kws that appear in cases
  const usedKws = new Set();
  cases.forEach((c) => (c.kw || []).forEach((k) => usedKws.add(k)));
  const hexByKw = Object.fromEntries(hexagrams.map((h) => [h.kw, h]));
  [...usedKws].sort((a, b) => a - b).forEach((kw) => {
    const h = hexByKw[kw];
    const o = document.createElement('option');
    o.value = String(kw);
    o.textContent = `KW#${kw} ${h.symbol} ${h.name_zh}`;
    sel.appendChild(o);
  });

  const render = () => {
    root.innerHTML = '';
    const wvById = Object.fromEntries(worldview.map((p) => [p.id, p]));
    const filtered = cases.filter((c) => {
      if (curCat !== 'all' && c.category !== curCat) return false;
      if (curKw && !(c.kw || []).includes(Number(curKw))) return false;
      return true;
    });
    if (filtered.length === 0) {
      root.innerHTML = `<div class="journal-empty">該当ケースがありません。フィルタを調整してください。</div>`;
      return;
    }
    filtered.forEach((c) => {
      const card = document.createElement('article');
      card.className = 'case-card';
      const related = (c.kw || [])
        .map((kw) => hexByKw[kw]).filter(Boolean)
        .map((h) => `<a href="#hexagrams" data-jump-kw="${h.kw}">${h.symbol} ${h.name_zh}</a>`).join('');
      const principles = (c.principles || [])
        .map((id) => wvById[id]).filter(Boolean)
        .map((p) => `<span style="color:var(--gold);" title="${p.concept}">${p.name_zh}</span>`).join(' / ');
      card.innerHTML = `
        <div class="head">
          <span class="id">${c.id}</span>
          <span class="cat">${CAT_LABEL[c.category]}</span>
        </div>
        <h3>${c.title}</h3>
        <dl class="field"><dt>状況</dt><dd>${c.situation}</dd></dl>
        <dl class="field"><dt>取った行動</dt><dd>${c.action}</dd></dl>
        <dl class="field"><dt>結果</dt><dd>${c.outcome}</dd></dl>
        <div class="reflection"><strong style="color:var(--gold);margin-right:6px;">振り返り:</strong>${c.reflection}</div>
        <div class="footer">
          <span style="margin-right:6px;">関連卦:</span>${related || '<em>—</em>'}
          ${principles ? `<span style="margin-left:8px;">原理: ${principles}</span>` : ''}
        </div>
      `;
      root.appendChild(card);
    });
  };

  tabs.forEach((t) => t.addEventListener('click', () => {
    tabs.forEach((b) => b.classList.toggle('is-on', b === t));
    curCat = t.dataset.cat;
    render();
  }));
  sel.addEventListener('change', () => { curKw = sel.value; render(); });
  render();
}

// ============================================================
// Wuxing (五行) ─ trigram correspondence
// ============================================================
function setupWuxing(wuxing, trigrams) {
  const introEl = document.getElementById('wuxing-intro');
  const noteEl  = document.getElementById('wuxing-note');
  const svgWrap = document.getElementById('wuxing-svg');
  const tableEl = document.getElementById('wuxing-table');
  if (!introEl || !wuxing) return;
  introEl.textContent = wuxing.intro;
  noteEl.textContent = '※ ' + wuxing.note;

  // Pentagon SVG
  const size = 360, r = 110;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `${-size/2} ${-size/2} ${size} ${size}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  // Position elements at pentagon vertices, mu on top, then clockwise: ka, do, kin, sui
  const order = ['mu', 'ka', 'do', 'kin', 'sui'];
  const pos = {};
  order.forEach((id, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    pos[id] = { x: r * Math.cos(angle), y: r * Math.sin(angle) };
  });

  const arrowDefs = `
    <defs>
      <marker id="ah-gen" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" class="arrow-head-gen" />
      </marker>
      <marker id="ah-res" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" class="arrow-head-res" />
      </marker>
    </defs>`;
  svg.insertAdjacentHTML('beforeend', arrowDefs);

  // Generation arrows (相生): along the pentagon perimeter
  wuxing.generates.forEach((g) => {
    const a = pos[g.from], b = pos[g.to];
    // Shorten to avoid overlapping nodes (radius 28)
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const x1 = a.x + ux * 28, y1 = a.y + uy * 28;
    const x2 = b.x - ux * 32, y2 = b.y - uy * 32;
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('class', 'gen');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('stroke-width', '2');
    line.setAttribute('marker-end', 'url(#ah-gen)');
    svg.appendChild(line);
  });
  // Restriction arrows (相克): pentagram (skip 1)
  wuxing.restricts.forEach((rs) => {
    const a = pos[rs.from], b = pos[rs.to];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const x1 = a.x + ux * 28, y1 = a.y + uy * 28;
    const x2 = b.x - ux * 32, y2 = b.y - uy * 32;
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('class', 'res');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('stroke-width', '1.5');
    line.setAttribute('marker-end', 'url(#ah-res)');
    svg.appendChild(line);
  });

  // Nodes
  wuxing.elements.forEach((e) => {
    const p = pos[e.id];
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('transform', `translate(${p.x},${p.y})`);
    const circ = document.createElementNS(ns, 'circle');
    circ.setAttribute('class', 'node-bg');
    circ.setAttribute('r', 28); circ.setAttribute('cx', 0); circ.setAttribute('cy', 0);
    circ.setAttribute('stroke-width', '1.5');
    g.appendChild(circ);
    const txt = document.createElementNS(ns, 'text');
    txt.setAttribute('class', 'node-name'); txt.setAttribute('y', 4);
    txt.textContent = e.name_zh;
    g.appendChild(txt);
    const en = document.createElementNS(ns, 'text');
    en.setAttribute('class', 'node-en'); en.setAttribute('y', 20);
    en.textContent = e.name_en;
    g.appendChild(en);
    svg.appendChild(g);
  });

  // Legend
  svg.insertAdjacentHTML('beforeend', `
    <g transform="translate(${-size/2 + 10}, ${size/2 - 28})">
      <line x1="0" y1="0" x2="20" y2="0" class="gen" stroke-width="2" />
      <text x="26" y="4" fill="var(--ink-3)" font-size="10">相生</text>
      <line x1="60" y1="0" x2="80" y2="0" class="res" stroke-width="1.5" />
      <text x="86" y="4" fill="var(--ink-3)" font-size="10">相克</text>
    </g>`);
  svgWrap.innerHTML = '';
  svgWrap.appendChild(svg);

  // Table
  const trigById = Object.fromEntries(trigrams.map((t) => [t.id, t]));
  tableEl.innerHTML = '';
  wuxing.elements.forEach((e) => {
    const trigs = e.trigrams.map((id) => `<span title="${trigById[id].name_zh} (${trigById[id].name_en})">${trigById[id].symbol}</span>`).join('');
    const div = document.createElement('div');
    div.className = 'wuxing-row';
    div.innerHTML = `
      <div class="name">${e.name_zh}</div>
      <div>
        <div style="font-size:13px;color:var(--ink);margin-bottom:4px;">${e.summary}</div>
        <div class="trigs">${trigs}</div>
        <dl class="meta">
          <span class="pair"><dt>色:</dt><dd>${e.color}</dd></span>
          <span class="pair"><dt>季:</dt><dd>${e.season}</dd></span>
          <span class="pair"><dt>方:</dt><dd>${e.direction}</dd></span>
          <span class="pair"><dt>臓:</dt><dd>${e.organ}</dd></span>
          <span class="pair"><dt>徳:</dt><dd>${e.virtue}</dd></span>
          <span class="pair"><dt>情:</dt><dd>${e.emotion}</dd></span>
          <span class="pair"><dt>味:</dt><dd>${e.taste}</dd></span>
          <span class="pair"><dt>気:</dt><dd>${e.climate}</dd></span>
        </dl>
      </div>
    `;
    tableEl.appendChild(div);
  });
}

// ============================================================
// Coin toss (擲銭法 / structure-experience random generator)
// ============================================================
function castOneThrow() {
  // 3 coins, heads=3, tails=2
  let sum = 0;
  const faces = [];
  for (let i = 0; i < 3; i++) {
    const isHeads = Math.random() < 0.5;
    faces.push(isHeads ? 'heads' : 'tails');
    sum += isHeads ? 3 : 2;
  }
  return { sum, faces };
}

function classify(sum) {
  // 6: old-yin (changing) → bit=0 now, 1 in transformed
  // 7: young-yang (stable) → bit=1
  // 8: young-yin (stable) → bit=0
  // 9: old-yang (changing) → bit=1 now, 0 in transformed
  switch (sum) {
    case 6: return { bit: 0, transformed: 1, type: '老陰', changing: true };
    case 7: return { bit: 1, transformed: 1, type: '少陽', changing: false };
    case 8: return { bit: 0, transformed: 0, type: '少陰', changing: false };
    case 9: return { bit: 1, transformed: 0, type: '老陽', changing: true };
  }
}

function bitsToHexLookup(bits, hexagrams) {
  const lower = bits[0] | (bits[1] << 1) | (bits[2] << 2);
  const upper = bits[3] | (bits[4] << 1) | (bits[5] << 2);
  const fuxi = upper * 8 + lower;
  return hexagrams.find((h) => h.fuxi === fuxi);
}

function setupCoins(hexagrams, worldview) {
  const root = document.getElementById('coins-throws');
  const result = document.getElementById('coins-result');
  const castBtn = document.getElementById('coins-cast');
  const stepBtn = document.getElementById('coins-step');
  const resetBtn = document.getElementById('coins-reset');
  if (!root || !castBtn) return;

  const throws = []; // each: { sum, faces, bit, transformed, type, changing }

  const renderThrows = () => {
    root.innerHTML = '';
    if (throws.length === 0) {
      root.innerHTML = '<div class="muted" style="text-align:center;padding:40px 16px;">「投げる」ボタンを押して始めてください</div>';
      return;
    }
    throws.forEach((t, i) => {
      const row = document.createElement('div');
      row.className = `coins-throw ${t.changing ? 'is-changing' : ''}`;
      const coins = t.faces.map((f) => `<span class="coin ${f}">${f === 'heads' ? '陽' : '陰'}</span>`).join('');
      row.innerHTML = `
        <span class="lbl">第${i + 1}爻</span>
        <span class="face">${coins} <span style="margin-left:6px;color:var(--ink-3);">=${t.sum}</span></span>
        <span class="yao">
          <span class="bar ${t.bit ? 'yang' : 'yin'}"></span>
          <span>${t.type}${t.changing ? ' <span class="change">変爻</span>' : ''}</span>
        </span>
      `;
      root.appendChild(row);
    });
  };

  const renderResult = () => {
    if (throws.length < 6) { result.hidden = true; return; }
    const bits     = throws.map((t) => t.bit);
    const transBits = throws.map((t) => t.transformed);
    const original = bitsToHexLookup(bits, hexagrams);
    const transformed = bitsToHexLookup(transBits, hexagrams);
    const hasChanges = throws.some((t) => t.changing);
    const sameAsOriginal = original && transformed && original.kw === transformed.kw;

    result.hidden = false;
    result.innerHTML = `
      <h3>本卦${hasChanges && !sameAsOriginal ? ' → 之卦' : ''}</h3>
      <div class="coins-result__hex">
        <a href="#hexagrams/${original.kw}" class="pane" data-jump-kw="${original.kw}">
          <span class="sym">${original.symbol}</span>
          <span class="nm">${original.name_zh}</span>
          <span class="meta">本卦 ・ KW#${original.kw}</span>
        </a>
        ${hasChanges && !sameAsOriginal ? `
          <span class="arrow">→</span>
          <a href="#hexagrams/${transformed.kw}" class="pane" data-jump-kw="${transformed.kw}">
            <span class="sym">${transformed.symbol}</span>
            <span class="nm">${transformed.name_zh}</span>
            <span class="meta">之卦 ・ KW#${transformed.kw}</span>
          </a>
        ` : (hasChanges ? '<span class="arrow"></span><div></div>' : '<div></div><div></div>')}
      </div>
      <p class="muted" style="font-size:13px;margin:0;">
        変爻数: <strong style="color:var(--gold);">${throws.filter((t) => t.changing).length}</strong> /6 ・
        ${hasChanges
          ? '変爻が示すのは「今の状態が次の状態へ移ろうとしている方向」です。'
          : '変爻なし: 状態は当面そのまま動かないことを示唆します(構造的に)。'}
      </p>
      <div class="save">
        <button id="coins-save" type="button" class="btn">📖 ジャーナルに残す</button>
        <button id="coins-again" type="button" class="seg__btn">もう一度</button>
      </div>
    `;
    document.getElementById('coins-again')?.addEventListener('click', () => {
      throws.length = 0; renderThrows(); result.hidden = true;
    });
    document.getElementById('coins-save')?.addEventListener('click', () => {
      const snap = {
        ts: Date.now(),
        type: 'coins',
        title: `擲銭: ${original.name_zh}${hasChanges && !sameAsOriginal ? ' → ' + transformed.name_zh : ''}`,
        kw: hasChanges && !sameAsOriginal ? [original.kw, transformed.kw] : [original.kw],
        principles: [],
        situation: throws.map((t, i) => `第${i+1}爻=${t.type}(${t.sum})`).join(' / '),
        action: '', reflection: '',
        date: new Date().toISOString().slice(0, 10),
      };
      try {
        const list = JSON.parse(localStorage.getItem('eki:journal') || '[]');
        list.unshift(snap);
        localStorage.setItem('eki:journal', JSON.stringify(list));
        const btn = document.getElementById('coins-save');
        btn.textContent = '✓ 保存しました';
        btn.disabled = true;
      } catch (e) {
        alert('localStorage への保存に失敗しました: ' + e.message);
      }
    });
  };

  castBtn.addEventListener('click', () => {
    throws.length = 0;
    for (let i = 0; i < 6; i++) {
      const t = castOneThrow();
      throws.push({ ...t, ...classify(t.sum) });
    }
    renderThrows();
    renderResult();
  });

  stepBtn.addEventListener('click', () => {
    if (throws.length >= 6) return;
    const t = castOneThrow();
    throws.push({ ...t, ...classify(t.sum) });
    renderThrows();
    if (throws.length === 6) renderResult();
  });

  resetBtn.addEventListener('click', () => {
    throws.length = 0; renderThrows(); result.hidden = true;
  });

  renderThrows();
}

async function main() {
  setupTabs();
  setupYinYang();
  setupSearch();
  try {
    await loadData();
    setupTrigrams(state.trigrams);
    setupHexagrams(state.trigrams, state.hexagrams);
    setupWorldview(state.worldview, state.hexagrams);
    setupApplications(state.applications, state.hexagrams, state.worldview);
    setupLegacy(state.figures, state.disciplines, state.hexagrams, state.worldview);
    setupScience(state.trigrams, state.hexagrams);
    setupDiagnose(state.diagnose, state.hexagrams, state.worldview);
    setupJournal(state.hexagrams, state.worldview);
    setupLearn(state.curriculum);
    setupStory(state.sequence, state.hexagrams);
    setupCases(state.cases, state.hexagrams, state.worldview);
    setupWuxing(state.wuxing, state.trigrams);
    setupCoins(state.hexagrams, state.worldview);
    document.dispatchEvent(new CustomEvent('eki:data-loaded', { detail: state }));
    // Honor deep-link hash now that all renderers have initialized
    routeFromHash();
  } catch (err) {
    console.error('[eki] データロード失敗', err);
    document.querySelectorAll('.section__placeholder').forEach((el) => {
      el.textContent = 'データのロードに失敗しました。`python3 -m http.server` 経由で開いてください。';
    });
  }
}

document.addEventListener('DOMContentLoaded', main);

export { state };
