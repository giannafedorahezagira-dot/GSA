/* ============================================================
   ÉLAN — checkout.js
   Demo checkout: form validation, delivery method, order
   summary and a simulated order confirmation. No backend —
   nothing is sent anywhere and no payment is processed.
   ============================================================ */

(function () {
  'use strict';
  const E = window.ELAN;

  let deliveryCost = 0; // standard = free over $75, express = 9.99

  /* ---------- summary ---------- */
  function renderSummary() {
    const t = E.cartTotals(deliveryCost);
    $('#coSubtotal').textContent = E.formatPrice(t.subtotal);
    $('#coDelivery').textContent = t.delivery === 0 ? 'FREE' : E.formatPrice(t.delivery);
    $('#coDelivery').classList.toggle('free', t.delivery === 0);
    $('#coTotal').textContent = E.formatPrice(t.total);
    $('#placeTotal').textContent = E.formatPrice(t.total);

    const dRow = $('#coDiscountRow');
    if (t.discount > 0) {
      dRow.hidden = false;
      $('#coDiscount').textContent = `-${E.formatPrice(t.discount)} (${E.getPromo().code})`;
    } else {
      dRow.hidden = true;
    }

    $('#coItems').innerHTML = E.getCart().map(l => {
      const p = E.findProduct(l.id);
      if (!p) return '';
      return `
        <div class="co-item">
          <img src="${p.images[0]}" alt="${E.esc(p.name)}">
          <div>
            <div class="n">${E.esc(p.name)}</div>
            <div class="m">${l.color ? E.esc(l.color) + ' · ' : ''}${l.size ? 'Size ' + E.esc(l.size) : 'One size'} · Qty ${l.qty}</div>
          </div>
          <div class="p">${E.formatPrice(p.price * l.qty)}</div>
        </div>`;
    }).join('');
  }

  /* ---------- input niceties ---------- */
  function initInputMasks() {
    const num = $('#cardNumber');
    num.addEventListener('input', () => {
      const digits = num.value.replace(/\D/g, '').slice(0, 16);
      num.value = digits.replace(/(.{4})/g, '$1 ').trim();
    });
    const exp = $('#cardExpiry');
    exp.addEventListener('input', () => {
      const digits = exp.value.replace(/\D/g, '').slice(0, 4);
      exp.value = digits.length > 2 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits;
    });
    $('#cardCvc').addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').slice(0, 4);
    });
  }

  /* ---------- delivery method ---------- */
  function initShipping() {
    $$('[name="ship"]').forEach(radio => {
      radio.addEventListener('change', () => {
        $$('.ship-opt').forEach(o => o.classList.toggle('selected', o.contains(radio)));
        deliveryCost = radio.value === 'express' ? 9.99 : null;
        renderSummary();
      });
    });
  }

  /* ---------- validation ---------- */
  function validate() {
    let ok = true;
    let firstBad = null;

    function mark(id, bad) {
      const field = $(id).closest('.field');
      field.classList.toggle('invalid', bad);
      if (bad && !firstBad) firstBad = $(id);
      if (bad) ok = false;
    }

    mark('#coEmail', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($('#coEmail').value.trim()));
    mark('#coFirst', !$('#coFirst').value.trim());
    mark('#coLast', !$('#coLast').value.trim());
    mark('#coAddress', !$('#coAddress').value.trim());
    mark('#coCity', !$('#coCity').value.trim());
    mark('#coZip', !$('#coZip').value.trim());
    mark('#cardName', !$('#cardName').value.trim());
    mark('#cardNumber', $('#cardNumber').value.replace(/\D/g, '').length !== 16);
    mark('#cardExpiry', !/^\d{2}\/\d{2}$/.test($('#cardExpiry').value));
    mark('#cardCvc', $('#cardCvc').value.length < 3);

    if (!ok && firstBad) firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return ok;
  }

  /* ---------- place order ---------- */
  function placeOrder(e) {
    e.preventDefault();
    if (!E.getCart().length) {
      $('#checkoutWrap').hidden = true;
      $('#coEmpty').hidden = false;
      return;
    }
    if (!validate()) return;

    const btn = $('#placeOrderBtn');
    btn.disabled = true;
    btn.innerHTML = 'Processing…';
    E.clearPromo();

    /* simulate a brief payment-authorisation delay */
    setTimeout(() => {
      const t = E.cartTotals(deliveryCost);
      const orderNo = 'ÉLN-' + String(Math.floor(100000 + Math.random() * 900000));
      $('#orderNo').textContent = orderNo;
      $('#orderEmail').textContent = $('#coEmail').value.trim();
      $('#orderTotal').textContent = `${E.getCart().reduce((s, l) => s + l.qty, 0)} item(s) — total ${E.formatPrice(t.total)} — on its way soon.`;
      E.clearCart();
      $('#checkoutWrap').hidden = true;
      $('#orderSuccess').hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1200);
  }

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    if (!E.getCart().length) {
      $('#checkoutWrap').hidden = true;
      $('#coEmpty').hidden = false;
      return;
    }
    renderSummary();
    initInputMasks();
    initShipping();
    $('#checkoutForm').addEventListener('submit', placeOrder);
    document.addEventListener('elan:state', () => {
      if (!$('#checkoutWrap').hidden) renderSummary();
    });
  });
})();
