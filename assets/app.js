(() => {
  'use strict';

  const app = document.getElementById('app');
  const nav = document.getElementById('nav');
  const footer = document.getElementById('footer');
  const toggle = nav.querySelector('.nav__toggle');
  const player = document.getElementById('player');
  const playerFrame = player.querySelector('.player__frame');

  let works = [];
  let site = {};
  let filter = '전체';
  let renderToken = 0;

  // ---------- helpers ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => {
    const s = String(u ?? '').trim();
    return /^(https?:\/\/|\/|mailto:|tel:)/i.test(s) ? s : '';
  };
  const nl2br = (s) => esc(s).replace(/\n/g, '<br>');
  // 관리자 '소개' 칸의 글자 효과(굵게·밑줄·취소선·기울임)만 HTML로 바꾼다. 다른 태그는 모두 글자로 보인다.
  // 관리자 편집기가 저장한 HTML에서 허용한 서식만 남긴다. 문단 하나 = 한 줄, 빈 문단 = 빈 줄.
  const RICH_TAGS = { strong: 'strong', b: 'strong', em: 'em', i: 'em', u: 'u', s: 's', del: 's', strike: 's' };
  function richHTML(html) {
    const doc = new DOMParser().parseFromString(String(html), 'text/html');
    const inline = (node) => [...node.childNodes].map((n) => {
      if (n.nodeType === 3) return esc(n.textContent);
      if (n.nodeType !== 1) return '';
      const tag = n.tagName.toLowerCase();
      if (tag === 'br') return '\n';
      const inner = inline(n);
      const deco = (n.getAttribute('style') || '').toLowerCase();
      let out = RICH_TAGS[tag] ? `<${RICH_TAGS[tag]}>${inner}</${RICH_TAGS[tag]}>` : inner;
      if (!RICH_TAGS[tag]) {
        if (/font-weight:\s*(bold|[6-9]00)/.test(deco)) out = `<strong>${out}</strong>`;
        if (/font-style:\s*italic/.test(deco)) out = `<em>${out}</em>`;
        if (/underline/.test(deco)) out = `<u>${out}</u>`;
        if (/line-through/.test(deco)) out = `<s>${out}</s>`;
      }
      return out;
    }).join('');
    const blocks = [];
    for (const n of doc.body.childNodes) {
      if (n.nodeType === 1 && /^(p|div|h[1-6]|li|blockquote)$/i.test(n.tagName)) blocks.push(inline(n).replace(/\n$/, ''));
      else if (n.nodeType === 1 && /^(ul|ol)$/i.test(n.tagName)) [...n.children].forEach((li) => blocks.push(inline(li).replace(/\n$/, '')));
      else { const t = n.nodeType === 3 ? esc(n.textContent).trim() : inline({ childNodes: [n] }); if (t) blocks.push(t); }
    }
    return blocks.join('\n').replace(/\n/g, '<br>');
  }
  function richText(s) {
    if (/^\s*<(p|div|h[1-6]|ul|ol|blockquote|span|strong|b|em|i|u|s|br)[\s>/]/i.test(String(s ?? ''))) return richHTML(s);
    let t = String(s ?? '').replace(/\r\n?/g, '\n')
      .replace(/(?:\\| {2,})\n/g, '\n')   // 마크다운 줄바꿈 표시(\ 또는 끝 공백 2칸)
      .replace(/\\([\\`*_{}[\]()#+\-.!|~<>])/g, (_, c) => `\u0000${c.charCodeAt(0)}\u0000`);
    t = esc(t)
      .replace(/&lt;(\/?)u&gt;/gi, '<$1u>')
      .replace(/&lt;br\s*\/?&gt;/gi, '\n')
      .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<s>$1</s>')
      .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^\p{L}\p{N}_])__(?=\S)([\s\S]*?\S)__(?![\p{L}\p{N}_])/gu, '$1<strong>$2</strong>')
      .replace(/\*(?=\S)([^*\n]*?\S)\*/g, '<em>$1</em>')
      .replace(/(^|[^\p{L}\p{N}_])_(?=\S)([^_\n]*?\S)_(?![\p{L}\p{N}_])/gu, '$1<em>$2</em>')
      .replace(/\u0000(\d+)\u0000/g, (_, n) => `&#${n};`);
    return t.replace(/\n/g, '<br>');
  }
  const slugify = (s) => String(s).trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'work';
  const tel = (p) => String(p ?? '').replace(/[^\d+]/g, '');

  const PLAY = '<svg class="video__play" viewBox="0 0 72 72" fill="none" aria-hidden="true"><circle cx="36" cy="36" r="35" stroke="currentColor" stroke-width="2"/><path d="M29 24L49 36L29 48Z" fill="currentColor"/></svg>';
  const PLAY_SM = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.8L12 7L3 12.2Z" fill="currentColor"/></svg>';
  const BACK = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3L5 8L10 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICONS = {
    youtube: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 17a24.1 24.1 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.1 24.1 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>',
    mail: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
  };

  // ---------- 원본 비율 측정 ----------
  const aspects = new Map();
  const DEFAULT_ASPECT = 4 / 3;
  function measure(src) {
    const url = safeUrl(src);
    if (!url) return Promise.resolve(DEFAULT_ASPECT);
    if (aspects.has(url)) return Promise.resolve(aspects.get(url));
    return new Promise((resolve) => {
      const img = new Image();
      let done = false;
      const finish = (a) => {
        if (done) return;
        done = true;
        const v = a && isFinite(a) && a > 0 ? Math.min(Math.max(a, 0.3), 4) : DEFAULT_ASPECT;
        aspects.set(url, v);
        resolve(v);
      };
      img.onload = () => finish(img.naturalWidth / img.naturalHeight);
      img.onerror = () => finish(DEFAULT_ASPECT);
      setTimeout(() => finish(DEFAULT_ASPECT), 4000);
      img.src = url;
    });
  }
  const aspectOf = (src) => aspects.get(safeUrl(src)) || DEFAULT_ASPECT;
  const ensure = (srcs) => Promise.all(srcs.filter(Boolean).map(measure));

  // ---------- 링크 종류 판별 ----------
  const RATIOS = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1, '4:5': 4 / 5, '4:3': 4 / 3, '21:9': 21 / 9 };
  function parseMedia(m) {
    const u = String(m?.url ?? '').trim();
    let x;
    if ((x = u.match(/youtube\.com\/shorts\/([\w-]{11})/))) return { kind: 'youtube', id: x[1], vertical: true };
    if ((x = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|live\/))([\w-]{11})/))) return { kind: 'youtube', id: x[1] };
    if ((x = u.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/))) return { kind: 'vimeo', id: x[1], hash: x[2], url: u };
    if ((x = u.match(/instagram\.com\/(p|reel|reels|tv)\/([\w-]+)/))) return { kind: 'instagram', type: x[1] === 'reels' ? 'reel' : x[1], id: x[2], url: u };
    if (m?.image) return { kind: 'image' };
    if (safeUrl(u)) return { kind: 'link', url: u };
    return null;
  }
  const isVideo = (p) => p && (p.kind === 'youtube' || p.kind === 'vimeo');
  const firstVideo = (w) => {
    for (const m of w.media) { const p = parseMedia(m); if (isVideo(p)) return { m, p }; }
    return null;
  };
  const embedSrc = (p) => p.kind === 'youtube'
    ? `https://www.youtube-nocookie.com/embed/${p.id}?rel=0&autoplay=1`
    : `https://player.vimeo.com/video/${p.id}?autoplay=1${p.hash ? `&h=${p.hash}` : ''}`;

  // Vimeo: 실제 비율과 썸네일을 공개 oEmbed로 한 번만 조회
  const vimeoCache = new Map();
  function vimeoMeta(p) {
    if (!vimeoCache.has(p.id)) {
      const url = `https://vimeo.com/${p.id}${p.hash ? `/${p.hash}` : ''}`;
      vimeoCache.set(p.id, fetch(`https://vimeo.com/api/oembed.json?width=1280&url=${encodeURIComponent(url)}`)
        .then((r) => r.json())
        .then((j) => ({ a: j.width && j.height ? j.width / j.height : 16 / 9, thumb: j.thumbnail_url || '' }))
        .catch(() => ({ a: 16 / 9, thumb: '' })));
    }
    return vimeoCache.get(p.id);
  }
  async function videoAspect(m, p) {
    if (RATIOS[m.ratio]) return RATIOS[m.ratio];
    if (p.vertical) return 9 / 16;
    if (p.kind === 'vimeo') return (await vimeoMeta(p)).a;
    return 16 / 9;
  }

  // 이미지가 실제로 있는지 확인 (YouTube는 없는 썸네일 대신 120px 회색 이미지를 줌)
  function probe(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth > 120 ? url : '');
      img.onerror = () => resolve('');
      img.src = url;
    });
  }
  const ytThumbCache = new Map();
  function ytThumb(id, vertical) {
    const key = `${id}:${vertical ? 'v' : 'h'}`;
    if (!ytThumbCache.has(key)) {
      const base = `https://i.ytimg.com/vi/${id}/`;
      const tries = vertical ? ['oar2.jpg', 'maxresdefault.jpg', 'hqdefault.jpg'] : ['maxresdefault.jpg', 'sddefault.jpg', 'hqdefault.jpg'];
      ytThumbCache.set(key, (async () => {
        for (const t of tries) { const ok = await probe(base + t); if (ok) return ok; }
        return base + 'hqdefault.jpg';
      })());
    }
    return ytThumbCache.get(key);
  }
  async function autoThumb(p, a) {
    if (p.kind === 'youtube') return ytThumb(p.id, a < 1);
    if (p.kind === 'vimeo') return (await vimeoMeta(p)).thumb;
    return '';
  }

  // 작품 썸네일: 직접 지정한 대표 이미지 > 영상 링크 썸네일 > 상세 콘텐츠의 첫 이미지
  const thumbs = new Map();
  function resolveThumb(w) {
    if (!thumbs.has(w.slug)) {
      thumbs.set(w.slug, (async () => {
        if (safeUrl(w.cover)) return { src: w.cover, a: await measure(w.cover) };
        const v = firstVideo(w);
        if (v) {
          const a = await videoAspect(v.m, v.p);
          const src = await autoThumb(v.p, a);
          if (src) return { src, a };
        }
        const img = w.media.find((m) => safeUrl(m.image));
        if (img) return { src: img.image, a: await measure(img.image) };
        return { src: '', a: DEFAULT_ASPECT };
      })());
    }
    return thumbs.get(w.slug);
  }
  const thumbData = new Map(); // 계산이 끝난 값
  const ensureThumbs = (list) => Promise.all(list.map(async (w) => { thumbData.set(w.slug, await resolveThumb(w)); }));
  const thumbOf = (w) => thumbData.get(w.slug) || { src: w.cover || '', a: DEFAULT_ASPECT };

  // ---------- data ----------
  async function load() {
    const [w, s] = await Promise.all([
      fetch('/content/works.json', { cache: 'no-cache' }).then((r) => r.json()),
      fetch('/content/site.json', { cache: 'no-cache' }).then((r) => r.json()),
    ]);
    site = s || {};
    const seen = new Map();
    works = (w.works || []).map((it) => {
      let slug = slugify(it.title);
      const n = (seen.get(slug) || 0) + 1;
      seen.set(slug, n);
      if (n > 1) slug += `-${n}`;
      return { ...it, slug, media: it.media || [] };
    });
  }

  // 분류: 관리자에서 정한 순서대로, 실제 작업이 있는 분류만 보여 줍니다.
  function categoryList() {
    const used = new Set(works.map((w) => w.category).filter(Boolean));
    const ordered = (site.categories || []).map((c) => (typeof c === 'string' ? c : c?.name)).filter(Boolean);
    const out = ordered.filter((c) => used.has(c));
    for (const c of used) if (!out.includes(c)) out.push(c);
    return ['전체', ...out];
  }

  // ---------- 메이슨리 그리드 ----------
  const MQ_WIDE = window.matchMedia('(min-width: 768px)');
  const MQ_MID = window.matchMedia('(min-width: 480px)');
  const colCount = (kind) => (kind === 'gallery'
    ? (MQ_WIDE.matches ? 2 : 1)
    : (MQ_WIDE.matches ? 3 : MQ_MID.matches ? 2 : 1));
  const grids = new Map();
  let gridSeq = 0;

  function masonryInner(g) {
    const n = colCount(g.kind);
    const heights = new Array(n).fill(0);
    const cols = Array.from({ length: n }, () => []);
    const captionH = g.kind === 'gallery' ? 0.06 : 0.16;
    for (const it of g.items) {
      const k = heights.indexOf(Math.min(...heights));
      cols[k].push(g.render(it));
      heights[k] += 1 / g.aspect(it) + captionH;
    }
    return cols.map((c) => `<div class="masonry__col">${c.join('')}</div>`).join('');
  }
  function masonry(items, kind, render, aspect, mod = '') {
    const id = ++gridSeq;
    const g = { items, kind, render, aspect };
    grids.set(id, g);
    return `<div class="masonry masonry--${kind} ${mod}" data-gid="${id}">${masonryInner(g)}</div>`;
  }
  const relayout = () => document.querySelectorAll('.masonry[data-gid]').forEach((el) => {
    const g = grids.get(Number(el.dataset.gid));
    if (g) el.innerHTML = masonryInner(g);
  });
  MQ_WIDE.addEventListener('change', relayout);
  MQ_MID.addEventListener('change', relayout);

  // ---------- 카드 ----------
  // 마우스를 올리면: 영상 프로젝트는 "영상 재생" + "자세히보기", 사진 프로젝트는 "자세히보기"
  function card(w) {
    const video = firstVideo(w);
    const href = `#/work/${encodeURIComponent(w.slug)}`;
    const t = thumbOf(w);
    const cover = safeUrl(t.src);
    const a = t.a.toFixed(4);
    return `<article class="card" style="--a:${a}">
      <div class="card__media">
        ${cover ? `<img src="${esc(cover)}" alt="" loading="lazy" decoding="async">` : ''}
        <a class="card__link" href="${href}" tabindex="-1" aria-hidden="true"></a>
        <div class="card__actions">
          <div class="card__info">
            <h3 class="card__title">${esc(w.title)}</h3>
            <p class="card__meta">${esc([w.category, w.year].filter(Boolean).join(', '))}</p>
          </div>
          <div class="card__btns">
            ${video ? `<button class="card__btn card__btn--play" type="button" data-play="${esc(w.slug)}" aria-label="${esc(w.title)} 영상 재생">${PLAY_SM}<span>영상 재생</span></button>` : ''}
            <a class="card__btn card__btn--more" href="${href}" aria-label="${esc(w.title)} 자세히보기">자세히보기</a>
          </div>
        </div>
      </div>
    </article>`;
  }
  const grid = (list, mod = '') => (list.length
    ? masonry(list, 'cards', card, (w) => thumbOf(w).a, mod)
    : '<p class="empty">아직 이 분류에 올린 작업이 없습니다.</p>');

  // ---------- 영상 팝업 플레이어 ----------
  async function openPlayer(slug) {
    const w = works.find((x) => x.slug === slug);
    const v = w && firstVideo(w);
    if (!v) return;
    const a = await videoAspect(v.m, v.p);
    playerFrame.style.setProperty('--a', a.toFixed(4));
    player.style.setProperty('--pa', Math.max(a, 1).toFixed(4));
    const f = document.createElement('iframe');
    f.src = embedSrc(v.p);
    f.title = `${w.title} 영상`;
    f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
    f.allowFullscreen = true;
    playerFrame.replaceChildren(f);
    player.querySelector('.player__title').textContent = w.title;
    player.querySelector('.player__more').setAttribute('href', `#/work/${encodeURIComponent(w.slug)}`);
    player.showModal();
  }
  player.addEventListener('close', () => playerFrame.replaceChildren());
  player.addEventListener('click', (e) => {
    if (e.target === player || e.target.closest('.player__close') || e.target.closest('.player__more')) player.close();
  });

  // ---------- views ----------
  async function home() {
    const featured = works.filter((w) => w.featured);
    const list = featured.length ? featured : works.slice(0, 12);
    await ensureThumbs(list);
    return {
      title: '303호스튜디오',
      html: `
      <section class="hero" aria-labelledby="hero-title">
        <div class="wrap">
          <h1 class="display-xl hero__title" id="hero-title">${nl2br(site.tagline || '303호스튜디오')}</h1>
          ${site.intro ? `<p class="body-l hero__intro">${nl2br(site.intro)}</p>` : ''}
        </div>
      </section>
      <section class="section section--flush-top wrap" aria-labelledby="sel-title">
        <h2 class="visually-hidden" id="sel-title">대표 작업</h2>
        ${grid(list, 'masonry--feature')}
        <div class="more"><a class="btn" href="#/work">작업 전체 보기</a></div>
      </section>`,
    };
  }

  async function archive() {
    await ensureThumbs(works);
    const cats = categoryList();
    if (!cats.includes(filter)) filter = '전체';
    const list = filter === '전체' ? works : works.filter((w) => w.category === filter);
    return {
      title: 'Work | 303호스튜디오',
      html: `
      <section class="wrap page-head">
        <h1 class="display-l">Work</h1>
        ${cats.length > 2 ? `<div class="chips" role="group" aria-label="분류 필터">
          ${cats.map((c) => `<button class="chip" type="button" data-filter="${esc(c)}" aria-pressed="${c === filter}">${esc(c)}</button>`).join('')}
        </div>` : ''}
      </section>
      <section class="wrap section-bottom" aria-live="polite" id="archive-grid">${grid(list)}</section>`,
    };
  }

  function videoFigure(p, a, { label, poster, title, caption }) {
    const img = poster ? `<img src="${esc(safeUrl(poster))}" alt="" loading="lazy">` : '';
    return `<figure class="media media--video" style="--a:${a.toFixed(4)}">
      <button class="video" type="button" data-src="${esc(embedSrc(p))}" data-title="${esc(title)}" aria-label="${esc(title)} 재생">
        ${img}${PLAY}<span class="video__label">${esc(label)}</span>
      </button>${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}</figure>`;
  }

  async function mediaBlock(m, w) {
    const p = parseMedia(m);
    if (!p) return { html: '' };
    const cap = m.caption ? `<figcaption>${esc(m.caption)}</figcaption>` : '';
    if (isVideo(p)) {
      const a = await videoAspect(m, p);
      const poster = m.image || (await autoThumb(p, a)) || w.cover;
      return { html: videoFigure(p, a, { label: p.kind === 'youtube' ? 'YouTube 영상' : 'Vimeo 영상', poster, title: m.caption || w.title, caption: m.caption }) };
    }
    if (p.kind === 'instagram') {
      if (m.image) {
        const a = await measure(m.image);
        return { html: `<a class="ig" href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener" style="--a:${a.toFixed(4)}">
          <span class="ig__thumb"><img src="${esc(safeUrl(m.image))}" alt="" loading="lazy"></span>
          <span class="ig__text">
            <span class="ig__kind">Instagram ${p.type === 'reel' ? '릴스' : '게시물'}</span>
            <strong class="heading-s">${esc(m.caption || w.title)}</strong>
            <span class="btn">Instagram에서 보기</span>
          </span></a>` };
      }
      return { html: `<figure class="media media--ig"><iframe src="https://www.instagram.com/${p.type}/${encodeURIComponent(p.id)}/embed" loading="lazy" title="Instagram 게시물"></iframe>${cap}</figure>` };
    }
    if (p.kind === 'image') {
      const a = await measure(m.image);
      return {
        image: true,
        a,
        html: `<figure class="media media--image" style="--a:${a.toFixed(4)}"><div class="media__frame"><img src="${esc(safeUrl(m.image))}" alt="${esc(m.caption || w.title)}" loading="lazy" decoding="async"></div>${cap}</figure>`,
      };
    }
    return { html: `<p><a class="btn" href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener">${esc(m.caption || '링크 열기')}</a></p>` };
  }

  async function mediaList(w) {
    const blocks = await Promise.all(w.media.map((m) => mediaBlock(m, w)));
    const out = [];
    let run = [];
    const flush = () => {
      if (run.length > 1) out.push(masonry(run, 'gallery', (b) => b.html, (b) => b.a));
      else if (run.length) out.push(run[0].html.replace('media--image', 'media--image media--single'));
      run = [];
    };
    for (const b of blocks) {
      if (b.image) run.push(b);
      else { flush(); if (b.html) out.push(b.html); }
    }
    flush();
    return out.join('');
  }

  async function detail(slug) {
    const i = works.findIndex((w) => w.slug === slug);
    if (i < 0) return notFound();
    const w = works[i];
    const prev = works[i - 1];
    const next = works[i + 1];
    const meta = [['분류', w.category], ['연도', w.year], ['클라이언트', w.client], ['역할', w.role]].filter(([, v]) => v);
    const media = await mediaList(w);
    return {
      title: `${w.title} | 303호스튜디오`,
      html: `
      <article>
        <header class="wrap detail-head">
          <a class="back" href="#/work">${BACK}Work</a>
          <h1 class="display-l">${esc(w.title)}</h1>
          ${meta.length ? `<dl class="meta">${meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
          ${w.description ? `<p class="body-l detail-desc">${richText(w.description)}</p>` : ''}
        </header>
        <div class="wrap media-list">${media}</div>
        <nav class="wrap pager" aria-label="다른 작업">
          ${prev ? `<a href="#/work/${encodeURIComponent(prev.slug)}"><span class="label muted">이전 작업</span><span class="heading-s">${esc(prev.title)}</span></a>` : '<span></span>'}
          ${next ? `<a class="pager__next" href="#/work/${encodeURIComponent(next.slug)}"><span class="label muted">다음 작업</span><span class="heading-s">${esc(next.title)}</span></a>` : ''}
        </nav>
      </article>`,
    };
  }

  // 함께한 브랜드: 2줄로 나눠 옆으로 흐르는 로고 띠.
  // 로고마다 비율이 달라도 같은 면적으로 보이도록 √비율로 너비를 정한다.
  const LOGO_BAND_W = 880;   // 로고 띠 최대 폭(px) — style.css의 .marquees max-width와 같게
  const LOGO_S = 52;         // 정사각형 로고 기준 한 변(px)
  const LOGO_GAP = 48;       // 로고 사이 간격(px)
  const LOGO_SPEED = 30;     // 흐르는 속도(px/초)
  const logoW = (b) => (safeUrl(b.logo) ? LOGO_S * Math.sqrt(aspectOf(b.logo)) : 120) + LOGO_GAP;
  function logoItem(b, hidden) {
    const url = safeUrl(b.logo);
    const ra = Math.sqrt(aspectOf(b.logo)).toFixed(3);
    return `<li class="logo-box"${hidden ? ' aria-hidden="true"' : ` title="${esc(b.name)}"`}>${url
      ? `<img src="${esc(url)}" alt="${hidden ? '' : esc(b.name)}" loading="lazy" style="--ra:${ra}" onload="this.naturalHeight&&this.style.setProperty('--ra',Math.sqrt(this.naturalWidth/this.naturalHeight))">`
      : `<span>${esc(b.name)}</span>`}</li>`;
  }
  function logoMarquee(clients) {
    const rows = clients.length > 1
      ? [clients.filter((_, i) => i % 2 === 0), clients.filter((_, i) => i % 2 === 1)]
      : [clients];
    return `<div class="marquees">${rows.map((row, r) => {
      // 한 바퀴 분량이 띠 폭보다 길도록 반복한 뒤, 이어지게 두 번 붙인다.
      const rowW = row.reduce((s, b) => s + logoW(b), 0);
      const rep = Math.max(1, Math.ceil(LOGO_BAND_W / rowW));
      const set = Array.from({ length: rep }, () => row).flat();
      const items = set.map((b, i) => logoItem(b, i >= row.length)).join('')
        + set.map((b) => logoItem(b, true)).join('');
      return `<div class="marquee${r % 2 ? ' marquee--reverse' : ''}" style="--dur:${(rowW * rep / LOGO_SPEED).toFixed(1)}s">
        <ul class="marquee__track" role="list">${items}</ul>
      </div>`;
    }).join('')}</div>`;
  }

  async function about() {
    const c = site.company || {};
    const pr = site.process || {};
    const steps = pr.steps || [];
    const clients = (site.clients || []).filter((b) => b && (b.logo || b.name));
    await ensure(clients.map((b) => b.logo));
    return {
      title: 'About | 303호스튜디오',
      html: `
      <section class="hero hero--about" aria-labelledby="about-title">
        <div class="wrap">
          <h1 class="display-xl hero__title" id="about-title">${nl2br(site.tagline || '303호스튜디오')}</h1>
          ${site.intro ? `<p class="body-l hero__intro">${nl2br(site.intro)}</p>` : ''}
        </div>
      </section>

      ${steps.length ? `<section class="section process" aria-labelledby="process-title">
        <div class="wrap">
          <h2 class="heading-m" id="process-title">제작 과정</h2>
          ${pr.desc ? `<p class="body-l process__desc">${nl2br(pr.desc)}</p>` : ''}
          <ol class="steps">
            ${steps.map((s, i) => `<li class="step">
              <div class="step__photo">${safeUrl(s.image) ? `<img src="${esc(safeUrl(s.image))}" alt="${esc(s.ko || s.en)}" loading="lazy">` : ''}</div>
              <span class="label step__no">${i + 1}</span>
              <p class="step__en">${esc(s.en)}</p>
              <h3 class="heading-s step__ko">${esc(s.ko)}</h3>
            </li>`).join('')}
          </ol>
        </div>
      </section>` : ''}

      ${clients.length ? `<section class="section wrap clients" aria-labelledby="clients-title">
        <h2 class="heading-m" id="clients-title">함께한 브랜드</h2>
        ${logoMarquee(clients)}
      </section>` : ''}

      <section class="section contact" id="contact" aria-labelledby="contact-title">
        <div class="wrap">
          <h2 class="heading-m contact__title" id="contact-title">프로젝트 문의</h2>
          ${c.email ? `<a class="display-l contact__email" href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}
          ${c.phone ? `<p class="contact__info body-l"><a href="tel:${esc(tel(c.phone))}">${esc(c.phone)}</a></p>` : ''}
          <div class="contact__actions">
            ${c.email ? `<a class="btn btn--on-brand" href="mailto:${esc(c.email)}">메일 보내기</a>` : ''}
            ${safeUrl(c.youtube) ? `<a class="btn btn--on-brand" href="${esc(safeUrl(c.youtube))}" target="_blank" rel="noopener">YouTube</a>` : ''}
            ${safeUrl(c.instagram) ? `<a class="btn btn--on-brand" href="${esc(safeUrl(c.instagram))}" target="_blank" rel="noopener">Instagram</a>` : ''}
          </div>
        </div>
      </section>`,
    };
  }

  function notFound() {
    return {
      title: '페이지를 찾을 수 없습니다 | 303호스튜디오',
      html: `<section class="section wrap"><h1 class="display-l">페이지를 찾을 수 없습니다.</h1><p class="muted" style="margin-top:16px">주소가 바뀌었거나 삭제된 작업입니다.</p><p style="margin-top:32px"><a class="btn" href="#/work">작업 목록으로 가기</a></p></section>`,
    };
  }

  // ---------- 공통 하단 (모든 페이지 동일) ----------
  function renderFooter() {
    const c = site.company || {};
    const sep = '<span class="footer__sep" aria-hidden="true">|</span>';
    const social = [
      safeUrl(c.youtube) && `<a class="footer__icon" href="${esc(safeUrl(c.youtube))}" target="_blank" rel="noopener" aria-label="303호스튜디오 YouTube">${ICONS.youtube}</a>`,
      safeUrl(c.instagram) && `<a class="footer__icon" href="${esc(safeUrl(c.instagram))}" target="_blank" rel="noopener" aria-label="303호스튜디오 Instagram">${ICONS.instagram}</a>`,
      c.email && `<a class="footer__icon" href="mailto:${esc(c.email)}" aria-label="메일 보내기">${ICONS.mail}</a>`,
    ].filter(Boolean).join('');
    footer.innerHTML = `
      <div class="footer__inner">
        <div class="footer__info">
          <p class="footer__name">${esc(c.name || '303호스튜디오')}</p>
          ${c.bizNo || c.ceo ? `<p>${c.bizNo ? `사업자등록번호 : ${esc(c.bizNo)}` : ''}${c.bizNo && c.ceo ? sep : ''}${c.ceo ? `대표 : ${esc(c.ceo)}` : ''}</p>` : ''}
          ${c.phone || c.email ? `<p>${c.phone ? `<a href="tel:${esc(tel(c.phone))}">${esc(c.phone)}</a>` : ''}${c.phone && c.email ? sep : ''}${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}</p>` : ''}
          ${c.copyright ? `<p class="footer__copy">${esc(c.copyright)}</p>` : ''}
        </div>
        ${social ? `<div class="footer__social">${social}</div>` : ''}
      </div>`;
  }

  // ---------- router ----------
  async function route() {
    const token = ++renderToken;
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const key = parts[0] || 'home';
    document.body.dataset.page = key;
    closeMenu();
    if (player.open) player.close();
    nav.querySelectorAll('[data-nav]').forEach((a) => {
      if (a.dataset.nav === key) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    app.setAttribute('aria-busy', 'true');
    grids.clear();

    let view;
    if (key === 'home') view = await home();
    else if (key === 'work' && parts[1]) view = await detail(decodeURIComponent(parts[1]));
    else if (key === 'work') view = await archive();
    else if (key === 'about' || key === 'contact') view = await about();
    else view = notFound();
    if (token !== renderToken) return;

    document.title = view.title;
    app.innerHTML = view.html;
    app.removeAttribute('aria-busy');
    if (key === 'contact') document.getElementById('contact')?.scrollIntoView();
    else window.scrollTo(0, 0);
  }

  function closeMenu() {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', '메뉴 열기');
  }

  // ---------- events ----------
  toggle.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  });

  app.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-filter]');
    if (chip) {
      filter = chip.dataset.filter;
      app.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === chip)));
      const list = filter === '전체' ? works : works.filter((w) => w.category === filter);
      document.getElementById('archive-grid').innerHTML = grid(list);
      return;
    }
    const play = e.target.closest('[data-play]');
    if (play) { openPlayer(play.dataset.play); return; }
    const v = e.target.closest('.video[data-src]');
    if (v) {
      const f = document.createElement('iframe');
      f.src = v.dataset.src;
      f.title = v.dataset.title || '영상';
      f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
      f.allowFullscreen = true;
      const box = document.createElement('div');
      box.className = 'video';
      box.appendChild(f);
      v.replaceWith(box);
      f.focus();
    }
  });

  window.addEventListener('hashchange', route);

  load()
    .then(() => { renderFooter(); return route(); })
    .catch(() => {
      app.innerHTML = '<section class="section wrap"><h1 class="heading-m">콘텐츠를 불러오지 못했습니다.</h1><p class="muted" style="margin-top:16px">잠시 뒤 새로고침해 주세요.</p></section>';
    });
})();
