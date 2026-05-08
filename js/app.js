// 易経ビジュアライザー / Entry point
//
// このファイルは段階的に拡張する: 現時点ではタブ切替とデータロードの骨格のみ。
// 後続 issue で各セクションのレンダラを `sections/` 風に追加していく予定。

const state = {
  trigrams: [],
  hexagrams: [],
};

async function loadData() {
  const [trigrams, hexagrams, worldview, applications] = await Promise.all([
    fetch('data/trigrams.json').then((r) => r.json()),
    fetch('data/hexagrams.json').then((r) => r.json()),
    fetch('data/worldview.json').then((r) => r.json()),
    fetch('data/applications.json').then((r) => r.json()),
  ]);
  state.trigrams = trigrams;
  state.hexagrams = hexagrams;
  state.worldview = worldview;
  state.applications = applications;
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

async function main() {
  setupTabs();
  setupYinYang();
  try {
    await loadData();
    setupTrigrams(state.trigrams);
    setupHexagrams(state.trigrams, state.hexagrams);
    setupWorldview(state.worldview, state.hexagrams);
    setupApplications(state.applications, state.hexagrams, state.worldview);
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
