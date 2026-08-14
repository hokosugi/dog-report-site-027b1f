'use strict';

const DATA_URL = 'data/reports.json';

const TYPE_LABEL = {
  meal: '食事・おやつ',
  elimination: '排泄',
  walk: '散歩',
  health: '体調・健康',
  behavior: 'しつけ・行動',
  play_other: '遊び・その他',
};

const TYPE_ORDER = ['meal', 'elimination', 'walk', 'health', 'behavior', 'play_other'];

const el = {
  reports: document.getElementById('reports'),
  search: document.getElementById('search'),
  count: document.getElementById('count'),
  empty: document.getElementById('empty'),
  error: document.getElementById('error'),
  lightbox: document.getElementById('lightbox'),
  filterRow: document.getElementById('filterRow'),
};

let allReports = [];
let activeType = null; // null = すべて

init();

async function init() {
  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`データ取得に失敗しました (HTTP ${res.status})`);
    const data = await res.json();
    // 新しい順（date + time 降順）
    allReports = (Array.isArray(data) ? data : []).sort(
      (a, b) => key(b).localeCompare(key(a))
    );
    buildFilterChips();
    applyFilters();
  } catch (err) {
    el.error.textContent = err.message;
    el.error.hidden = false;
  }

  el.search.addEventListener('input', applyFilters);
  setupLightbox();
}

function key(r) {
  return `${r.date || ''} ${r.time || ''}`;
}

function buildFilterChips() {
  const present = TYPE_ORDER.filter((t) => allReports.some((r) => r.type === t));
  el.filterRow.innerHTML = '';
  el.filterRow.appendChild(chip(null, 'すべて'));
  for (const t of present) el.filterRow.appendChild(chip(t, TYPE_LABEL[t]));
}

function chip(type, label) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'filter-chip' + (activeType === type ? ' active' : '');
  btn.textContent = label;
  if (type) btn.style.setProperty('--chip-color', `var(--c-${type})`);
  btn.addEventListener('click', () => {
    activeType = type;
    buildFilterChips();
    applyFilters();
  });
  return btn;
}

function applyFilters() {
  const q = el.search.value.trim().toLowerCase();
  let list = allReports;
  if (activeType) list = list.filter((r) => r.type === activeType);
  if (q) list = list.filter((r) => matches(r, q));
  render(list);
}

function matches(r, q) {
  const cat = r[r.type] || {};
  const hay = [
    r.summary, r.recorder, r.note,
    cat.food_name, cat.appetite,
    cat.kind, cat.stool_condition,
    cat.place, cat.condition,
    cat.medication, cat.symptom, cat.vet_name,
    cat.behavior_type, cat.trigger,
    cat.description,
  ].join(' ').toLowerCase();
  return hay.includes(q);
}

function render(list) {
  el.reports.innerHTML = '';
  el.count.textContent = `${list.length} 件`;
  el.empty.hidden = list.length !== 0;
  for (const r of list) el.reports.appendChild(card(r));
}

function card(r) {
  const wrap = document.createElement('article');
  wrap.className = 'report';

  wrap.appendChild(head(r));

  const body = document.createElement('div');
  body.className = 'report-body';

  if (r.summary) {
    const summary = document.createElement('p');
    summary.className = 'summary';
    summary.textContent = r.summary;
    body.appendChild(summary);
  }

  body.appendChild(factsTable(r));

  if (r.note) {
    const note = document.createElement('div');
    note.className = 'note';
    note.textContent = r.note;
    body.appendChild(note);
  }

  if (r.media) body.appendChild(mediaEl(r.media));

  wrap.appendChild(body);
  return wrap;
}

function head(r) {
  const h = document.createElement('div');
  h.className = 'report-head';
  const typeSpan = r.type
    ? `<span class="report-type" style="--type-color: var(--c-${r.type})">${esc(TYPE_LABEL[r.type] || r.type)}</span>`
    : '';
  h.innerHTML = `
    <span class="report-date">${esc(r.date || '')}</span>
    <span class="report-time">${esc(r.time || '')}</span>
    ${typeSpan}
    ${r.recorder ? `<span class="report-recorder">記録：${esc(r.recorder)}</span>` : ''}
  `;
  return h;
}

