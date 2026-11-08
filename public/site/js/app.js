/* ============================================================
   ÉLAN — app.js
   Shared logic used by every page:
   · helpers & formatting
   · cart + wishlist state (localStorage)
   · header, mega menus, mobile menu, search overlay
   · mini-cart drawer, quick-view modal, sign-in modal
   · toast notifications
   · reusable product card renderer
   · reveal-on-scroll animations + newsletter
   ------------------------------------------------------------
   Global objects:
   · ELAN_PRODUCTS  (from products.js)  — the catalog
   · ELAN.IMG       (from images.js)   — campaign / slot images
   · ELAN           (this file)        — helpers & UI
   ============================================================ */

(function () {
  'use strict';

  /* make sure the shared ELAN object exists (images.js may load first) */
  window.ELAN = window.ELAN || {};

  /* ================= 1. HELPERS ================= */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /** Format a number as price, e.g. 89 -> "$89.00" */
  function formatPrice(n) {
    return '$' + Number(n).toFixed(2);
  }

  /** Safe HTML escaping for user-ish strings */
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** Read a URL query parameter */
  function getParam(name, url) {
    return new URLSearchParams((url || window.location.search).replace('?', '')).get(name);
  }

  /** Debounce (used for search etc.) */
  function debounce(fn, ms) {
    let t;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
  }

  /** Find a product by id */
  function findProduct(id) {
    return (window.ELAN_PRODUCTS || []).find(p => p.id === id) || null;
  }

  /** Discount % between old and current price */
  function discountPct(p) {
    if (!p.oldPrice || p.oldPrice <= p.price) return 0;
    return Math.round((1 - p.price / p.oldPrice) * 100);
  }

  /* ================= 2. STORAGE (localStorage) ================= */

  const CART_KEY = 'elan_cart_v1';
  const WISH_KEY = 'elan_wishlist_v1';
  const USER_KEY = 'elan_user_v1';
  const PROMO_KEY = 'elan_promo_v1';

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage full/blocked */ }
    document.dispatchEvent(new CustomEvent('elan:state'));
  }

  /* ---------- Cart ---------- */
  /* Each line: { id, size, color, qty } */
  function getCart() { return read(CART_KEY, []); }
  function saveCart(lines) { write(CART_KEY, lines); }

  const cartLineKey = (id, size, color) => `${id}|${size || ''}|${color || ''}`;

  function addToCart(id, opts) {
    opts = opts || {};
    const lines = getCart();
    const size = opts.size || '';
    const color = opts.color || '';
    const qty = Math.max(1, opts.qty || 1);
    const key = cartLineKey(id, size, color);
    const existing = lines.find(l => cartLineKey(l.id, l.size, l.color) === key);
    if (existing) existing.qty = Math.min(99, existing.qty + qty);
    else lines.push({ id, size, color, qty });
    saveCart(lines);
    return qty;
  }

  function setQty(key, qty) {
    let lines = getCart();
    if (qty <= 0) lines = lines.filter(l => cartLineKey(l.id, l.size, l.color) !== key);
    else {
      const line = lines.find(l => cartLineKey(l.id, l.size, l.color) === key);
      if (line) line.qty = Math.min(99, qty);
    }
    saveCart(lines);
  }

  function removeFromCart(key) {
    saveCart(getCart().filter(l => cartLineKey(l.id, l.size, l.color) !== key));
  }

  function clearCart() { saveCart([]); }

  function cartCount() {
    return getCart().reduce((sum, l) => sum + l.qty, 0);
  }

  /** Subtotal, discount, delivery and total for the current cart */
  function cartTotals(deliveryOverride) {
    const lines = getCart();
    let subtotal = 0;
    let saved = 0;
    lines.forEach(l => {
      const p = findProduct(l.id);
      if (!p) return;
      subtotal += p.price * l.qty;
      if (p.oldPrice) saved += (p.oldPrice - p.price) * l.qty;
    });
    const promo = getPromo();
    let discount = 0;
    if (promo && subtotal > 0) discount = subtotal * promo.rate;
    const FREE_OVER = 75, STD = 4.99;
    let delivery = deliveryOverride != null ? deliveryOverride
      : (subtotal === 0 || subtotal - discount >= FREE_OVER ? 0 : STD);
    const total = Math.max(0, subtotal - discount + delivery);
    return { subtotal, discount, delivery, total, saved, lines: lines.length };
  }

  /* ---------- Promo code ---------- */
  const PROMOS = { WELCOME10: 0.10, EXTRA20: 0.20 };
  function getPromo() {
    const code = read(PROMO_KEY, null);
    if (!code || !PROMOS[code]) return null;
    return { code, rate: PROMOS[code] };
  }
  function applyPromo(code) {
    code = String(code || '').trim().toUpperCase();
    if (!PROMOS[code]) return false;
    write(PROMO_KEY, code);
    return true;
  }
  function clearPromo() { localStorage.removeItem(PROMO_KEY); }

  /* ---------- Wishlist ---------- */
  function getWishlist() { return read(WISH_KEY, []); }
  function inWishlist(id) { return getWishlist().includes(id); }
  function toggleWishlist(id) {
    let list = getWishlist();
    const was = list.includes(id);
    list = was ? list.filter(x => x !== id) : list.concat(id);
    write(WISH_KEY, list);
    return !was; // true = now added
  }

  /* ---------- Demo user ---------- */
  function getUser() { return read(USER_KEY, null); }
  function setUser(u) { write(USER_KEY, u); }

  /* ================= 3. ICONS (inline SVG) ================= */

  const I = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 000-7.8z"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 7h12l1 14H5L6 7z"/><path d="M9 10V6a3 3 0 016 0v4"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    caret: '<svg class="nav-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>',
    caretSm: '<svg class="mm-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>',
    arrowL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>',
    arrowR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>',
    arrowRSm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12a9 9 0 109-9"/><path d="M3 3v6h6"/><path d="M9 12l4 4 8-8"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
    star: '★',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4.5"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3V2z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4l16 16M20 4L4 20"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 12a4 4 0 104 4V4c.7 2.4 2.3 4 4.5 4.5"/></svg>',
    pinterest: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9.5"/><path d="M9 21c1-3.5 1.5-5.5 2-8"/><path d="M11 13a3.2 3.2 0 116-1.8c.3 2.6-1.2 4.8-3.2 4.8-1 0-1.8-.6-2-1.4"/></svg>'
  };

  /* ================= 4. CATALOG CONSTANTS ================= */

  const CATEGORY_LABEL = {
    clothing: 'Clothing', shoes: 'Shoes', accessories: 'Accessories',
    beauty: 'Beauty', sport: 'Sportswear'
  };
  const GENDER_LABEL = { women: "Women", men: "Men", unisex: 'Unisex' };

  /* ================= 5. NAV DATA (mega menus) ================= */

  function shopUrl(params) {
    return 'shop.html?' + Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');
  }

  const MEGA_WOMEN = {
    cols: [
      { title: 'Clothing', links: [
        { label: 'Dresses', href: shopUrl({ gender: 'women', cat: 'clothing', sub: 'dresses' }) },
        { label: 'Tops & Shirts', href: shopUrl({ gender: 'women', cat: 'clothing', sub: 'tops' }) },
        { label: 'Knitwear', href: shopUrl({ gender: 'women', cat: 'clothing', sub: 'knitwear' }) },
        { label: 'Blazers', href: shopUrl({ gender: 'women', cat: 'clothing', sub: 'blazers' }) },
        { label: 'Trousers', href: shopUrl({ gender: 'women', cat: 'clothing', sub: 'trousers' }) },
        { label: 'Skirts', href: shopUrl({ gender: 'women', cat: 'clothing', sub: 'skirts' }) },
        { label: 'Denim', href: shopUrl({ gender: 'women', cat: 'clothing', sub: 'denim' }) },
        { label: 'Coats', href: shopUrl({ gender: 'women', cat: 'clothing', sub: 'coats' }) }
      ]},
      { title: 'Shoes', links: [
        { label: 'Heels', href: shopUrl({ cat: 'shoes', sub: 'heels' }) },
        { label: 'Sneakers', href: shopUrl({ cat: 'shoes', sub: 'sneakers' }) },
        { label: 'Sandals', href: shopUrl({ cat: 'shoes', sub: 'sandals' }) },
        { label: 'Boots', href: shopUrl({ cat: 'shoes', sub: 'boots' }) }
      ]},
      { title: 'Accessories', links: [
        { label: 'Bags', href: shopUrl({ cat: 'accessories', sub: 'bags' }) },
        { label: 'Jewelry', href: shopUrl({ cat: 'accessories', sub: 'jewelry' }) },
        { label: 'Sunglasses', href: shopUrl({ cat: 'accessories', sub: 'sunglasses' }) },
        { label: 'Watches', href: shopUrl({ cat: 'accessories', sub: 'watches' }) },
        { label: 'Scarves', href: shopUrl({ cat: 'accessories', sub: 'scarves' }) }
      ]},
      { title: 'Featured', links: [
        { label: 'New In', href: 'shop.html?new=1' },
        { label: 'Best Sellers', href: shopUrl({ sort: 'popular' }) },
        { label: 'Beauty', href: shopUrl({ cat: 'beauty' }) },
        { label: 'Sportswear', href: shopUrl({ cat: 'sport' }) },
        { label: 'Sale', href: 'shop.html?sale=1', sale: true }
      ]}
    ],
    cta: { img: () => (ELAN.IMG && ELAN.IMG.$1) || "", title: 'The New Edit', link: shopUrl({ gender: 'women', new: 1 }), label: 'Shop Women' }
  };

  const MEGA_MEN = {
    cols: [
      { title: 'Clothing', links: [
        { label: 'T-Shirts', href: shopUrl({ gender: 'men', cat: 'clothing', sub: 'tshirts' }) },
        { label: 'Shirts', href: shopUrl({ gender: 'men', cat: 'clothing', sub: 'shirts' }) },
        { label: 'Hoodies & Sweatshirts', href: shopUrl({ gender: 'men', cat: 'clothing', sub: 'hoodies' }) },
        { label: 'Jackets', href: shopUrl({ gender: 'men', cat: 'clothing', sub: 'jackets' }) },
        { label: 'Knitwear', href: shopUrl({ gender: 'men', cat: 'clothing', sub: 'knitwear' }) },
        { label: 'Jeans', href: shopUrl({ gender: 'men', cat: 'clothing', sub: 'denim' }) }
      ]},
      { title: 'Shoes', links: [
        { label: 'Sneakers', href: shopUrl({ cat: 'shoes', sub: 'sneakers' }) },
        { label: 'Boots', href: shopUrl({ cat: 'shoes', sub: 'boots' }) },
        { label: 'Loafers', href: shopUrl({ cat: 'shoes', sub: 'loafers' }) }
      ]},
      { title: 'Accessories', links: [
        { label: 'Watches', href: shopUrl({ cat: 'accessories', sub: 'watches' }) },
        { label: 'Bags', href: shopUrl({ cat: 'accessories', sub: 'bags' }) },
        { label: 'Caps', href: shopUrl({ cat: 'accessories', sub: 'caps' }) },
        { label: 'Sportswear', href: shopUrl({ cat: 'sport' }) }
      ]},
      { title: 'Featured', links: [
        { label: 'New In', href: 'shop.html?new=1' },
        { label: 'Best Sellers', href: shopUrl({ sort: 'popular' }) },
        { label: 'Sale', href: 'shop.html?sale=1', sale: true }
      ]}
    ],
    cta: { img: () => (ELAN.IMG && ELAN.IMG.$1) || "", title: 'Street Ready', link: shopUrl({ gender: 'men', new: 1 }), label: 'Shop Men' }
  };

  const MEGA_CLOTHING = {
    cols: [
      { title: "Women's Clothing", links: [
        { label: 'Dresses', href: shopUrl({ gender: 'women', cat: 'clothing', sub: 'dresses' }) },
        { label: 'Tops', href: shopUrl({ gender: 'women', cat: 'clothing', sub: 'tops' }) },
        { label: 'Knitwear', href: shopUrl({ gender: 'women', cat: 'clothing', sub: 'knitwear' }) },
        { label: 'Trousers', href: shopUrl({ gender: 'women', cat: 'clothing', sub: 'trousers' }) },
        { label: 'Skirts', href: shopUrl({ gender: 'women', cat: 'clothing', sub: 'skirts' }) }
      ]},
      { title: "Men's Clothing", links: [
        { label: 'T-Shirts', href: shopUrl({ gender: 'men', cat: 'clothing', sub: 'tshirts' }) },
        { label: 'Shirts', href: shopUrl({ gender: 'men', cat: 'clothing', sub: 'shirts' }) },
        { label: 'Hoodies', href: shopUrl({ gender: 'men', cat: 'clothing', sub: 'hoodies' }) },
        { label: 'Jackets', href: shopUrl({ gender: 'men', cat: 'clothing', sub: 'jackets' }) },
        { label: 'Jeans', href: shopUrl({ gender: 'men', cat: 'clothing', sub: 'denim' }) }
      ]},
      { title: 'Collections', links: [
        { label: 'The Tailoring Edit', href: shopUrl({ cat: 'clothing', sort: 'popular' }) },
        { label: 'Denim Studio', href: shopUrl({ cat: 'clothing', sub: 'denim' }) },
        { label: 'Essentials', href: shopUrl({ cat: 'clothing', sort: 'rating' }) }
      ]},
      { title: 'Featured', links: [
        { label: 'New In', href: shopUrl({ cat: 'clothing', new: 1 }) },
        { label: 'Sale', href: shopUrl({ cat: 'clothing', sale: 1 }), sale: true }
      ]}
    ],
    cta: { img: () => (ELAN.IMG && ELAN.IMG.$1) || "", title: 'Wardrobe Staples', link: shopUrl({ cat: 'clothing' }), label: 'Shop Clothing' }
  };

  const MEGA_SHOES = {
    cols: [
      { title: "Women's Shoes", links: [
        { label: 'Heels', href: shopUrl({ cat: 'shoes', sub: 'heels' }) },
        { label: 'Sandals', href: shopUrl({ cat: 'shoes', sub: 'sandals' }) },
        { label: 'Sneakers', href: shopUrl({ cat: 'shoes', sub: 'sneakers' }) }
      ]},
      { title: "Men's Shoes", links: [
        { label: 'Sneakers', href: shopUrl({ cat: 'shoes', sub: 'sneakers' }) },
        { label: 'Boots', href: shopUrl({ cat: 'shoes', sub: 'boots' }) },
        { label: 'Loafers', href: shopUrl({ cat: 'shoes', sub: 'loafers' }) }
      ]},
      { title: 'Featured', links: [
        { label: 'New In', href: shopUrl({ cat: 'shoes', new: 1 }) },
        { label: 'Best Sellers', href: shopUrl({ cat: 'shoes', sort: 'popular' }) },
        { label: 'Sale', href: shopUrl({ cat: 'shoes', sale: 1 }), sale: true }
      ]}
    ],
    cta: { img: () => (ELAN.IMG && ELAN.IMG.$1) || "", title: 'Step It Up', link: shopUrl({ cat: 'shoes' }), label: 'Shop Shoes' }
  };

  const MEGA_ACCESSORIES = {
    cols: [
      { title: 'Bags & More', links: [
        { label: 'Totes', href: shopUrl({ cat: 'accessories', sub: 'bags' }) },
        { label: 'Crossbody', href: shopUrl({ cat: 'accessories', sub: 'bags' }) },
        { label: 'Scarves', href: shopUrl({ cat: 'accessories', sub: 'scarves' }) },
        { label: 'Caps', href: shopUrl({ cat: 'accessories', sub: 'caps' }) }
      ]},
      { title: 'Jewelry & Watches', links: [
        { label: 'Necklaces', href: shopUrl({ cat: 'accessories', sub: 'jewelry' }) },
        { label: 'Watches', href: shopUrl({ cat: 'accessories', sub: 'watches' }) }
      ]},
      { title: 'Eyewear', links: [
        { label: 'Sunglasses', href: shopUrl({ cat: 'accessories', sub: 'sunglasses' }) }
      ]},
      { title: 'Featured', links: [
        { label: 'New In', href: shopUrl({ cat: 'accessories', new: 1 }) },
        { label: 'Sale', href: shopUrl({ cat: 'accessories', sale: 1 }), sale: true }
      ]}
    ],
    cta: { img: () => (ELAN.IMG && ELAN.IMG.$1) || "", title: 'Finishing Touches', link: shopUrl({ cat: 'accessories' }), label: 'Shop Accessories' }
  };

  const NAV_ITEMS = [
    { label: 'Women', href: shopUrl({ gender: 'women' }), mega: MEGA_WOMEN },
    { label: 'Men', href: shopUrl({ gender: 'men' }), mega: MEGA_MEN },
    { label: 'New Arrivals', href: 'shop.html?new=1' },
    { label: 'Clothing', href: shopUrl({ cat: 'clothing' }), mega: MEGA_CLOTHING },
    { label: 'Shoes', href: shopUrl({ cat: 'shoes' }), mega: MEGA_SHOES },
    { label: 'Accessories', href: shopUrl({ cat: 'accessories' }), mega: MEGA_ACCESSORIES },
    { label: 'Sale', href: 'shop.html?sale=1', sale: true }
  ];

  /* ================= 6. HEADER / FOOTER RENDER ================= */

  function renderHeader() {
    const root = $('#site-header');
    if (!root) return;

    const navHtml = NAV_ITEMS.map(item => {
      if (!item.mega) {
        return `<li class="nav-item${item.sale ? ' nav-item--sale' : ''}">
          <a href="${item.href}">${item.label}</a>
        </li>`;
      }
      const cols = item.mega.cols.map(col => `
        <div class="mega-col">
          <h4>${col.title}</h4>
          <ul>${col.links.map(l =>
            `<li><a href="${l.href}"${l.sale ? ' class="mega-sale"' : ''}>${l.label}</a></li>`).join('')}
          </ul>
        </div>`).join('');
      const cta = item.mega.cta;
      return `<li class="nav-item nav-item--mega${item.sale ? ' nav-item--sale' : ''}">
        <a href="${item.href}">${item.label} ${I.caret}</a>
        <div class="mega" role="menu">
          <div class="mega-inner">
            ${cols}
            <a class="mega-cta" href="${cta.link}">
              <img data-src-slot="${cta.img.name}" src="${cta.img()}" alt="${cta.title}" loading="lazy">
              <div class="mega-cta-body">
                <span class="mega-cta-title">${cta.title}</span>
                <span class="mega-cta-link">${cta.label}</span>
              </div>
            </a>
          </div>
        </div>
      </li>`;
    }).join('');

    root.innerHTML = `
      <div class="announce">
        <span>Free Delivery Over $75 &nbsp;·&nbsp; <a href="shop.html?sale=1">Extra 20% Off Sale With Code EXTRA20</a></span>
      </div>
      <div class="header-main">
        <button class="icon-btn burger" id="burgerBtn" aria-label="Open menu">
          <span></span><span></span><span></span>
        </button>
        <a class="logo" href="index.html" aria-label="ÉLAN home">ÉLAN<span class="logo-dot"></span></a>
        <nav class="main-nav" aria-label="Main navigation">
          <ul>${navHtml}</ul>
        </nav>
        <div class="header-search" role="search">
          ${I.search}
          <input type="search" id="headerSearchInput" placeholder="Search products…" aria-label="Search products">
        </div>
        <div class="header-actions">
          <button class="icon-btn search-toggle" id="searchToggle" aria-label="Search">${I.search}</button>
          <button class="icon-btn" id="userBtn" aria-label="Account">${I.user}</button>
          <a class="icon-btn" href="wishlist.html" aria-label="Wishlist">${I.heart}<span class="count-badge" data-badge="wish"></span></a>
          <button class="icon-btn" id="bagBtn" aria-label="Shopping bag">${I.bag}<span class="count-badge" data-badge="cart"></span></button>
        </div>
      </div>`;

    // wire header interactions
    $('#bagBtn').addEventListener('click', openMiniCart);
    $('#burgerBtn').addEventListener('click', openMobileMenu);
    $('#searchToggle').addEventListener('click', openSearchOverlay);
    $('#userBtn').addEventListener('click', onUserBtn);

    const hsInput = $('#headerSearchInput');
    if (hsInput) {
      const formWrap = hsInput.closest('.header-search');
      const form = document.createElement('form');
      hsInput.parentNode.insertBefore(form, hsInput);
      form.appendChild(hsInput);
      form.addEventListener('submit', e => {
        e.preventDefault();
        const q = hsInput.value.trim();
        if (q) window.location.href = 'shop.html?q=' + encodeURIComponent(q);
      });
      formWrap.style.cursor = 'pointer';
    }
  }

  function renderFooter() {
    const root = $('#site-footer');
    if (!root) return;
    root.innerHTML = `
      <div class="footer-newsletter">
        <div>
          <h3 class="fn-title">Join The ÉLAN List</h3>
          <p class="fn-sub">10% off your first order, early access to drops, and members-only offers.</p>
        </div>
        <div>
          <form class="fn-form" id="newsletterForm" novalidate>
            <input type="email" id="newsletterEmail" placeholder="Email address" aria-label="Email address">
            <button class="btn" type="submit">Sign Up</button>
          </form>
          <p class="fn-note" id="newsletterNote">By subscribing you agree to our <a href="info.html?page=privacy" style="text-decoration:underline">Privacy Policy</a>.</p>
        </div>
      </div>
      <div class="footer-main">
        <div class="footer-brand">
          <a class="logo" href="index.html">ÉLAN<span class="logo-dot"></span></a>
          <p>ÉLAN is a premium fashion destination for women and men — considered design, honest fabrics and pieces that outlast the season.</p>
          <div class="social-row">
            <a href="info.html?page=contact" aria-label="Instagram">${I.instagram}</a>
            <a href="info.html?page=contact" aria-label="Facebook">${I.facebook}</a>
            <a href="info.html?page=contact" aria-label="X">${I.x}</a>
            <a href="info.html?page=contact" aria-label="TikTok">${I.tiktok}</a>
            <a href="info.html?page=contact" aria-label="Pinterest">${I.pinterest}</a>
          </div>
        </div>
        <div class="footer-col">
          <h4>Shop</h4>
          <ul>
            <li><a href="shop.html?gender=women">Women</a></li>
            <li><a href="shop.html?gender=men">Men</a></li>
            <li><a href="shop.html?new=1">New Arrivals</a></li>
            <li><a href="shop.html?sale=1">Sale</a></li>
            <li><a href="shop.html?sort=popular">Best Sellers</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Customer Care</h4>
          <ul>
            <li><a href="info.html?page=contact">Customer Service</a></li>
            <li><a href="info.html?page=delivery">Delivery Information</a></li>
            <li><a href="info.html?page=returns">Returns &amp; Refunds</a></li>
            <li><a href="info.html?page=size-guide">Size Guide</a></li>
            <li><a href="info.html?page=faq">FAQ</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Company</h4>
          <ul>
            <li><a href="info.html?page=about">About ÉLAN</a></li>
            <li><a href="info.html?page=privacy">Privacy Policy</a></li>
            <li><a href="info.html?page=terms">Terms &amp; Conditions</a></li>
            <li><a href="info.html?page=contact">Contact Us</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} ÉLAN Fashion Group. All rights reserved. Demo store — no real transactions.</span>
        <div class="legal">
          <a href="info.html?page=privacy">Privacy</a>
          <a href="info.html?page=terms">Terms</a>
          <a href="info.html?page=delivery">Delivery</a>
          <a href="info.html?page=returns">Returns</a>
        </div>
        <div class="footer-pay" aria-label="Accepted payment methods">
          <span class="pay-chip">VISA</span>
          <span class="pay-chip">MASTERCARD</span>
          <span class="pay-chip">AMEX</span>
          <span class="pay-chip">PAYPAL</span>
          <span class="pay-chip">APPLE PAY</span>
        </div>
      </div>`;

    // newsletter
    const form = $('#newsletterForm');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const input = $('#newsletterEmail');
      const note = $('#newsletterNote');
      const email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        note.textContent = 'Please enter a valid email address.';
        note.className = 'fn-note err';
        input.focus();
        return;
      }
      note.textContent = 'Welcome to the list! Check your inbox for 10% off.';
      note.className = 'fn-note ok';
      input.value = '';
      toast('Subscribed — enjoy 10% off your first order', { icon: 'check' });
    });
  }

  /* ================= 7. BADGES ================= */

  function updateBadges() {
    const cartBadge = $('[data-badge="cart"]');
    const wishBadge = $('[data-badge="wish"]');
    if (cartBadge) {
      const n = cartCount();
      cartBadge.textContent = n > 99 ? '99+' : n;
      cartBadge.classList.toggle('show', n > 0);
    }
    if (wishBadge) {
      const n = getWishlist().length;
      wishBadge.textContent = n > 99 ? '99+' : n;
      wishBadge.classList.toggle('show', n > 0);
    }
  }

  document.addEventListener('elan:state', updateBadges);

  /* ================= 8. TOASTS ================= */

  function toast(message, opts) {
    opts = opts || {};
    let rootEl = $('.toast-root');
    if (!rootEl) {
      rootEl = document.createElement('div');
      rootEl.className = 'toast-root';
      document.body.appendChild(rootEl);
    }
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `${opts.icon === 'check' ? I.check : I.bag}<span>${message}</span>${opts.link ? `<a href="${opts.link}">${opts.linkText || 'View'}</a>` : ''}`;
    rootEl.appendChild(el);
    setTimeout(() => { el.classList.add('hide'); setTimeout(() => el.remove(), 320); }, opts.ms || 3400);
  }

  /* ================= 9. OVERLAY ENGINE (backdrop + drawers) ================= */

  let openLayer = null; // 'cart' | 'menu' | 'search' | 'qv' | 'signin' | 'filters'

  function ensureBackdrop() {
    let bd = $('#backdrop');
    if (!bd) {
      bd = document.createElement('div');
      bd.className = 'backdrop';
      bd.id = 'backdrop';
      bd.addEventListener('click', closeAllLayers);
      document.body.appendChild(bd);
    }
    return bd;
  }

  function closeAllLayers() {
    $$('.mini-cart.show, .mobile-menu.show, .search-overlay.show, .qv-modal.show, .signin-modal.show, .filters.show')
      .forEach(el => el.classList.remove('show'));
    $('#backdrop') && $('#backdrop').classList.remove('show');
    document.body.style.overflow = '';
    openLayer = null;
  }

  function openLayerFn(el, name) {
    ensureBackdrop().classList.add('show');
    el.classList.add('show');
    document.body.style.overflow = 'hidden';
    openLayer = name;
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllLayers();
  });

  /* ================= 10. MINI CART DRAWER ================= */

  function renderMiniCart() {
    const root = $('#miniCartRoot');
    const lines = getCart();
    const itemsHtml = lines.length ? lines.map(l => {
      const p = findProduct(l.id);
      if (!p) return '';
      const key = cartLineKey(l.id, l.size, l.color);
      return `
        <div class="mc-item" data-key="${esc(key)}">
          <a href="product.html?id=${encodeURIComponent(p.id)}" data-close-layers><img src="${p.images[0]}" alt="${esc(p.name)}"></a>
          <div>
            <div class="mc-name">${esc(p.name)}</div>
            <div class="mc-meta">${l.color ? esc(l.color) + ' · ' : ''}${l.size ? 'Size ' + esc(l.size) : 'One size'}</div>
            <div class="qty-stepper qty-stepper--sm" aria-label="Quantity">
              <button data-mc-dec aria-label="Decrease quantity">−</button>
              <span class="qty-val">${l.qty}</span>
              <button data-mc-inc aria-label="Increase quantity">+</button>
            </div>
          </div>
          <div class="mc-right">
            <button class="mc-remove" data-mc-remove>Remove</button>
            <div class="mc-price">${p.oldPrice ? `<span class="old">${formatPrice(p.oldPrice)}</span><span class="now--sale">${formatPrice(p.price)}</span>` : formatPrice(p.price * l.qty)}</div>
          </div>
        </div>`;
    }).join('') : `
      <div class="mc-empty">
        ${I.bag}
        <p><b>Your bag is empty.</b></p>
        <p style="margin-top:6px">Add something you love.</p>
      </div>`;

    const t = cartTotals();
    const FREE = 75;
    const remaining = Math.max(0, FREE - (t.subtotal - t.discount));
    const pct = Math.min(100, ((t.subtotal - t.discount) / FREE) * 100);

    root.innerHTML = `
      <div class="mc-head">
        <h3>Your Bag (${cartCount()})</h3>
        <button class="icon-btn" data-close-layers aria-label="Close bag">${I.close}</button>
      </div>
      ${lines.length ? `<div class="mc-free-ship">
        ${remaining > 0
          ? `You're <b>${formatPrice(remaining)}</b> away from free delivery`
          : '🎉 You\'ve unlocked <b>free delivery</b>'}
        <div class="bar"><i style="width:${pct}%"></i></div>
      </div>` : ''}
      <div class="mc-items scroll-thin">${itemsHtml}</div>
      <div class="mc-foot">
        <div class="mc-subtotal"><span>Subtotal</span><span>${formatPrice(t.subtotal)}</span></div>
        <p class="mc-note">Delivery &amp; discounts calculated at checkout.</p>
        <div class="mc-actions">
          <a class="btn" href="checkout.html" data-close-layers>Checkout</a>
          <a class="btn btn--outline" href="cart.html" data-close-layers>View Bag</a>
        </div>
      </div>`;
  }

  function openMiniCart() {
    renderMiniCart();
    openLayerFn($('#miniCartRoot'), 'cart');
  }

  /* mini-cart internal clicks (event delegation) */
  document.addEventListener('click', e => {
    const item = e.target.closest('.mc-item');
    if (!item) return;
    const key = item.dataset.key;
    const line = getCart().find(l => cartLineKey(l.id, l.size, l.color) === key);
    if (!line) return;

    if (e.target.closest('[data-mc-inc]')) { setQty(key, line.qty + 1); renderMiniCart(); }
    else if (e.target.closest('[data-mc-dec]')) { setQty(key, line.qty - 1); renderMiniCart(); }
    else if (e.target.closest('[data-mc-remove]')) { removeFromCart(key); renderMiniCart(); toast('Removed from bag'); }
  });

  /* generic close links */
  document.addEventListener('click', e => {
    if (e.target.closest('[data-close-layers]')) closeAllLayers();
  });

  /* ================= 11. MOBILE MENU ================= */

  function renderMobileMenu() {
    const root = $('#mobileMenuRoot');
    const acc = NAV_ITEMS.filter(n => n.mega).map((item, idx) => {
      const panels = item.mega.cols.map(col => `
        <div class="mm-col-title">${col.title}</div>
        ${col.links.map(l => `<a href="${l.href}" data-close-layers>${l.label}</a>`).join('')}`).join('');
      return `
        <div class="mm-acc">
          <button class="mm-acc-btn" data-acc aria-expanded="false">${item.label} ${item.sale ? '' : ''}${I.caretSm}</button>
          <div class="mm-acc-panel"><div class="mm-acc-panel-inner">${panels}</div></div>
        </div>`;
    }).join('');

    root.innerHTML = `
      <div class="mm-head">
        <a class="logo" href="index.html" data-close-layers>ÉLAN<span class="logo-dot"></span></a>
        <button class="icon-btn" data-close-layers aria-label="Close menu">${I.close}</button>
      </div>
      <div class="mm-body">
        <a class="mm-link" href="shop.html?new=1" data-close-layers>New Arrivals</a>
        ${acc}
        <a class="mm-link mm-link--sale" href="shop.html?sale=1" data-close-layers>Sale</a>
        <a class="mm-link" href="wishlist.html" data-close-layers>Wishlist</a>
        <a class="mm-link" href="info.html?page=contact" data-close-layers>Customer Service</a>
      </div>
      <div class="mm-foot">
        <a class="btn btn--wide" href="shop.html" data-close-layers>Start Shopping</a>
        <div class="social-row">
          <a href="info.html?page=contact" aria-label="Instagram">${I.instagram}</a>
          <a href="info.html?page=contact" aria-label="Facebook">${I.facebook}</a>
          <a href="info.html?page=contact" aria-label="X">${I.x}</a>
        </div>
      </div>`;

    // accordion behavior
    $$('[data-acc]', root).forEach(btn => {
      btn.addEventListener('click', () => {
        const accEl = btn.parentElement;
        const panel = $('.mm-acc-panel', accEl);
        const isOpen = accEl.classList.contains('open');
        $$('.mm-acc.open', root).forEach(o => {
          o.classList.remove('open');
          $('.mm-acc-panel', o).style.maxHeight = null;
        });
        if (!isOpen) {
          accEl.classList.add('open');
          panel.style.maxHeight = panel.scrollHeight + 'px';
        }
      });
    });
  }

  function openMobileMenu() {
    renderMobileMenu();
    openLayerFn($('#mobileMenuRoot'), 'menu');
  }

  /* ================= 12. SEARCH OVERLAY ================= */

  const POPULAR = ['Dress', 'Sneakers', 'Tote', 'Trench', 'Hoodie', 'Perfume', 'Watch', 'Heels'];

  function openSearchOverlay() {
    let el = $('#searchOverlayRoot');
    if (!el) {
      el = document.createElement('div');
      el.className = 'search-overlay';
      el.id = 'searchOverlayRoot';
      document.body.appendChild(el);
      el.innerHTML = `
        <div class="so-head">
          <form id="soForm">
            ${I.search}
            <input type="search" id="soInput" placeholder="Search ÉLAN…" aria-label="Search">
          </form>
          <button class="icon-btn" data-close-layers aria-label="Close search">${I.close}</button>
        </div>
        <div class="so-suggest">
          <h4>Popular Searches</h4>
          <div class="so-tags">
            ${POPULAR.map(t => `<a href="shop.html?q=${encodeURIComponent(t)}" data-close-layers>${t}</a>`).join('')}
          </div>
        </div>`;
      $('#soForm').addEventListener('submit', e => {
        e.preventDefault();
        const q = $('#soInput').value.trim();
        if (q) window.location.href = 'shop.html?q=' + encodeURIComponent(q);
      });
    }
    openLayerFn(el, 'search');
    setTimeout(() => $('#soInput') && $('#soInput').focus(), 300);
  }

  /* ================= 13. SIGN-IN MODAL (demo) ================= */

  function onUserBtn() {
    const user = getUser();
    if (user) {
      toast(`Signed in as ${esc(user.name || user.email)} — demo account`);
      return;
    }
    let el = $('#signinRoot');
    if (!el) {
      el = document.createElement('div');
      el.className = 'qv-modal signin-modal';
      el.id = 'signinRoot';
      document.body.appendChild(el);
      el.innerHTML = `
        <div class="qv-box" style="grid-template-columns:1fr;max-width:420px">
          <button class="icon-btn qv-close" data-close-layers aria-label="Close">${I.close}</button>
          <div class="qv-body">
            <h3 style="font-family:var(--font-display);font-weight:400;text-transform:uppercase;font-size:18px;margin-bottom:4px">Sign In</h3>
            <p style="font-size:13px;color:var(--muted);margin-bottom:16px">Demo account — any details work, nothing is sent.</p>
            <div class="field"><label for="siName">Name</label><input id="siName" placeholder="Alex Morgan"></div>
            <div class="field" style="margin-top:12px"><label for="siEmail">Email</label><input id="siEmail" type="email" placeholder="alex@example.com"></div>
            <button class="btn btn--wide" id="siSubmit" style="margin-top:18px">Sign In / Create Account</button>
          </div>
        </div>`;
      $('#siSubmit').addEventListener('click', () => {
        const name = $('#siName').value.trim() || 'Fashion Friend';
        const email = $('#siEmail').value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          $('#siEmail').closest('.field').classList.add('invalid');
          return;
        }
        setUser({ name, email });
        closeAllLayers();
        toast(`Welcome, ${esc(name)}!`, { icon: 'check' });
      });
    }
    openLayerFn(el, 'signin');
  }

  /* ================= 14. QUICK VIEW MODAL ================= */

  function openQuickView(id) {
    const p = findProduct(id);
    if (!p) return;
    let el = $('#quickViewRoot');
    if (!el) {
      el = document.createElement('div');
      el.className = 'qv-modal';
      el.id = 'quickViewRoot';
      document.body.appendChild(el);
    }

    const d = discountPct(p);
    const oneSize = p.sizes.length <= 1;

    el.innerHTML = `
      <div class="qv-box">
        <button class="icon-btn qv-close" data-close-layers aria-label="Close quick view">${I.close}</button>
        <div class="qv-media">
          <img id="qvImg" src="${p.images[0]}" alt="${esc(p.name)}">
          ${p.images[1] ? `<div class="qv-thumbs">
            ${p.images.slice(0, 3).map((img, i) => `<img src="${img}" data-qv-thumb alt="View ${i + 1}" class="${i === 0 ? 'active' : ''}">`).join('')}
          </div>` : ''}
        </div>
        <div class="qv-body">
          <div class="qv-brand">${esc(p.brand)}</div>
          <h3 class="qv-name">${esc(p.name)}</h3>
          <div class="qv-price">
            ${p.oldPrice ? `<span class="old">${formatPrice(p.oldPrice)}</span><span class="now--sale">${formatPrice(p.price)}</span>` : formatPrice(p.price)}
          </div>
          <div class="p-rating"><span class="stars">${I.star.repeat(Math.round(p.rating))}</span> ${p.rating} (${p.reviews} reviews)</div>
          <p class="qv-desc">${esc(p.desc)}</p>
          <a href="product.html?id=${encodeURIComponent(p.id)}" data-close-layers style="font-size:12px;font-weight:700;text-decoration:underline;text-underline-offset:3px">View full details →</a>

          ${p.colors.length ? `
          <div class="opt-group" data-opt="color">
            <div class="opt-label">Color <span class="sel-name" data-sel-color>${esc(p.colors[0].name)}</span></div>
            <div class="swatch-row">
              ${p.colors.map((c, i) => `<button class="swatch ${i === 0 ? 'selected' : ''}" style="background:${c.hex}" data-color="${esc(c.name)}" aria-label="${esc(c.name)}"></button>`).join('')}
            </div>
          </div>` : ''}

          <div class="opt-group${oneSize ? '' : ''}" data-opt="size">
            <div class="opt-label">Size <span class="sel-name" data-sel-size>${oneSize ? esc(p.sizes[0]) : 'Select'}</span></div>
            <div class="size-row">
              ${p.sizes.map((s, i) => `<button class="size-chip ${oneSize ? 'selected' : ''}" data-size="${esc(s)}">${esc(s)}</button>`).join('')}
            </div>
            <p class="opt-error">Please choose a size first.</p>
          </div>

          <div class="pdp-buy-row">
            <button class="btn" id="qvAdd">Add to Bag</button>
            <button class="wish-btn-lg ${inWishlist(p.id) ? 'active' : ''}" data-wish="${esc(p.id)}" aria-label="Toggle wishlist">${I.heart}</button>
          </div>
        </div>
      </div>`;

    openLayerFn(el, 'qv');

    /* gallery thumbs */
    $$('#quickViewRoot [data-qv-thumb]').forEach(t => {
      t.addEventListener('click', () => {
        $('#qvImg').src = t.src;
        $$('#quickViewRoot [data-qv-thumb]').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
      });
    });
    /* option selection */
    $$('#quickViewRoot .swatch').forEach(s => s.addEventListener('click', () => {
      $$('#quickViewRoot .swatch').forEach(x => x.classList.remove('selected'));
      s.classList.add('selected');
      $('[data-sel-color]').textContent = s.dataset.color;
    }));
    $$('#quickViewRoot .size-chip').forEach(s => s.addEventListener('click', () => {
      $$('#quickViewRoot .size-chip').forEach(x => x.classList.remove('selected'));
      s.classList.add('selected');
      $('[data-sel-size]').textContent = s.dataset.size;
      s.closest('.opt-group').classList.remove('invalid');
    }));
    /* add to bag */
    $('#qvAdd').addEventListener('click', () => {
      const sizeEl = $('#quickViewRoot .size-chip.selected');
      if (!oneSize && !sizeEl) {
        $('[data-opt="size"]').classList.add('invalid');
        return;
      }
      const colorEl = $('#quickViewRoot .swatch.selected');
      addToCart(p.id, {
        size: sizeEl ? sizeEl.dataset.size : p.sizes[0],
        color: colorEl ? colorEl.dataset.color : (p.colors[0] && p.colors[0].name)
      });
      toast(`Added to bag — ${esc(p.name)}`, { link: 'cart.html', linkText: 'View Bag' });
      closeAllLayers();
      openMiniCart();
    });
  }

  /* ================= 15. PRODUCT CARD (reusable renderer) ================= */

  function renderProductCard(p, opts) {
    opts = opts || {};
    const d = discountPct(p);
    const badges = [
      d ? `<span class="badge badge--sale">-${d}%</span>` : '',
      p.isNew ? '<span class="badge">New</span>' : ''
    ].join('');
    const wish = inWishlist(p.id);
    const altImg = p.images[1] || p.images[0];

    return `
      <article class="p-card" style="animation-delay:${opts.delay || 0}ms">
        <div class="p-media">
          <a href="product.html?id=${encodeURIComponent(p.id)}" aria-label="${esc(p.name)}">
            <img class="p-img-main" src="${p.images[0]}" alt="${esc(p.name)}" loading="lazy">
            <img class="p-img-alt" src="${altImg}" alt="" loading="lazy" aria-hidden="true">
          </a>
          <div class="p-badge">${badges}</div>
          <button class="p-wish ${wish ? 'active' : ''}" data-wish="${esc(p.id)}" aria-label="Add ${esc(p.name)} to wishlist">${I.heart}</button>
          <div class="p-actions">
            <button class="p-quickview" data-qv="${esc(p.id)}">Quick View</button>
          </div>
        </div>
        <div class="p-info">
          <div class="p-row1">
            <div>
              <div class="p-name"><a href="product.html?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a></div>
              <div class="p-brand">${esc(p.brand)}</div>
            </div>
            <div class="p-price">
              ${p.oldPrice ? `<span class="old">${formatPrice(p.oldPrice)}</span><span class="now--sale">${formatPrice(p.price)}</span>` : formatPrice(p.price)}
            </div>
          </div>
          <div class="p-rating"><span class="stars">${I.star.repeat(Math.round(p.rating))}</span> ${p.rating}</div>
          ${p.colors.length ? `<div class="p-colors">${p.colors.slice(0, 4).map(c => `<i style="background:${c.hex}" title="${esc(c.name)}"></i>`).join('')}</div>` : ''}
        </div>
      </article>`;
  }

  /** Skeleton placeholder cards while "loading" */
  function skeletonCards(n) {
    return Array.from({ length: n }, (_, i) => `
      <div class="skel-card" style="animation-delay:${i * 40}ms">
        <div class="skeleton"></div>
        <div class="skel-line skeleton"></div>
        <div class="skel-line short skeleton"></div>
      </div>`).join('');
  }

  /* ---------- delegated clicks for wishlist + quick view on ALL cards ---------- */
  document.addEventListener('click', e => {
    const wishBtn = e.target.closest('[data-wish]');
    if (wishBtn) {
      e.preventDefault();
      const id = wishBtn.dataset.wish;
      const added = toggleWishlist(id);
      // sync every button for this product
      $$(`[data-wish="${CSS.escape(id)}"]`).forEach(b => {
        b.classList.toggle('active', added);
        b.classList.add('pulse');
        setTimeout(() => b.classList.remove('pulse'), 450);
      });
      toast(added ? 'Saved to wishlist' : 'Removed from wishlist', { icon: added ? 'check' : 'bag', link: 'wishlist.html', linkText: 'View' });
      return;
    }
    const qvBtn = e.target.closest('[data-qv]');
    if (qvBtn) {
      e.preventDefault();
      openQuickView(qvBtn.dataset.qv);
    }
  });

  /* ================= 16. REVEAL ON SCROLL ================= */

  function initReveal() {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    $$('.reveal').forEach(el => io.observe(el));
  }

  /** Observe elements added later (tiles, promos, cards…) */
  function initRevealFor(selector) {
    const els = $$(selector);
    if (!els.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.1 });
    els.forEach(el => io.observe(el));
  }

  /* ================= 17. HEADER SCROLL STATE ================= */

  function initHeaderScroll() {
    const header = $('#site-header');
    if (!header) return;
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 6);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ================= 18. BOOT ================= */

  function boot() {
    // top load progress bar
    const bar = document.createElement('div');
    bar.className = 'load-bar';
    document.body.appendChild(bar);
    setTimeout(() => bar.remove(), 900);

    // hidden drawers/modals live here
    if (!$('#miniCartRoot')) {
      const el = document.createElement('div');
      el.className = 'mini-cart';
      el.id = 'miniCartRoot';
      document.body.appendChild(el);
    }
    if (!$('#mobileMenuRoot')) {
      const el = document.createElement('div');
      el.className = 'mobile-menu';
      el.id = 'mobileMenuRoot';
      document.body.appendChild(el);
    }

    renderHeader();
    renderFooter();
    renderMobileMenu();
    renderMiniCart();          // pre-render (hidden until opened)
    ensureBackdrop();
    updateBadges();
    initReveal();
    initHeaderScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ================= EXPORT ================= */

  /* merge our tools into window.ELAN (keeps images.js data safe) */
  Object.assign(window.ELAN, {
    // helpers
    $, $$, formatPrice, esc, getParam, debounce, findProduct, discountPct,
    CATEGORY_LABEL, GENDER_LABEL, I, shopUrl,
    // cart
    getCart, addToCart, setQty, removeFromCart, clearCart, cartCount, cartTotals, cartLineKey,
    // promo
    getPromo, applyPromo, clearPromo, PROMOS,
    // wishlist
    getWishlist, inWishlist, toggleWishlist,
    // user
    getUser, setUser,
    // ui
    toast, renderProductCard, skeletonCards, openQuickView, openMiniCart,
    openMobileMenu, openSearchOverlay, closeAllLayers, updateBadges, renderMiniCart,
    initRevealFor, ensureBackdrop
  });
})();
