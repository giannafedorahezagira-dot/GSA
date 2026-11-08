/* ============================================================
   Delivery Master — home.js
   Homepage: hero slider, category tiles, trending grid,
   promo banners, new-arrivals scroll row, editorial image
   ============================================================ */

(function () {
  'use strict';
  const E = window.ELAN;
  const $ = E.$; const $$ = E.$$;
  const IMG = (window.ELAN && window.ELAN.IMG) || {};

  /* ================= HERO SLIDER ================= */

  const SLIDES = [
    {
      img: IMG.hero1,
      eyebrow: 'New Season · SS26',
      title: 'Dress Like It Matters',
      sub: 'Sharp tailoring, soft knits and everything in between — the new collection has landed.',
      ctas: [
        { label: 'Shop Women', href: E.shopUrl({ gender: 'women' }), cls: 'btn--light' },
        { label: 'Shop Men', href: E.shopUrl({ gender: 'men' }), cls: 'btn--ghost-light' }
      ]
    },
    {
      img: IMG.hero2,
      eyebrow: 'The Sale Shop',
      title: 'Up To 50% Off',
      sub: 'Final markdowns on hundreds of styles. When it\'s gone, it\'s gone.',
      ctas: [
        { label: 'Shop The Sale', href: 'shop.html?sale=1', cls: 'btn--light' },
        { label: 'New Arrivals', href: 'shop.html?new=1', cls: 'btn--ghost-light' }
      ]
    },
    {
      img: IMG.hero3,
      eyebrow: 'Menswear Editorial',
      title: 'Street Ready',
      sub: 'Layer up in relaxed fits, premium basics and outerwear built for the city.',
      ctas: [
        { label: 'Shop Men', href: E.shopUrl({ gender: 'men' }), cls: 'btn--light' },
        { label: 'Shop Sneakers', href: 'shop.html?cat=shoes', cls: 'btn--ghost-light' }
      ]
    }
  ];

  const SLIDE_MS = 6000;

  function initHero() {
    const slidesRoot = $('#heroSlides');
    if (!slidesRoot) return;
    const dotsRoot = $('#heroDots');

    slidesRoot.innerHTML = SLIDES.map((s, i) => `
      <div class="hero-slide ${i === 0 ? 'active' : ''}" data-index="${i}" style="--slide-ms:${SLIDE_MS}ms">
        <img src="${s.img}" alt="${E.esc(s.title)}" ${i === 0 ? '' : 'loading="lazy"'} class="ratio-hero-img">
        <div class="hero-content">
          <div class="hero-copy">
            <span class="hero-eyebrow">${E.esc(s.eyebrow)}</span>
            <h1 class="hero-title">${E.esc(s.title)}</h1>
            <p class="hero-sub">${E.esc(s.sub)}</p>
            <div class="hero-ctas">
              ${s.ctas.map(c => `<a class="btn ${c.cls}" href="${c.href}">${c.label}</a>`).join('')}
            </div>
          </div>
        </div>
      </div>`).join('');

    dotsRoot.innerHTML = SLIDES.map((_, i) =>
      `<button data-dot="${i}" class="${i === 0 ? 'active' : ''}" aria-label="Go to slide ${i + 1}"></button>`).join('');

    const slides = $$('#heroSlides .hero-slide');
    const dots = $$('#heroDots button');
    let current = 0;
    let timer = null;

    function go(idx) {
      current = (idx + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle('active', i === current));
      dots.forEach((d, i) => {
        d.classList.remove('active');
        if (i === current) {
          // restart the fill animation
          void d.offsetWidth;
          d.classList.add('active');
        }
      });
    }

    function play() { timer = setInterval(() => go(current + 1), SLIDE_MS); }
    function reset() { clearInterval(timer); play(); }

    $('#heroPrev').addEventListener('click', () => { go(current - 1); reset(); });
    $('#heroNext').addEventListener('click', () => { go(current + 1); reset(); });
    dots.forEach((d, i) => d.addEventListener('click', () => { go(i); reset(); }));

    const hero = $('#hero');
    hero.addEventListener('mouseenter', () => clearInterval(timer));
    hero.addEventListener('mouseleave', play);

    /* swipe support */
    let startX = null;
    hero.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', e => {
      if (startX == null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 44) { go(current + (dx < 0 ? 1 : -1)); reset(); }
      startX = null;
    }, { passive: true });

    play();
  }

  /* ================= CATEGORY TILES ================= */

  const CAT_TILES = [
    { label: 'Women', href: E.shopUrl({ gender: 'women' }), img: IMG.catWomen },
    { label: 'Men', href: E.shopUrl({ gender: 'men' }), img: IMG.catMen },
    { label: 'Shoes', href: E.shopUrl({ cat: 'shoes' }), img: IMG.catShoes },
    { label: 'Accessories', href: E.shopUrl({ cat: 'accessories' }), img: IMG.catAcc },
    { label: 'Beauty', href: E.shopUrl({ cat: 'beauty' }), img: IMG.catBeauty },
    { label: 'Sportswear', href: E.shopUrl({ cat: 'sport' }), img: IMG.catSport }
  ];

  function renderCategories() {
    const root = $('#categoryGrid');
    if (!root) return;
    root.innerHTML = CAT_TILES.map((c, i) => `
      <a class="cat-tile reveal reveal-d${(i % 3) + 1}" href="${c.href}">
        <img src="${c.img}" alt="Shop ${c.label}" loading="lazy">
        <div class="cat-body">
          <div class="cat-name">${c.label}</div>
          <span class="cat-link">Shop Now ${E.I.arrowRSm}</span>
        </div>
      </a>`).join('');
  }

  /* ================= TRENDING GRID ================= */

  function renderTrending() {
    const root = $('#trendingGrid');
    if (!root) return;
    root.innerHTML = E.skeletonCards(8);
    setTimeout(() => {
      const items = window.ELAN_PRODUCTS.filter(p => p.isTrending)
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 8);
      root.innerHTML = items.map((p, i) => E.renderProductCard(p, { delay: i * 60 })).join('');
    }, 450);
  }

  /* ================= PROMO BANNERS ================= */

  function renderPromos() {
    const root = $('#promoDuo');
    if (!root) return;
    root.innerHTML = `
      <a class="promo reveal" href="shop.html?sale=1">
        <img src="${IMG.promo1}" alt="Seasonal sale campaign" loading="lazy">
        <div class="promo-body">
          <span class="promo-eyebrow">Seasonal Sale</span>
          <h3 class="promo-title">Up To 50% Off</h3>
          <p class="promo-sub">Hundreds of styles reduced. Extra 20% off with code <b>EXTRA20</b>.</p>
          <span class="btn btn--light">Shop The Sale</span>
        </div>
      </a>
      <a class="promo promo--dark reveal reveal-d1" href="${E.shopUrl({ cat: 'clothing', sort: 'popular' })}">
        <img src="${IMG.promo2}" alt="The tailoring edit collection" loading="lazy">
        <div class="promo-body">
          <span class="promo-eyebrow">Special Collection</span>
          <h3 class="promo-title">The Tailoring Edit</h3>
          <p class="promo-sub">Sculpted blazers, pleated trousers and power silhouettes for every hour.</p>
          <span class="btn btn--light">Explore The Edit</span>
        </div>
      </a>`;
  }

  /* ================= NEW ARRIVALS SCROLL ROW ================= */

  function renderNewRow() {
    const root = $('#newRow');
    if (!root) return;
    root.innerHTML = E.skeletonCards(5);
    setTimeout(() => {
      const items = window.ELAN_PRODUCTS.filter(p => p.isNew)
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 10);
      root.innerHTML = items.map(p => E.renderProductCard(p)).join('');
    }, 450);

    // arrows scroll the row
    const prev = $('#newPrev'), next = $('#newNext');
    if (prev && next) {
      const step = () => Math.max(root.clientWidth * 0.8, 260);
      prev.addEventListener('click', () => root.scrollBy({ left: -step(), behavior: 'smooth' }));
      next.addEventListener('click', () => root.scrollBy({ left: step(), behavior: 'smooth' }));
      const updateArrows = () => {
        prev.disabled = root.scrollLeft < 10;
        next.disabled = root.scrollLeft > root.scrollWidth - root.clientWidth - 10;
      };
      root.addEventListener('scroll', updateArrows, { passive: true });
      window.addEventListener('resize', updateArrows);
      setTimeout(updateArrows, 600);
    }
  }

  /* ================= EDITORIAL IMAGE ================= */

  function renderEditorial() {
    const img = $('#editorialImg');
    if (img) img.src = IMG.editorial;
  }

  /* ================= BOOT ================= */

  document.addEventListener('DOMContentLoaded', () => {
    initHero();
    renderCategories();
    renderTrending();
    renderPromos();
    renderNewRow();
    renderEditorial();
    E.initRevealFor('.cat-tile, .promo');
  });
})();
