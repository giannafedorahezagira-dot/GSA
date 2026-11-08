/* ============================================================
   ÉLAN — shop.js
   Product listing page: URL-driven filters (gender, cat, sub,
   sale, new, q), sidebar filters (category, size, color, price),
   sorting, active pills, load-more and the mobile filter drawer
   ============================================================ */

(function () {
  'use strict';
  const E = window.ELAN;
  const PRODUCTS = window.ELAN_PRODUCTS || [];

  /* ---------- filter state ---------- */
  const state = {
    gender: E.getParam('gender') || '',
    cat: E.getParam('cat') || '',
    sub: E.getParam('sub') || '',
    q: (E.getParam('q') || '').trim(),
    sale: E.getParam('sale') === '1',
    isNew: E.getParam('new') === '1',
    sort: E.getParam('sort') || 'featured',
    sizes: [],        // selected size strings
    colors: [],       // selected color names
    cats: [],         // selected category checkboxes (multi)
    priceMin: null,
    priceMax: null,
    shown: 12
  };

  /* if ?gender is present, preselect the single category checkbox */
  const ALL_CATS = ['clothing', 'shoes', 'accessories', 'beauty', 'sport'];

  /* ---------- title / breadcrumb helpers ---------- */

  function titleFor() {
    const parts = [];
    if (state.q) return `Search: “${state.q}”`;
    if (state.gender === 'women' || state.gender === 'men') {
      parts.push(E.GENDER_LABEL[state.gender]);
    } else if (state.gender) {
      parts.push(E.GENDER_LABEL[state.gender]);
    }
    if (state.cat) parts.push(E.CATEGORY_LABEL[state.cat]);
    if (state.sub) parts.push(E.capitalize(state.sub.replace(/s$/, '')) + 's');
    if (state.sale) return parts.length ? parts.join(' ') + ' — Sale' : 'Sale';
    if (state.isNew) return parts.length ? parts.join(' ') + ' — New Arrivals' : 'New Arrivals';
    return parts.length ? parts.join(' ') : 'All Products';
  }

  function subtitleFor() {
    if (state.q) return `Results for “${state.q}” across the full ÉLAN collection`;
    if (state.sale) return 'Final markdowns — up to 50% off. While stocks last.';
    if (state.isNew) return 'The latest drops, updated weekly.';
    return 'Hand-picked styles from the ÉLAN studio.';
  }

  /* ---------- core filtering ---------- */

  function matches(p) {
    if (state.gender && p.gender !== state.gender && p.gender !== 'unisex') return false;
    if (state.cat && p.category !== state.cat) return false;
    if (state.sub && p.sub !== state.sub) return false;
    if (state.sale && !p.oldPrice) return false;
    if (state.isNew && !p.isNew) return false;
    if (state.cats.length && !state.cats.includes(p.category)) return false;
    if (state.sizes.length && !p.sizes.some(s => state.sizes.includes(s))) return false;
    if (state.colors.length && !p.colors.some(c => state.colors.includes(c.name))) return false;
    if (state.priceMin != null && p.price < state.priceMin) return false;
    if (state.priceMax != null && p.price > state.priceMax) return false;
    if (state.q) {
      const hay = `${p.name} ${p.brand} ${p.category} ${p.sub} ${p.tags.join(' ')}`.toLowerCase();
      if (!state.q.toLowerCase().split(/\s+/).every(w => hay.includes(w))) return false;
    }
    return true;
  }

  function sortList(list) {
    const l = list.slice();
    switch (state.sort) {
      case 'price-asc': return l.sort((a, b) => a.price - b.price);
      case 'price-desc': return l.sort((a, b) => b.price - a.price);
      case 'popular': return l.sort((a, b) => b.popularity - a.popularity);
      case 'rating': return l.sort((a, b) => b.rating - a.rating);
      case 'new': return l.sort((a, b) => (b.isNew - a.isNew) || (b.popularity - a.popularity));
      default: /* featured = popularity, sale first */
        return l.sort((a, b) => (b.oldPrice ? 1 : 0) - (a.oldPrice ? 1 : 0) || b.popularity - a.popularity);
    }
  }

  /* ---------- render: filter sidebar ---------- */

  function availableSizes() {
    const set = new Set();
    filteredBase().forEach(p => p.sizes.forEach(s => set.add(s)));
    const order = ['XS', 'S', 'M', 'L', 'XL', 'One Size', '36', '37', '38', '39', '40', '41', '42'];
    return [...set].sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }

  function availableColors() {
    const map = new Map();
    filteredBase().forEach(p => p.colors.forEach(c => map.set(c.name, c)));
    return [...map.values()];
  }

  function filteredBase() {
    /* base pool WITHOUT the dimension being filtered (so sizes/colors
       lists don't shrink while you select them) */
    return PRODUCTS.filter(p => {
      if (state.gender && p.gender !== state.gender && p.gender !== 'unisex') return false;
      if (state.cat && p.category !== state.cat) return false;
      if (state.sub && p.sub !== state.sub) return false;
      if (state.sale && !p.oldPrice) return false;
      if (state.isNew && !p.isNew) return false;
      if (state.q) {
        const hay = `${p.name} ${p.brand} ${p.category} ${p.sub} ${p.tags.join(' ')}`.toLowerCase();
        if (!state.q.toLowerCase().split(/\s+/).every(w => hay.includes(w))) return false;
      }
      return true;
    });
  }

  function renderFilters() {
    const root = $('#filtersBody');
    if (!root) return;

    const catCounts = {};
    filteredBase().forEach(p => { catCounts[p.category] = (catCounts[p.category] || 0) + 1; });
    const catsToShow = state.cat ? [state.cat] : ALL_CATS.filter(c => catCounts[c]);

    const catHtml = catsToShow.map(c => `
      <label class="f-check">
        <input type="checkbox" data-fcat="${c}" ${state.cats.includes(c) ? 'checked' : ''}>
        <span>${E.CATEGORY_LABEL[c]}</span>
        <span class="f-count">${catCounts[c] || 0}</span>
      </label>`).join('');

    const sizeHtml = availableSizes().map(s =>
      `<button class="f-size ${state.sizes.includes(s) ? 'selected' : ''}" data-fsize="${E.esc(s)}">${E.esc(s)}</button>`).join('');

    const colorHtml = availableColors().map(c =>
      `<button class="f-color ${state.colors.includes(c.name) ? 'selected' : ''}" style="background:${c.hex}" data-fcolor="${E.esc(c.name)}" title="${E.esc(c.name)}" aria-label="${E.esc(c.name)}"></button>`).join('');

    const pricePresets = [
      { label: 'Under $50', min: null, max: 50 },
      { label: '$50–$100', min: 50, max: 100 },
      { label: '$100–$150', min: 100, max: 150 },
      { label: '$150+', min: 150, max: null }
    ];

    root.innerHTML = `
      <div class="f-group open">
        <button class="f-title" data-ftoggle>Category
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="f-body"><div class="f-body-inner">${catHtml || '<span style="font-size:12.5px;color:var(--muted)">No categories</span>'}</div></div>
      </div>
      <div class="f-group open">
        <button class="f-title" data-ftoggle>Size
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="f-body"><div class="f-body-inner"><div class="f-sizes">${sizeHtml || '<span style="font-size:12.5px;color:var(--muted)">—</span>'}</div></div></div>
      </div>
      <div class="f-group open">
        <button class="f-title" data-ftoggle>Color
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="f-body"><div class="f-body-inner"><div class="f-colors">${colorHtml || '<span style="font-size:12.5px;color:var(--muted)">—</span>'}</div></div></div>
      </div>
      <div class="f-group open">
        <button class="f-title" data-ftoggle>Price
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="f-body">
          <div class="f-body-inner">
            <div class="f-price-row">
              <div class="field"><label for="pMin">Min</label><input id="pMin" type="number" min="0" placeholder="0" value="${state.priceMin ?? ''}"></div>
              <div class="field"><label for="pMax">Max</label><input id="pMax" type="number" min="0" placeholder="200" value="${state.priceMax ?? ''}"></div>
            </div>
            <div class="f-price-quick">
              ${pricePresets.map((r, i) => `<button data-fprice="${i}" class="${state.priceMin === r.min && state.priceMax === r.max ? 'selected' : ''}">${r.label}</button>`).join('')}
            </div>
          </div>
        </div>
      </div>`;

    /* --- wire sidebar events --- */
    $$('[data-ftoggle]', root).forEach(btn => btn.addEventListener('click', () =>
      btn.closest('.f-group').classList.toggle('open')));

    $$('[data-fcat]', root).forEach(cb => cb.addEventListener('change', () => {
      state.cats = $$('[data-fcat]', root).filter(x => x.checked).map(x => x.dataset.fcat);
      update('cats');
    }));

    $$('[data-fsize]', root).forEach(b => b.addEventListener('click', () => {
      const s = b.dataset.fsize;
      state.sizes = state.sizes.includes(s) ? state.sizes.filter(x => x !== s) : state.sizes.concat(s);
      b.classList.toggle('selected');
      update('sizes');
    }));

    $$('[data-fcolor]', root).forEach(b => b.addEventListener('click', () => {
      const c = b.dataset.fcolor;
      state.colors = state.colors.includes(c) ? state.colors.filter(x => x !== c) : state.colors.concat(c);
      b.classList.toggle('selected');
      update('colors');
    }));

    const applyPrice = E.debounce(() => {
      const min = parseFloat($('#pMin').value);
      const max = parseFloat($('#pMax').value);
      state.priceMin = isNaN(min) ? null : min;
      state.priceMax = isNaN(max) ? null : max;
      update('price');
    }, 500);
    $('#pMin').addEventListener('input', applyPrice);
    $('#pMax').addEventListener('input', applyPrice);

    $$('.f-price-quick button', root).forEach(b => b.addEventListener('click', () => {
      const r = pricePresets[+b.dataset.fprice];
      state.priceMin = r.min;
      state.priceMax = r.max;
      $('#pMin').value = r.min ?? '';
      $('#pMax').value = r.max ?? '';
      update('price');
    }));
  }

  /* ---------- render: pills, grid, count ---------- */

  function renderPills() {
    const root = $('#activePills');
    const pills = [];
    if (state.q) pills.push({ label: `Search: ${state.q}`, clear: 'q' });
    state.cats.forEach(c => pills.push({ label: E.CATEGORY_LABEL[c], clear: 'cat', val: c }));
    state.sizes.forEach(s => pills.push({ label: `Size: ${s}`, clear: 'size', val: s }));
    state.colors.forEach(c => pills.push({ label: c, clear: 'color', val: c }));
    if (state.priceMin != null || state.priceMax != null) {
      pills.push({
        label: `${state.priceMin != null ? '$' + state.priceMin : '$0'} – ${state.priceMax != null ? '$' + state.priceMax : '∞'}`,
        clear: 'price'
      });
    }
    if (state.sale) pills.push({ label: 'On Sale', clear: 'sale' });
    if (state.isNew) pills.push({ label: 'New In', clear: 'new' });

    if (!pills.length) { root.innerHTML = ''; return; }
    root.innerHTML = pills.map(p =>
      `<span class="pill">${E.esc(p.label)}<button data-clear="${p.clear}" data-val="${E.esc(p.val || '')}" aria-label="Remove filter">×</button></span>`
    ).join('') + `<button class="pill pill--clear" id="pillClearAll">Clear all</button>`;

    $$('[data-clear]', root).forEach(b => b.addEventListener('click', () => {
      const { clear, val } = b.dataset;
      if (clear === 'q') state.q = '';
      if (clear === 'cat') state.cats = state.cats.filter(x => x !== val);
      if (clear === 'size') state.sizes = state.sizes.filter(x => x !== val);
      if (clear === 'color') state.colors = state.colors.filter(x => x !== val);
      if (clear === 'price') { state.priceMin = null; state.priceMax = null; }
      if (clear === 'sale') state.sale = false;
      if (clear === 'new') state.isNew = false;
      update();
    }));
    $('#pillClearAll').addEventListener('click', clearAll);
  }

  function clearAll() {
    state.cats = []; state.sizes = []; state.colors = [];
    state.priceMin = null; state.priceMax = null;
    state.q = ''; state.sale = false; state.isNew = false;
    update();
  }

  function renderGrid(list) {
    const grid = $('#shopGrid');
    const empty = $('#emptyState');
    const lmWrap = $('#loadMoreWrap');

    if (!list.length) {
      grid.innerHTML = '';
      empty.hidden = false;
      lmWrap.hidden = true;
      $('#emptyMsg').textContent = state.q
        ? `We couldn't find anything for “${state.q}”. Try a different word, or browse everything.`
        : 'Try removing a filter — there are more styles waiting.';
      return;
    }

    empty.hidden = true;
    const slice = list.slice(0, state.shown);
    grid.innerHTML = slice.map((p, i) => E.renderProductCard(p, { delay: Math.min(i % 12, 8) * 50 })).join('');
    E.initRevealFor('.p-card');

    lmWrap.hidden = list.length <= state.shown;
    if (list.length > state.shown) {
      $('#loadMoreInfo').textContent = `Showing ${slice.length} of ${list.length} products`;
    }

    $('#shopCount').textContent = `${list.length} ${list.length === 1 ? 'product' : 'products'}`;
  }

  /* ---------- update pipeline ---------- */

  function update(changed) {
    renderFilters();          // re-render so counts stay fresh
    renderPills();
    const list = sortList(PRODUCTS.filter(matches));
    state.shown = 12;
    renderGrid(list);
    if (changed) E.updateBadges();
  }

  /* ---------- URL sync (so filters are shareable) ---------- */

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.gender) p.set('gender', state.gender);
    if (state.cat) p.set('cat', state.cat);
    if (state.sub) p.set('sub', state.sub);
    if (state.q) p.set('q', state.q);
    if (state.sale) p.set('sale', '1');
    if (state.isNew) p.set('new', '1');
    if (state.sort !== 'featured') p.set('sort', state.sort);
    const qs = p.toString();
    history.replaceState(null, '', qs ? `shop.html?${qs}` : 'shop.html');
  }

  /* ---------- boot ---------- */

  document.addEventListener('DOMContentLoaded', () => {
    // header texts
    $('#shopTitle').textContent = titleFor();
    $('#shopSubtitle').textContent = subtitleFor();
    document.title = `${titleFor()} | ÉLAN`;

    // breadcrumb
    const crumb = $('#shopCrumbs');
    const bits = [`<a href="index.html">Home</a>`];
    if (state.gender && E.GENDER_LABEL[state.gender]) bits.push(`<span class="sep">/</span><span>${E.GENDER_LABEL[state.gender]}</span>`);
    if (state.cat) bits.push(`<span class="sep">/</span><span>${E.CATEGORY_LABEL[state.cat]}</span>`);
    bits.push(`<span class="sep">/</span><span class="current">${E.esc(titleFor())}</span>`);
    crumb.innerHTML = bits.join(' ');

    // skeleton first
    $('#shopGrid').innerHTML = E.skeletonCards(12);
    $('#shopCount').textContent = 'Loading…';

    // sort select
    const sortSel = $('#sortSelect');
    sortSel.value = state.sort === 'featured' ? 'popular' : state.sort;
    sortSel.addEventListener('change', () => { state.sort = sortSel.value; syncUrl(); update(); });

    // load more
    $('#loadMoreBtn').addEventListener('click', () => {
      state.shown += 8;
      const list = sortList(PRODUCTS.filter(matches));
      renderGrid(list);
    });

    // clear all
    $('#clearAllBtn').addEventListener('click', clearAll);

    // mobile filter drawer
    $('#openFilters').addEventListener('click', () => {
      $('#filtersPanel').classList.add('show');
      $('#closeFilters').style.display = 'inline-flex';
      E.ensureBackdrop().classList.add('show');
      document.body.style.overflow = 'hidden';
    });
    $('#closeFilters').addEventListener('click', () => {
      E.closeAllLayers();
    });
    // backdrop click closes the filter drawer too
    E.ensureBackdrop().addEventListener('click', () => E.closeAllLayers());

    setTimeout(() => {
      update();
      syncUrl();
    }, 400);
  });

  /* small helper on E for capitalize */
  if (!E.capitalize) E.capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
})();
