/* ============================================================
   Delivery Master — cart.js
   Shopping bag page: line items with quantity controls,
   removal, promo codes, totals and empty state
   ============================================================ */

(function () {
  'use strict';
  const E = window.ELAN;
  const $ = E.$; const $$ = E.$$;

  function renderCart() {
    const lines = E.getCart();
    const layout = $('#cartLayout');
    const empty = $('#cartEmpty');
    const note = $('#cartCountNote');

    if (!lines.length) {
      layout.hidden = true;
      empty.hidden = false;
      note.textContent = '';
      return;
    }

    layout.hidden = false;
    empty.hidden = true;
    note.textContent = `${E.cartCount()} item${E.cartCount() === 1 ? '' : 's'} in your bag`;

    $('#cartItems').innerHTML = lines.map((l, i) => {
      const p = E.findProduct(l.id);
      if (!p) return '';
      const key = E.cartLineKey(l.id, l.size, l.color);
      return `
        <div class="cart-item" data-key="${E.esc(key)}" style="animation-delay:${i * 50}ms">
          <a href="product.html?id=${encodeURIComponent(p.id)}"><img class="ci-img" src="${p.images[0]}" alt="${E.esc(p.name)}"></a>
          <div>
            <a class="ci-name" href="product.html?id=${encodeURIComponent(p.id)}">${E.esc(p.name)}</a>
            <div class="ci-meta">
              <span>Brand: ${E.esc(p.brand)}</span>
              <span>${l.color ? 'Color: ' + E.esc(l.color) + ' · ' : ''}${l.size ? 'Size: ' + E.esc(l.size) : 'One size'}</span>
            </div>
            <div class="ci-controls">
              <div class="qty-stepper" aria-label="Quantity">
                <button data-dec aria-label="Decrease quantity">−</button>
                <span class="qty-val">${l.qty}</span>
                <button data-inc aria-label="Increase quantity">+</button>
              </div>
              <button class="ci-remove" data-remove>Remove</button>
            </div>
          </div>
          <div class="ci-right">
            <div class="ci-price">
              ${p.oldPrice
                ? `<span class="old">${E.formatPrice(p.oldPrice)}</span><span class="now--sale">${E.formatPrice(p.price * l.qty)}</span>`
                : E.formatPrice(p.price * l.qty)}
            </div>
          </div>
        </div>`;
    }).join('');

    renderSummary();
  }

  function renderSummary() {
    const t = E.cartTotals();
    $('#sumSubtotal').textContent = E.formatPrice(t.subtotal);
    $('#sumDelivery').textContent = t.delivery === 0 ? 'FREE' : E.formatPrice(t.delivery);
    $('#sumDelivery').classList.toggle('free', t.delivery === 0);
    $('#sumTotal').textContent = E.formatPrice(t.total);

    const dRow = $('#sumDiscountRow');
    if (t.discount > 0) {
      dRow.hidden = false;
      const promo = E.getPromo();
      $('#sumDiscount').textContent = `-${E.formatPrice(t.discount)} (${promo.code})`;
    } else {
      dRow.hidden = true;
    }
  }

  /* ---------- line item events (delegation) ---------- */
  document.addEventListener('click', e => {
    const item = e.target.closest('.cart-item');
    if (!item) return;
    const key = item.dataset.key;
    const line = E.getCart().find(l => E.cartLineKey(l.id, l.size, l.color) === key);
    if (!line) return;

    if (e.target.closest('[data-inc]')) { E.setQty(key, line.qty + 1); renderCart(); }
    else if (e.target.closest('[data-dec]')) { E.setQty(key, line.qty - 1); renderCart(); }
    else if (e.target.closest('[data-remove]')) {
      E.removeFromCart(key);
      E.toast('Removed from your bag');
      renderCart();
      if (window.matchMedia('(max-width: 880px)').matches) window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  /* ---------- promo code ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    renderCart();

    $('#promoApply').addEventListener('click', () => {
      const input = $('#promoInput');
      const msg = $('#promoMsg');
      const code = input.value.trim();
      if (!code) { msg.textContent = 'Enter a promo code first.'; msg.className = 'promo-msg err'; return; }
      if (E.applyPromo(code)) {
        msg.textContent = `Code ${code.toUpperCase()} applied!`;
        msg.className = 'promo-msg ok';
        renderSummary();
        E.toast(`Promo ${code.toUpperCase()} applied`, { icon: 'check' });
      } else {
        msg.textContent = 'That code isn\'t valid. Try WELCOME10 or EXTRA20.';
        msg.className = 'promo-msg err';
      }
    });

    /* checkout guard */
    $('#checkoutBtn').addEventListener('click', e => {
      if (!E.getCart().length) {
        e.preventDefault();
        E.toast('Your bag is empty — add something first');
      }
    });

    /* re-render when cart changes elsewhere (e.g. quick view) */
    document.addEventListener('elan:state', () => {
      /* avoid re-render loops while this page's own handlers are mid-flight */
      if (!$('#cartLayout')) return;
      renderCart();
    });
  });
})();
