/* ============================================================
   ÉLAN — wishlist.js
   Saved products grid with move-to-bag and remove actions
   ============================================================ */

(function () {
  'use strict';
  const E = window.ELAN;
  const $ = E.$; const $$ = E.$$;

  function renderWishlist() {
    const ids = E.getWishlist();
    const grid = $('#wishGrid');
    const empty = $('#wishEmpty');
    const note = $('#wishCountNote');

    if (!ids.length) {
      grid.hidden = true;
      grid.innerHTML = '';
      empty.hidden = false;
      note.textContent = '';
      return;
    }

    empty.hidden = true;
    grid.hidden = false;
    note.textContent = `${ids.length} item${ids.length === 1 ? '' : 's'} saved for later`;

    grid.innerHTML = ids.map((id, i) => {
      const p = E.findProduct(id);
      if (!p) return '';
      return E.renderProductCard(p, { delay: i * 50 }).replace(
        '</article>',
        `<div style="padding:10px 0 4px"><button class="btn btn--outline btn--wide" data-move-bag="${E.esc(p.id)}">Move To Bag</button></div></article>`
      );
    }).join('');
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-move-bag]');
    if (!btn) return;
    e.preventDefault();
    const id = btn.dataset.moveBag;
    const p = E.findProduct(id);
    if (!p) return;
    E.addToCart(id, { size: p.sizes[0], color: p.colors[0] && p.colors[0].name });
    E.toast(`Moved to bag — ${E.esc(p.name)}`, { link: 'cart.html', linkText: 'View Bag' });
    /* keep it in the wishlist; just visual feedback */
    btn.textContent = 'Added ✓';
    setTimeout(() => { btn.textContent = 'Move To Bag'; }, 1600);
  });

  /* wishlist changes (heart clicks) → re-render */
  document.addEventListener('elan:state', () => {
    if ($('#wishGrid')) renderWishlist();
  });

  document.addEventListener('DOMContentLoaded', renderWishlist);
})();