function factsTable(r) {
  const cat = r[r.type] || {};
  const rows = [];

  switch (r.type) {
    case 'meal':
      rows.push(row('フード・おやつ', esc(cat.food_name || '—')));
      rows.push(row('量', gramCell(cat.amount_g)));
      rows.push(row('おやつ', boolCell(cat.snack)));
      rows.push(row('食べ具合', esc(cat.appetite || '—')));
      break;
    case 'elimination':
      rows.push(row('種類', esc(cat.kind || '—')));
      rows.push(row('状態', esc(cat.stool_condition || '—')));
      rows.push(row('回数', numCell(cat.count)));
      break;
    case 'walk':
      rows.push(row('時間', formatDuration(cat.duration_min)));
      rows.push(row('距離', cat.distance_km != null ? `${esc(String(cat.distance_km))} km` : '—'));
      rows.push(row('場所', esc(cat.place || '—')));
      rows.push(row('様子', esc(cat.condition || '—')));
      if (cat.weather) rows.push(row('天気', esc(cat.weather)));
      break;
    case 'health':
      rows.push(row('体重', cat.weight_kg != null ? `${esc(String(cat.weight_kg))} kg` : '—'));
      rows.push(row('通院', boolCell(cat.hospital_visit)));
      rows.push(row('薬', esc(cat.medication || '—')));
      rows.push(row('症状', esc(cat.symptom || '—')));
      rows.push(row('動物病院', esc(cat.vet_name || '—')));
      break;
    case 'behavior':
      rows.push(row('種類', esc(cat.behavior_type || '—')));
      rows.push(row('きっかけ', esc(cat.trigger || '—')));
      break;
    case 'play_other':
      rows.push(row('内容', esc(cat.description || '—')));
      break;
    default:
      break;
  }

  const table = document.createElement('table');
  table.className = 'facts';
  table.innerHTML = `<tbody>${rows.join('')}</tbody>`;
  return table;
}

function row(label, valueHtml) {
  return `<tr><th>${label}</th><td>${valueHtml}</td></tr>`;
}

function boolCell(v) {
  if (v === true) return 'はい';
  if (v === false) return 'いいえ';
  return '<span class="tag-none">—</span>';
}

function numCell(v) {
  return v != null && v !== '' ? esc(String(v)) : '<span class="tag-none">—</span>';
}

function gramCell(v) {
  return v != null && v !== '' ? `${esc(String(v))} g` : '<span class="tag-none">—</span>';
}

function formatDuration(min) {
  if (min == null || min === '') return '<span class="tag-none">—</span>';
  const n = Number(min);
  if (Number.isNaN(n)) return esc(String(min));
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h && m) return `${h}時間${m}分`;
  if (h) return `${h}時間`;
  return `${m}分`;
}

function resolveSrc(file) {
  const f = String(file || '');
  return /^https?:\/\//.test(f) ? f : `data/${f}`;
}

function mediaEl(media) {
  if (media.type === 'video') {
    const wrap = document.createElement('div');

    const frame = document.createElement('div');
    frame.className = 'video-frame';
    const iframe = document.createElement('iframe');
    iframe.src = media.file;
    iframe.allow = 'autoplay; fullscreen';
    iframe.allowFullscreen = true;
    iframe.setAttribute('allowfullscreen', ''); // 一部ブラウザ向けの旧属性も併記
    iframe.referrerPolicy = 'no-referrer';
    iframe.addEventListener('error', () => {
      frame.classList.add('img-error');
      frame.innerHTML = '';
      frame.appendChild(fallback());
    });
    frame.appendChild(iframe);
    wrap.appendChild(frame);

    if (media.link) {
      const link = document.createElement('a');
      link.className = 'video-open-link';
      link.href = media.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = '大きな画面で見る（Driveで開く）';
      wrap.appendChild(link);
    }

    return wrap;
  }
  return figure(media);
}

function figure(img) {
  const fig = document.createElement('figure');
  const image = document.createElement('img');
  image.src = resolveSrc(img.file);
  image.referrerPolicy = 'no-referrer';
  image.alt = '';
  image.loading = 'lazy';
  image.addEventListener('click', () => openLightbox(img));
  image.addEventListener('error', () => {
    fig.classList.add('img-error');
    image.replaceWith(fallback());
  });
  fig.appendChild(image);
  return fig;
}

function fallback() {
  const div = document.createElement('div');
  div.className = 'img-fallback';
  div.textContent = '表示できません（Driveの共有設定を確認）';
  return div;
}

function setupLightbox() {
  const closeBtn = el.lightbox.querySelector('.lightbox-close');
  const close = () => { el.lightbox.hidden = true; };
  closeBtn.addEventListener('click', close);
  el.lightbox.addEventListener('click', (e) => {
    if (e.target === el.lightbox) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

function openLightbox(img) {
  el.lightbox.querySelector('img').src = resolveSrc(img.file);
  el.lightbox.querySelector('.lightbox-caption').textContent = '';
  el.lightbox.hidden = false;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
