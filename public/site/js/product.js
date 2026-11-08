/* ============================================================
   ÉLAN — product.js
   Product details page: gallery, color/size selection,
   quantity, add to bag, wishlist, accordions, related products
   ============================================================ */

(function () {
  'use strict';
  const E = window.ELAN;

  const id = E.getParam('id');
  const p = E.findProduct(id);

  function stars(n) { return E.I.star.repeat(Math.round(n)); }

  /* ================= RENDER ================= */

  function render() {
    if (!p) {
      $('#pdpGrid').hidden = true;
      $('#pdpNotFound').hidden = false;
      return;
    }

    document.title = `${p.name} | ÉLAN`;

    /* breadcrumb */
    $('#pdpCrumbs').innerHTML = `
      <a href="index.html">Home</a><span class="sep">/</span>
      ${p.gender !== 'unisex' ? `<a href="${E.shopUrl({ gender: p.gender })}">${E.GENDER_LABEL[p.gender]}</a><span class="sep">/</span>` : ''}
      <a href="${E.shopUrl({ cat: p.category })}">${E.CATEGORY_LABEL[p.category]}</a><span class="sep">/</span>
      <span class="current">${E.esc(p.name)}</span>`;

    /* gallery */
    const imgs = p.images.slice(0, 3);
    $('#pdpMainImg').innerHTML = `
      <img id="pdpImg" src="${imgs[0]}" alt="${E.esc(p.name)}">
      <div class="pdp-badge">
        ${E.discountPct(p) ? `<span class="badge badge--sale">-${E.discountPct(p)}%</span>` : ''}
        ${p.isNew ? '<span class="badge">New</span>' : ''}
      </div>`;
    $('#pdpThumbs').innerHTML = imgs.map((src, i) => `
      <button class="${i === 0 ? 'active' : ''}" data-thumb="${src}" aria-label="View image ${i + 1}">
        <img src="${src}" alt="">
      </button>`).join('');

    $$('#pdpThumbs [data-thumb]').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#pdpThumbs button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const img = $('#pdpImg');
        img.src = btn.dataset.thumb;
        img.style.animation = 'none';
        void img.offsetWidth;      // restart the fade-in animation
        img.style.animation = '';
      });
    });

    /* info column */
    const oneSize = p.sizes.length <= 1;
    $('#pdpInfo').innerHTML = `
      <div class="pdp-brand">${E.esc(p.brand)} · ${E.CATEGORY_LABEL[p.category]}</div>
      <h1 class="pdp-title">${E.esc(p.name)}</h1>
      <div class="pdp-rating">
        <span class="stars">${stars(p.rating)}</span>
        <span><b>${p.rating}</b> / 5</span>
        <span>·</span>
        <span>${p.reviews} reviews</span>
        <span>·</span>
        <span style="color:var(--success);font-weight:600">${p.popularity > 85 ? 'Popular right now' : 'In stock'}</span>
      </div>
      <div class="pdp-price">
        ${p.oldPrice
          ? `<span class="old">${E.formatPrice(p.oldPrice)}</span><span class="now--sale">${E.formatPrice(p.price)}</span><span class="pdp-save">Save ${E.discountPct(p)}%</span>`
          : E.formatPrice(p.price)}
      </div>
      <p class="pdp-desc">${E.esc(p.desc)}</p>

      ${p.colors.length ? `
      <div class="opt-group" id="pdpColorGroup">
        <div class="opt-label">Color <span class="sel-name" id="pdpColorName">${E.esc(p.colors[0].name)}</span></div>
        <div class="swatch-row">
          ${p.colors.map((c, i) => `<button class="swatch ${i === 0 ? 'selected' : ''}" style="background:${c.hex}" data-color="${E.esc(c.name)}" aria-label="${E.esc(c.name)}"></button>`).join('')}
        </div>
      </div>` : ''}

      <div class="opt-group" id="pdpSizeGroup">
        <div class="opt-label">
          Size <span class="sel-name" id="pdpSizeName">${oneSize ? E.esc(p.sizes[0]) : 'Select a size'}</span>
        </div>
        <div class="size-row">
          ${p.sizes.map((s, i) => `<button class="size-chip ${oneSize ? 'selected' : ''}" data-size="${E.esc(s)}">${E.esc(s)}</button>`).join('')}
        </div>
        <p class="opt-error">Please choose a size first.</p>
        <a href="info.html?page=size-guide" style="font-size:12px;color:var(--muted);text-decoration:underline;text-underline-offset:3px;display:inline-block;margin-top:8px">Size guide</a>
      </div>

      <div class="pdp-buy-row">
        <button class="btn" id="pdpAdd">Add To Bag</button>
        <button class="wish-btn-lg ${E.inWishlist(p.id) ? 'active' : ''}" data-wish="${E.esc(p.id)}" aria-label="Toggle wishlist">${E.I.heart}</button>
      </div>
      <div class="pdp-buy-row" style="margin-top:10px">
        <button class="btn btn--outline btn--sm" id="pdpQuickAdd" style="flex:1">Buy With Quick Checkout</button>
      </div>

      <ul class="pdp-perks">
        <li>${E.I.truck} Free delivery over $75</li>
        <li>${E.I.refresh} 30-day free returns</li>
        <li>${E.I.lock} Secure checkout</li>
        <li>${E.I.check} ${p.oldPrice ? 'Reduced from ' + E.formatPrice(p.oldPrice) : 'Quality guaranteed'}</li>
      </ul>

      <div class="acc">
        <div class="acc-item open">
          <button class="acc-btn" data-acc>Details &amp; Care
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <div class="acc-panel"><div class="acc-body">
            <ul>${p.details.map(d => `<li>${E.esc(d)}</li>`).join('')}</ul>
          </div></div>
        </div>
        <div class="acc-item">
          <button class="acc-btn" data-acc>Delivery &amp; Returns
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <div class="acc-panel"><div class="acc-body">
            <ul>
              <li>Standard delivery 3–5 business days — free over $75, otherwise $4.99.</li>
              <li>Express delivery 1–2 business days — $9.99.</li>
              <li>Free 30-day returns. Send it back for a full refund, no questions asked.</li>
            </ul>
          </div></div>
        </div>
        <div class="acc-item">
          <button class="acc-btn" data-acc>Material Information
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <div class="acc-panel"><div class="acc-body">
            <ul>
              <li>Product code: ${E.esc(p.id.toUpperCase())}</li>
              <li>Designed in-house at the ÉLAN studio.</li>
              <li>Responsibly sourced materials — see our sustainability page for details.</li>
            </ul>
          </div></div>
        </div>
      </div>`;

    /* accordions */
    $$('#pdpInfo [data-acc]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.acc-item');
        const panel = $('.acc-panel', item);
        const isOpen = item.classList.contains('open');
        item.classList.toggle('open');
        panel.style.maxHeight = isOpen ? null : panel.scrollHeight + 'px';
      });
    });
    /* open first accordion by default */
    const firstAcc = $('#pdpInfo .acc-item.open .acc-panel');
    if (firstAcc) firstAcc.style.maxHeight = firstAcc.scrollHeight + 'px';

    /* option selection */
    $$('#pdpColorGroup .swatch').forEach(s => s.addEventListener('click', () => {
      $$('#pdpColorGroup .swatch').forEach(x => x.classList.remove('selected'));
      s.classList.add('selected');
      $('#pdpColorName').textContent = s.dataset.color;
    }));
    $$('#pdpSizeGroup .size-chip').forEach(s => s.addEventListener('click', () => {
      $$('#pdpSizeGroup .size-chip').forEach(x => x.classList.remove('selected'));
      s.classList.add('selected');
      $('#pdpSizeName').textContent = s.dataset.size;
      $('#pdpSizeGroup').classList.remove('invalid');
    }));

    /* add to bag */
    $('#pdpAdd').addEventListener('click', () => {
      const sizeEl = $('#pdpSizeGroup .size-chip.selected');
      if (!oneSize && !sizeEl) {
        $('#pdpSizeGroup').classList.add('invalid');
        $('#pdpSizeGroup').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      const colorEl = $('#pdpColorGroup .swatch.selected');
      E.addToCart(p.id, {
        size: sizeEl ? sizeEl.dataset.size : p.sizes[0],
        color: colorEl ? colorEl.dataset.color : (p.colors[0] && p.colors[0].name)
      });
      E.toast(`Added to bag — ${E.esc(p.name)}`, { link: 'cart.html', linkText: 'View Bag' });
      E.openMiniCart();
    });

    /* quick checkout: add + go straight to checkout */
    $('#pdpQuickAdd').addEventListener('click', () => {
      const sizeEl = $('#pdpSizeGroup .size-chip.selected');
      if (!oneSize && !sizeEl) {
        $('#pdpSizeGroup').classList.add('invalid');
        return;
      }
      const colorEl = $('#pdpColorGroup .swatch.selected');
      E.addToCart(p.id, {
        size: sizeEl ? sizeEl.dataset.size : p.sizes[0],
        color: colorEl ? colorEl.dataset.color : (p.colors[0] && p.colors[0].name)
      });
      window.location.href = 'checkout.html';
    });

    renderRelated();
  }

  /* ================= RELATED ================= */

  function renderRelated() {
    const root = $('#relatedGrid');
    if (!root) return;
    const related = (window.ELAN_PRODUCTS || [])
      .filter(x => x.id !== p.id && (x.category === p.category || x.gender === p.gender))
      .sort((a, b) => (b.category === p.category) - (a.category === p.category) || b.popularity - a.popularity)
      .slice(0, 4);
    root.innerHTML = related.map((x, i) => E.renderProductCard(x, { delay: i * 60 })).join('');
  }

  document.addEventListener('DOMContentLoaded', render);
})();
