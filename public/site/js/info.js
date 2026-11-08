/* ============================================================
   ÉLAN — info.js
   Static info pages: about, delivery, returns, privacy,
   terms, size guide, FAQ & contact — rendered from content
   objects so no page is ever an empty stub
   ============================================================ */

(function () {
  'use strict';
  const E = window.ELAN;

  const PAGES = {
    about: {
      title: 'About ÉLAN',
      crumb: 'About Us',
      blocks: [
        { h: 'Dress Like It Matters', p: 'ÉLAN was founded on a simple belief: getting dressed should feel like an event, even on an ordinary Tuesday. We started as a small studio label making precisely-cut essentials, and we\'ve grown into a full fashion destination — while keeping the studio\'s obsession with fit, fabric and finish.' },
        { h: 'What We Stand For', p: 'Considered design over fast noise. Our collections are built around pieces you\'ll re-wear for years: a perfect white tee, a sharp shoulder, a shoe that walks the whole city. Every season we add new energy — but the fundamentals never go out of style.' },
        { h: 'The ÉLAN Studio', p: 'Every ÉLAN piece starts as a sketch in our in-house studio, is sampled on real bodies in real sizes, and is produced by partner ateliers audited for fair working conditions. When you buy from ÉLAN you buy from people we know by name.' },
        { h: 'By The Numbers', p: 'Over 2 million orders delivered. A 4.8-star average product rating. A 30-day, free-returns promise on every single item. And a customer care team that answers within hours, not days.' }
      ]
    },
    delivery: {
      title: 'Delivery Information',
      crumb: 'Delivery',
      blocks: [
        { h: 'Delivery Options', ul: [
          'Standard Delivery — 3 to 5 business days. FREE on orders over $75, otherwise $4.99.',
          'Express Delivery — 1 to 2 business days. $9.99, free over $150.'
        ]},
        { h: 'Where We Ship', p: 'We deliver to 47 countries worldwide. Import duties are calculated at checkout where applicable, so there are never surprise fees at your door.' },
        { h: 'Tracking Your Order', p: 'The moment your parcel leaves our warehouse you\'ll receive a tracking link by email and SMS. Standard orders are cut off at 4pm for same-day dispatch; express orders placed before noon are dispatched the same working day.' },
        { h: 'Delivery Issues', p: 'If your parcel is late, damaged or missing, contact our care team via the Contact page with your order number — we\'ll trace it, replace it or refund it, whichever you prefer.' }
      ]
    },
    returns: {
      title: 'Returns & Refunds',
      crumb: 'Returns',
      blocks: [
        { h: '30-Day Free Returns', p: 'Changed your mind? No problem. You have 30 days from delivery to return anything, for any reason, completely free of charge. Items should be unworn with tags attached — but we\'ll always be reasonable about the small stuff.' },
        { h: 'How To Return', ul: [
          'Start your return from your confirmation email (click "Return an item").',
          'Print the prepaid label or show the QR code at any drop-off point.',
          'Hand in your parcel — refunds land within 3 to 5 working days of arrival.'
        ]},
        { h: 'Exchanges', p: 'Need a different size or color? Return for a refund and place a new order, or contact us and we\'ll hold your new size while your return travels back.' },
        { h: 'Refund Details', p: 'Refunds always go back to the original payment method. Sale items are refunded at the price paid. Promo discounts are proportionally preserved on kept items.' }
      ]
    },
    privacy: {
      title: 'Privacy Policy',
      crumb: 'Privacy Policy',
      blocks: [
        { h: 'What We Collect', p: 'This is a demo storefront — your bag, wishlist and account details live only in your own browser\'s local storage. Nothing is transmitted to us or any third party. Newsletter and sign-in forms demonstrate validation only.' },
        { h: 'How A Real Store Would Use Data', p: 'In a production store, checkout data would be used solely to fulfil your order, and marketing emails would only be sent with your explicit consent. You would retain the right to access, correct and delete your data at any time.' },
        { h: 'Cookies & Local Storage', ul: [
          'elan_cart_v1 — the contents of your shopping bag.',
          'elan_wishlist_v1 — the products you\'ve saved.',
          'elan_user_v1 — the demo sign-in name and email.'
        ]},
        { h: 'Your Control', p: 'You can clear everything at any time by clearing your browser storage for this site — the store will keep working perfectly.' }
      ]
    },
    terms: {
      title: 'Terms & Conditions',
      crumb: 'Terms',
      blocks: [
        { h: 'The Demo Store', p: 'ÉLAN is a front-end demonstration project. No real transactions occur, no payments are processed and no personal data leaves your browser. All products, prices and promotions are illustrative.' },
        { h: 'Prices & Promotions', p: 'All prices are shown in USD including taxes. Promo codes WELCOME10 and EXTRA20 are active demo codes. The free-delivery threshold is $75.' },
        { h: 'Intellectual Property', p: 'The ÉLAN brand identity, layouts and copy on this site are original demonstration content. Product photography is served from stock sources for demonstration purposes.' },
        { h: 'Liability', p: 'Nothing on this site constitutes financial, legal or fashion-critical advice. Dress joyfully and at your own risk.' }
      ]
    },
    'size-guide': {
      title: 'Size Guide',
      crumb: 'Size Guide',
      blocks: [
        { h: 'Clothing — Women', table: {
          head: ['Size', 'Bust (cm)', 'Waist (cm)', 'Hip (cm)'],
          rows: [['XS', '80–84', '62–66', '88–92'], ['S', '84–88', '66–70', '92–96'], ['M', '88–94', '70–76', '96–102'], ['L', '94–100', '76–82', '102–108'], ['XL', '100–106', '82–88', '108–114']]
        }},
        { h: 'Clothing — Men', table: {
          head: ['Size', 'Chest (cm)', 'Waist (cm)'],
          rows: [['XS', '84–88', '72–76'], ['S', '88–94', '76–82'], ['M', '94–100', '82–88'], ['L', '100–106', '88–94'], ['XL', '106–112', '94–100']]
        }},
        { h: 'Shoes — EU Sizing', table: {
          head: ['EU', 'UK', 'US Women', 'US Men', 'Foot length (cm)'],
          rows: [['36', '3.5', '6', '4', '22.5'], ['37', '4.5', '7', '5', '23.5'], ['38', '5.5', '8', '6', '24'], ['39', '6.5', '9', '7', '25'], ['40', '7', '9.5', '8', '25.5'], ['41', '7.5', '10', '9', '26.5'], ['42', '8.5', '11', '10', '27.5']]
        }},
        { h: 'Fit Tips', ul: [
          'Between sizes? Take the larger one for knits and outerwear, the smaller for tailored pieces.',
          'Measure over light clothing, keeping the tape horizontal and relaxed.',
          'Still unsure — chat with our care team and we\'ll advise on the specific piece.'
        ]}
      ]
    },
    faq: {
      title: 'Frequently Asked Questions',
      crumb: 'FAQ',
      blocks: [
        { h: 'Orders', ul: [
          'Can I change my order after placing it? — Yes, within 60 minutes; contact us fast and we\'ll edit it.',
          'Where is my order confirmation? — It\'s sent to the email entered at checkout (demo store: no email is actually sent).',
          'Can I combine promo codes? — One code per order; the system keeps whichever saves you more at real stores.'
        ]},
        { h: 'Payments', ul: [
          'Which payment methods can I use? — Visa, Mastercard, Amex, PayPal and Apple Pay (demo: any card details are accepted).',
          'Is payment secure? — Real stores encrypt with 256-bit SSL; this demo never transmits anything at all.',
          'When am I charged? — At order confirmation, and refunds process automatically on return arrival.'
        ]},
        { h: 'Delivery & Returns', ul: [
          'How long does delivery take? — 3–5 business days standard, 1–2 express.',
          'Is delivery really free? — On every order over $75.',
          'How do returns work? — Free within 30 days; see the Returns page for the 3-step guide.'
        ]}
      ]
    },
    contact: {
      title: 'Customer Service',
      crumb: 'Contact Us',
      blocks: [
        { h: 'Talk To Us', contact: [
          { icon: 'chat', b: 'Live Chat', s: 'Available 24/7 — average reply in under 2 minutes.' },
          { icon: 'mail', b: 'care@elan-fashion.example', s: 'Email us any time — we reply within 4 hours, 7 days a week.' },
          { icon: 'phone', b: '+1 (800) 555-ÉLAN', s: 'Mon–Fri, 8am–8pm. Sat, 9am–5pm.' }
        ]},
        { h: 'Before You Write', p: 'For order questions, have your order number ready (it starts with ÉLN-). For returns, the fastest route is the Returns page — most refunds are approved instantly.' },
        { h: 'Press & Partnerships', p: 'For collaborations, press requests and influencer programmes, email press@elan-fashion.example with your media kit. We read everything and love bold ideas.' },
        { h: 'Careers', p: 'The studio, warehouse and care teams are always growing. Say hello at jobs@elan-fashion.example.' }
      ]
    }
  };

  function render() {
    const key = E.getParam('page') || 'about';
    const page = PAGES[key] || PAGES.about;
    document.title = `${page.title} | ÉLAN`;
    $('#infoTitle').textContent = page.title;
    $('#infoCrumb').textContent = page.crumb;

    const ICONS = {
      chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 11.5a8.38 8.38 0 01-8.5 8.5 8.5 8.5 0 01-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 01-.9-3.8 8.38 8.38 0 018.5-8.5 8.38 8.38 0 018.5 8.5z"/></svg>',
      mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>',
      phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 2 .7 2.9a2 2 0 01-.5 2.1L8 10a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.9.3 1.9.6 2.9.7a2 2 0 011.7 2z"/></svg>'
    };

    $('#infoContent').innerHTML = page.blocks.map(b => {
      if (b.table) {
        return `<div class="info-block"><h3>${b.h}</h3>
          <table class="size-table">
            <thead><tr>${b.table.head.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${b.table.rows.map(r => `<tr>${r.map((c, i) => `<td${i === 0 ? ' style="font-weight:700"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody>
          </table></div>`;
      }
      if (b.contact) {
        return `<div class="info-block"><h3>${b.h}</h3><div class="contact-grid">
          ${b.contact.map(c => `<div class="contact-card">${ICONS[c.icon] || ICONS.chat}<b>${c.b}</b><span>${c.s}</span></div>`).join('')}
        </div></div>`;
      }
      if (b.ul) {
        return `<div class="info-block"><h3>${b.h}</h3><ul>${b.ul.map(li => `<li>${li}</li>`).join('')}</ul></div>`;
      }
      return `<div class="info-block"><h3>${b.h}</h3><p>${b.p}</p></div>`;
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', render);
})();
