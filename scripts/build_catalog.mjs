#!/usr/bin/env node
/* ============================================================
   build_catalog.mjs — makes two files for the website:
   · public/site/js/images.js  (big campaign images)
   · public/site/js/products.js (all 36 products + their photos)

   It reads the saved search results in scripts/img/*.json,
   checks that every image link works, and picks photos for
   each product. If a photo is broken it swaps in a spare.
   ============================================================ */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const IMG_DIR = '/home/z/my-project/scripts/img';
const OUT_DIR = '/home/z/my-project/public/site/js';

/* ---------- 1. load all search results ---------- */

// skip stock-photo sites: their pictures usually carry a watermark
const BLOCKED_SOURCES = ['alamy', 'shutterstock', 'dreamstime', '123rf',
  'depositphotos', 'istock', 'getty', 'bigstock', 'canstock', 'adobe stock'];

const pools = {}; // pools["p_dress"] = ["https://...", ...]
for (const f of ['hero_w1', 'hero_m1', 'promo_1', 'promo_2',
  'p_dress', 'p_blazer', 'p_knit', 'p_trousers', 'p_trench', 'p_cami', 'p_jeans_w', 'p_skirt',
  'p_tee_m', 'p_shirt_m', 'p_hoodie', 'p_bomber', 'p_jeans_m', 'p_merino',
  'p_heels', 'p_sneakers_w', 'p_chelsea', 'p_chunky', 'p_loafers', 'p_sandals',
  'p_tote', 'p_necklace', 'p_sunglasses', 'p_watch', 'p_scarf', 'p_cap', 'p_crossbody',
  'p_lipstick', 'p_perfume', 'p_serum', 'p_palette',
  'p_leggings', 'p_trainingtee', 'p_sportsbra', 'p_runjacket', 'p_joggers']) {
  const path = `${IMG_DIR}/${f}.json`;
  if (existsSync(path)) {
    try {
      const data = JSON.parse(readFileSync(path, 'utf8'));
      pools[f] = (data.results || [])
        .filter(r => {
          const src = String(r.source || '').toLowerCase();
          return !BLOCKED_SOURCES.some(b => src.includes(b));
        })
        .map(r => r.original_url)
        .filter(Boolean);
    } catch (e) { pools[f] = []; }
  } else pools[f] = [];
}

const totalImgs = Object.values(pools).reduce((s, a) => s + a.length, 0);
console.log(`Loaded pools: ${Object.keys(pools).length} groups, ${totalImgs} images total`);
const empty = Object.entries(pools).filter(([k, v]) => v.length === 0);
if (empty.length) console.log('Empty groups:', empty.map(([k]) => k).join(', '));

/* ---------- 2. check every image link (HEAD request) ---------- */

async function urlOk(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch (e) { return false; }
}

async function checkAll(urls) {
  const out = new Set();
  const tasks = urls.map(async u => { if (await urlOk(u)) out.add(u); });
  await Promise.all(tasks);
  return out;
}

console.log('Checking image links…');
const allUrls = [...new Set(Object.values(pools).flat())];
const goodSet = await checkAll(allUrls);
console.log(`${goodSet.size}/${allUrls.length} links are working`);
// keep only working links in each group
for (const k of Object.keys(pools)) {
  pools[k] = pools[k].filter(u => goodSet.has(u));
}

/* ---------- 3. a simple "take next photo" helper ---------- */

const used = new Set(); // avoid using the same photo twice when possible

function take(group, count, fallbackGroups) {
  const out = [];
  const pool = (pools[group] || []).slice();
  const fallbacks = (fallbackGroups || []).flatMap(g => pools[g] || []);
  const everything = Object.values(pools).flat();

  const candidates = [...pool, ...fallbacks, ...everything];
  for (const url of candidates) {
    if (out.length >= count) break;
    if (!used.has(url)) { out.push(url); used.add(url); }
  }
  // if every photo is already used somewhere, allow repeats
  for (const url of candidates) {
    if (out.length >= count) break;
    if (!out.includes(url)) out.push(url);
  }
  return out;
}

/* ---------- 4. campaign images (hero, promos, tiles) ---------- */

const IMG = {
  hero1: take('hero_w1', 1)[0],
  hero2: take('hero_w1', 1)[0],
  hero3: take('hero_m1', 1)[0],
  promo1: take('promo_1', 1)[0],
  promo2: take('promo_2', 1)[0],
  catWomen: take('hero_w1', 1)[0],
  catMen: take('hero_m1', 1)[0],
  catShoes: take('p_sneakers_w', 1, ['p_heels'])[0],
  catAcc: take('p_tote', 1, ['p_watch', 'p_crossbody'])[0],
  catBeauty: take('p_lipstick', 1, ['p_perfume', 'p_palette'])[0],
  catSport: take('p_leggings', 1, ['p_sportsbra'])[0],
  megaWomen: take('hero_w1', 1)[0],
  megaMen: take('hero_m1', 1)[0],
  megaClothing: take('p_trousers', 1, ['p_blazer', 'p_dress'])[0],
  megaShoes: take('p_heels', 1, ['p_sneakers_w'])[0],
  megaAccessories: take('p_watch', 1, ['p_tote', 'p_necklace'])[0],
  editorial: take('promo_2', 1, ['hero_w1'])[0]
};

/* quick guard: replace any missing slot with a working image */
const anyGood = [...goodSet];
for (const k of Object.keys(IMG)) {
  if (!IMG[k]) IMG[k] = anyGood[k % Math.max(1, anyGood.length)] || '';
}

/* ---------- 5. the product list ---------- */

// helper shortcuts
const CL = ['XS', 'S', 'M', 'L', 'XL'];           // clothes sizes
const SH = ['36', '37', '38', '39', '40', '41', '42']; // shoe sizes (EU)
const OS = ['One Size'];

const BLACK = { name: 'Black', hex: '#141414' };
const WHITE = { name: 'White', hex: '#f4f2ee' };
const BEIGE = { name: 'Beige', hex: '#d8c7b2' };
const BROWN = { name: 'Brown', hex: '#7a5a3c' };
const GREY = { name: 'Grey', hex: '#9a9a98' };
const NAVY = { name: 'Navy', hex: '#26324c' };
const RED = { name: 'Red', hex: '#a81830' };
const GOLD = { name: 'Gold', hex: '#d4af6a' };
const SILVER = { name: 'Silver', hex: '#c8c8cd' };
const OLIVE = { name: 'Olive', hex: '#5c614e' };
const CREAM = { name: 'Cream', hex: '#efe6d6' };

// Every product: photo group + shopping info.
// photos: [main, hover/gallery 2nd, gallery 3rd]
const DEFS = [
  /* ---- WOMEN CLOTHING (8) ---- */
  { key: 'p_dress', id: 'w-satin-slip-dress', name: 'Sculpted Satin Slip Dress', sub: 'dresses',
    price: 85, oldPrice: 120, colors: [BLACK, CREAM], sizes: CL, rating: 4.8, reviews: 214, pop: 97, trending: true, isNew: true,
    desc: 'A fluid satin slip cut on the bias so it skims, not clings. Adjustable straps and a midi length make it the dress for weddings, dinners and everything after.',
    details: ['100% recycled satin-feel polyester', 'Bias cut with adjustable straps', 'Midi length, true to size', 'Cold wash, hang dry'] },
  { key: 'p_blazer', id: 'w-oversized-blazer', name: 'Oversized Double-Breast Blazer', sub: 'blazers',
    price: 110, colors: [BLACK, BEIGE], sizes: CL, rating: 4.7, reviews: 168, pop: 92, trending: true,
    desc: 'Sharp shoulders and a relaxed, boyfriend fit. Layer over everything from slip dresses to denim — this is the jacket that finishes an outfit.',
    details: ['Structured shoulder pads', 'Double-breasted button front', 'Fully lined', 'Dry clean recommended'] },
  { key: 'p_knit', id: 'w-mohair-cardigan', name: 'Cloud Knit Cardigan', sub: 'knitwear',
    price: 65, oldPrice: 85, colors: [CREAM, GREY], sizes: CL, rating: 4.6, reviews: 132, pop: 84,
    desc: 'The softest cardigan we have ever made. A fuzzy, cloud-like knit with dropped shoulders and pearl-look buttons.',
    details: ['Soft brushed knit yarn', 'Dropped shoulders', 'Front button fastening', 'Hand wash cool'] },
  { key: 'p_trousers', id: 'w-wide-leg-trousers', name: 'Wide Leg Tailored Trousers', sub: 'trousers',
    price: 75, colors: [BLACK, NAVY], sizes: CL, rating: 4.5, reviews: 98, pop: 78, isNew: true,
    desc: 'Floor-skimming wide legs with a pressed crease and hidden hook closure. Tailoring that moves like lounge pants.',
    details: ['High rise with crease front', 'Concealed hook and zip', 'Sits true to size', 'Machine wash cold'] },
  { key: 'p_trench', id: 'w-belted-trench', name: 'Belted Classic Trench Coat', sub: 'coats',
    price: 150, oldPrice: 190, colors: [BEIGE, BLACK], sizes: CL, rating: 4.9, reviews: 187, pop: 95, trending: true,
    desc: 'The one-coat wardrobe solution. Water-resistant cotton blend, storm flap and a waist tie that cinches or loosens with your mood.',
    details: ['Water-resistant cotton blend', 'Storm flap and buckled belt', 'Falls below the knee', 'Wipe clean'] },
  { key: 'p_cami', id: 'w-satin-cami-top', name: 'Satin Bias Cami Top', sub: 'tops',
    price: 38, colors: [BLACK, CREAM, RED], sizes: CL, rating: 4.4, reviews: 76, pop: 70,
    desc: 'A glossy satin cami with a cowl neckline. Wear it under blazers by day and on its own by night.',
    details: ['Satin-feel finish', 'Cowl neck, adjustable straps', 'Easy-care machine wash', 'True to size'] },
  { key: 'p_jeans_w', id: 'w-high-rise-jeans', name: 'High Rise Straight Jeans', sub: 'denim',
    price: 69, colors: [BLUE2(), INDIGO()], sizes: CL, rating: 4.6, reviews: 241, pop: 90, trending: true,
    desc: 'A high waist that holds and straight legs that elongate. Rigid-look denim with just enough stretch to keep you moving.',
    details: ['11oz comfort stretch denim', 'High rise, straight leg', 'Full length', 'Wash inside out'] },
  { key: 'p_skirt', id: 'w-pleated-midi-skirt', name: 'Pleated Midi Skirt', sub: 'skirts',
    price: 58, oldPrice: 72, colors: [BLACK, OLIVE], sizes: CL, rating: 4.5, reviews: 84, pop: 74,
    desc: 'Knife pleats that swing beautifully with every step. An elastic waist keeps it comfortable from desk to dinner.',
    details: ['Fine knife pleats', 'Elasticated comfort waist', 'Midi length', 'Machine wash cold'] },

  /* ---- MEN CLOTHING (6) ---- */
  { key: 'p_tee_m', id: 'm-heavyweight-tee', name: 'Heavyweight Essential Tee', sub: 'tshirts',
    price: 29, colors: [WHITE, BLACK, GREY], sizes: CL, rating: 4.7, reviews: 320, pop: 96, trending: true,
    desc: 'A proper tee: dense 240gsm cotton, a neat ribbed collar and a boxy cut that keeps its shape wash after wash.',
    details: ['240gsm heavyweight cotton', 'Ribbed crew neck', 'Boxy regular fit', 'Machine wash cold'] },
  { key: 'p_shirt_m', id: 'm-oxford-shirt', name: 'Oxford Button-Down Shirt', sub: 'shirts',
    price: 55, colors: [WHITE, NAVY], sizes: CL, rating: 4.5, reviews: 141, pop: 79, isNew: true,
    desc: 'The smart-casual hero. Soft brushed oxford cotton with a button-down collar that looks right with or without a tie.',
    details: ['Brushed cotton oxford', 'Button-down collar', 'Regular fit', 'Machine wash warm'] },
  { key: 'p_hoodie', id: 'm-fleece-hoodie', name: 'Full Zip Fleece Hoodie', sub: 'hoodies',
    price: 70, oldPrice: 89, colors: [GREY, BLACK], sizes: CL, rating: 4.6, reviews: 198, pop: 88, trending: true,
    desc: 'Brushed-back fleece with a two-way zip and a double-layer hood. Warm enough for the morning run, clean enough for the café after.',
    details: ['Brushed fleece interior', 'Two-way full zip', 'Kangaroo pockets', 'Machine wash cold'] },
  { key: 'p_bomber', id: 'm-nylon-bomber', name: 'Tech Nylon Bomber Jacket', sub: 'jackets',
    price: 120, colors: [BLACK, OLIVE], sizes: CL, rating: 4.4, reviews: 87, pop: 76,
    desc: 'A clean-lined bomber in matte technical nylon. Water-repellent shell, ribbed trims and a pocket for everything.',
    details: ['Water-repellent nylon shell', 'Ribbed collar and cuffs', 'Interior zip pocket', 'Wipe clean'] },
  { key: 'p_jeans_m', id: 'm-slim-stretch-denim', name: 'Slim Stretch Denim', sub: 'denim',
    price: 79, colors: [BLUE2(), BLACK], sizes: CL, rating: 4.5, reviews: 156, pop: 82,
    desc: 'Slim but never tight. Mid-weight denim with 2% stretch engineered for all-day comfort.',
    details: ['Mid-weight stretch denim', 'Slim tapered leg', 'Mid rise', 'Wash inside out'] },
  { key: 'p_merino', id: 'm-merino-crew-knit', name: 'Merino Crew Knit', sub: 'knitwear',
    price: 85, colors: [NAVY, GREY, CREAM], sizes: CL, rating: 4.8, reviews: 112, pop: 86, isNew: true,
    desc: 'Fine-gauge merino wool that regulates temperature like a charm. A crew neck that works under jackets or alone.',
    details: ['100% extra-fine merino wool', 'Fine-gauge 12gg knit', 'Ribbed trims', 'Hand wash cool'] },

  /* ---- SHOES (6) ---- */
  { key: 'p_heels', id: 's-slingback-heels', name: 'Pointed Slingback Heels', sub: 'heels',
    price: 89, oldPrice: 115, colors: [BLACK, CREAM], sizes: SH, rating: 4.3, reviews: 92, pop: 81,
    desc: 'A 7cm heel you can actually walk in. Pointed toe, elasticated slingback strap and a padded insole.',
    details: ['7cm block heel', 'Elasticated slingback', 'Padded comfort insole', 'Synthetic upper'] },
  { key: 'p_sneakers_w', id: 's-court-sneakers', name: 'Court Leather Sneakers', sub: 'sneakers',
    price: 95, colors: [WHITE, GREY], sizes: SH, rating: 4.7, reviews: 276, pop: 94, trending: true,
    desc: 'Minimal court-style sneakers in full-grain leather. The clean white pair that goes with literally everything.',
    details: ['Full-grain leather upper', 'Cupsole construction', 'Cushioned footbed', 'Wipe clean'] },
  { key: 'p_chelsea', id: 's-chelsea-boots', name: 'Leather Chelsea Boots', sub: 'boots',
    price: 130, colors: [BROWN, BLACK], sizes: SH, rating: 4.6, reviews: 134, pop: 85, isNew: true,
    desc: 'Goodyear-welted chelseas that will be resoled, not replaced. Pull tabs and elastic gores for an easy on.',
    details: ['Goodyear welt construction', 'Full-grain leather', 'Twin elastic gores', 'Resolable build'] },
  { key: 'p_chunky', id: 's-trail-sneakers', name: 'Chunky Trail Sneakers', sub: 'sneakers',
    price: 110, colors: [GREY, WHITE], sizes: SH, rating: 4.4, reviews: 118, pop: 77,
    desc: 'Lifted, layered and ready for pavement. A chunky EVA sole puts you 4cm closer to the clouds.',
    details: ['4cm EVA chunky sole', 'Mesh and suede upper', 'Reflective details', 'Machine washable insoles'] },
  { key: 'p_loafers', id: 's-leather-loafers', name: 'Penny Leather Loafers', sub: 'loafers',
    price: 105, colors: [BROWN, BLACK], sizes: SH, rating: 4.5, reviews: 97, pop: 73,
    desc: 'Softened leather loafers with a hand-stitched apron toe. Boardroom by day, bar by night.',
    details: ['Hand-stitched apron toe', 'Softened calf leather', 'Leather lining', 'Rubber-inserted sole'] },
  { key: 'p_sandals', id: 's-strappy-sandals', name: 'Strappy Heeled Sandals', sub: 'sandals',
    price: 75, oldPrice: 99, colors: [BLACK, GOLD], sizes: SH, rating: 4.2, reviews: 64, pop: 68,
    desc: 'Barely-there strappy sandals with an 8cm heel and a delicate ankle tie. Occasion season sorted.',
    details: ['8cm slender heel', 'Adjustable ankle tie', 'Buckle fastening', 'Padded footbed'] },

  /* ---- ACCESSORIES (7) ---- */
  { key: 'p_tote', id: 'a-structured-tote', name: 'Structured Everyday Tote', sub: 'bags',
    price: 120, colors: [BLACK, BROWN], sizes: OS, rating: 4.8, reviews: 203, pop: 93, trending: true,
    desc: 'A laptop-friendly tote that keeps its shape. Pebbled leather, suede lining and a magnetic top closure.',
    details: ['Fits 14" laptop', 'Pebbled leather-look finish', 'Suede-feel lining', 'Interior zip pocket'] },
  { key: 'p_necklace', id: 'a-layered-necklace', name: 'Gold Layered Necklace', sub: 'jewelry',
    price: 35, colors: [GOLD, SILVER], sizes: OS, rating: 4.4, reviews: 148, pop: 72, isNew: true,
    desc: 'Three delicate chains in one clasp — the layered look without the morning tangle. 18k gold plating.',
    details: ['Triple chain design', '18k gold plated brass', 'Single clasp, no tangling', '42–48cm graduated lengths'] },
  { key: 'p_sunglasses', id: 'a-oversized-sunglasses', name: 'Oversized Square Sunglasses', sub: 'sunglasses',
    price: 45, oldPrice: 59, colors: [BLACK, BROWN], sizes: OS, rating: 4.3, reviews: 89, pop: 69,
    desc: 'Full-coverage square frames with UV400 lenses. Hand-polished acetate that feels properly premium.',
    details: ['UV400 protection', 'Hand-polished acetate', 'Category 3 lenses', 'Comes with case and cloth'] },
  { key: 'p_watch', id: 'a-minimal-watch', name: 'Minimal Leather Watch', sub: 'watches',
    price: 140, colors: [BROWN, BLACK], sizes: OS, rating: 4.7, reviews: 176, pop: 89, trending: true,
    desc: 'A 38mm brushed-steel case on a full-grain leather strap. Japanese quartz movement, quietly elegant.',
    details: ['38mm brushed steel case', 'Full-grain leather strap', 'Japanese quartz movement', '5 ATM water resistant'] },
  { key: 'p_scarf', id: 'a-cashmere-scarf', name: 'Brushed Cashmere Scarf', sub: 'scarves',
    price: 60, oldPrice: 80, colors: [GREY, CREAM], sizes: OS, rating: 4.6, reviews: 71, pop: 66,
    desc: 'Feather-light brushed cashmere blend in a generous 200cm length. The scarf you will "borrow" forever.',
    details: ['Cashmere-rich blend', '200 × 65cm', 'Brushed both sides', 'Dry clean or hand wash'] },
  { key: 'p_cap', id: 'a-wool-cap', name: 'Wool Baseball Cap', sub: 'caps',
    price: 28, colors: [BLACK, BEIGE], sizes: OS, rating: 4.2, reviews: 58, pop: 61,
    desc: 'A six-panel cap in soft brushed wool with a gunmetal slider. Smart enough for the city, casual enough for anywhere.',
    details: ['Brushed wool-look fabric', 'Six-panel construction', 'Adjustable metal slider', 'Spot clean'] },
  { key: 'p_crossbody', id: 'a-crossbody-bag', name: 'Compact Crossbody Bag', sub: 'bags',
    price: 85, colors: [BLACK, CREAM], sizes: OS, rating: 4.5, reviews: 121, pop: 80, isNew: true,
    desc: 'Hands-free and just the right size: phone, cards, keys, lip balm. Adjustable webbing strap.',
    details: ['Adjustable webbing strap', 'Zip-top closure', 'Card slots inside', 'Water-repellent finish'] },

  /* ---- BEAUTY (4) ---- */
  { key: 'p_lipstick', id: 'b-velvet-lipstick', name: 'Velvet Matte Lipstick', sub: 'lips',
    price: 22, colors: [RED, { name: 'Nude', hex: '#c98e7a' }], sizes: OS, rating: 4.6, reviews: 232, pop: 87, trending: true,
    desc: 'Full-pigment color with a blurred velvet finish that never dries out. Eight-hour wear, zero feathering.',
    details: ['Velvet matte finish', '8-hour wear', 'With jojoba and vitamin E', 'Cruelty free'] },
  { key: 'p_perfume', id: 'b-eau-de-parfum', name: 'Nuit Blanche Eau de Parfum', sub: 'fragrance',
    price: 78, colors: [], sizes: OS, rating: 4.8, reviews: 189, pop: 91, isNew: true,
    desc: 'White florals over warm amber and cedarwood. A signature scent that arrives before you do.',
    details: ['50ml eau de parfum', 'Top: bergamot, pink pepper', 'Heart: jasmine, iris', 'Base: amber, cedarwood'] },
  { key: 'p_serum', id: 'b-glow-serum', name: 'Daily Glow Vitamin C Serum', sub: 'skincare',
    price: 42, colors: [], sizes: OS, rating: 4.5, reviews: 164, pop: 83,
    desc: '15% stabilized vitamin C with hyaluronic acid. Brighter mornings in a dropper bottle.',
    details: ['15% vitamin C (THD form)', 'Hyaluronic acid + ferulic', 'Fragrance free', '30ml amber glass'] },
  { key: 'p_palette', id: 'b-radiance-palette', name: 'Radiance Cream Palette', sub: 'makeup',
    price: 36, oldPrice: 45, colors: [], sizes: OS, rating: 4.3, reviews: 97, pop: 71,
    desc: 'Four cream blush-and-bronze shades that melt into skin. Build from a whisper of color to a full flush.',
    details: ['4 buildable cream shades', 'Cream-to-powder finish', 'Refillable compact', 'Cruelty free'] },

  /* ---- SPORT (5) ---- */
  { key: 'p_leggings', id: 'sp-seamless-leggings', name: 'Seamless Sculpt Leggings', sub: 'leggings',
    price: 48, colors: [BLACK, OLIVE], sizes: ['XS', 'S', 'M', 'L'], rating: 4.7, reviews: 288, pop: 96, trending: true,
    desc: 'Sculpting seamless knit with a high supportive waistband. Squat-proof, sweat-wicking, second-skin feel.',
    details: ['Seamless 4-way stretch knit', 'High supportive waistband', 'Squat-proof coverage', 'Sweat-wicking finish'] },
  { key: 'p_trainingtee', id: 'sp-training-tee', name: 'Airflow Training Tee', sub: 'training',
    price: 32, colors: [BLACK, WHITE], sizes: CL, rating: 4.4, reviews: 112, pop: 75,
    desc: 'Feather-light performance tee with laser-cut vents where you heat up first.',
    details: ['Recycled performance fabric', 'Laser-cut ventilation', 'Anti-odor treatment', 'Regular athletic fit'] },
  { key: 'p_sportsbra', id: 'sp-support-bra', name: 'Medium Support Sports Bra', sub: 'bras',
    price: 38, oldPrice: 48, colors: [BLACK, RED], sizes: ['XS', 'S', 'M', 'L'], rating: 4.5, reviews: 143, pop: 79, isNew: true,
    desc: 'Medium support with removable pads and a band that stays put. From yoga flows to 5Ks.',
    details: ['Medium support level', 'Removable cups', 'Flatlock seams, no chafe', 'Bonded underband'] },
  { key: 'p_runjacket', id: 'sp-running-jacket', name: 'Featherlight Running Jacket', sub: 'outerwear',
    price: 95, colors: [BLACK, NAVY], sizes: CL, rating: 4.6, reviews: 85, pop: 77,
    desc: 'Packs into its own pocket, shrugs off rain and reflects every headlight. Your all-season training partner.',
    details: ['Water-repellent shell', 'Packs into chest pocket', '360° reflective trims', 'Zip secure back pocket'] },
  { key: 'p_joggers', id: 'sp-training-joggers', name: 'Tapered Training Joggers', sub: 'joggers',
    price: 55, colors: [GREY, BLACK], sizes: CL, rating: 4.5, reviews: 134, pop: 78,
    desc: 'Tapered joggers in brushed-back fleece with zipped ankle vents. Gym, street, sofa — approved.',
    details: ['Brushed-back cotton blend', 'Tapered leg', 'Zipped ankle vents', 'Elastic drawstring waist'] },
];

/* small color helpers used above (must be defined before use in JS hoisting terms) */
function BLUE2() { return { name: 'Mid Blue', hex: '#4a6a9d' }; }
function INDIGO() { return { name: 'Indigo', hex: '#2e3a59' }; }

/* ---------- 6. attach photos to products ---------- */

// fallback groups when a search group came back empty
const FALLBACK = {
  'p_dress': ['p_cami', 'p_skirt'], 'p_blazer': ['p_trousers', 'p_trench'],
  'p_knit': ['p_merino'], 'p_trousers': ['p_blazer'], 'p_trench': ['p_blazer'],
  'p_cami': ['p_dress'], 'p_jeans_w': ['p_trousers'], 'p_skirt': ['p_dress'],
  'p_tee_m': ['p_shirt_m'], 'p_shirt_m': ['p_tee_m'], 'p_hoodie': ['p_tee_m'],
  'p_bomber': ['p_hoodie'], 'p_jeans_m': ['p_tee_m'], 'p_merino': ['p_knit'],
  'p_heels': ['p_sandals'], 'p_sneakers_w': ['p_chunky'], 'p_chelsea': ['p_loafers'],
  'p_chunky': ['p_sneakers_w'], 'p_loafers': ['p_chelsea'], 'p_sandals': ['p_heels'],
  'p_tote': ['p_crossbody'], 'p_necklace': ['p_watch'], 'p_sunglasses': ['p_cap'],
  'p_watch': ['p_necklace'], 'p_scarf': ['p_cap'], 'p_cap': ['p_sunglasses'],
  'p_crossbody': ['p_tote'], 'p_lipstick': ['p_palette'], 'p_perfume': ['p_serum'],
  'p_serum': ['p_perfume'], 'p_palette': ['p_lipstick'],
  'p_leggings': ['p_sportsbra'], 'p_trainingtee': ['p_joggers'], 'p_sportsbra': ['p_leggings'],
  'p_runjacket': ['p_trainingtee'], 'p_joggers': ['p_trainingtee']
};

const products = DEFS.map((d, idx) => {
  const photos = take(d.key, 3, FALLBACK[d.key] || []);
  return {
    id: d.id,
    name: d.name,
    brand: 'ÉLAN Studio',
    gender: d.id.startsWith('w-') ? 'women' : d.id.startsWith('m-') ? 'men' : 'unisex',
    category: d.key.startsWith('p_leggings') || ['p_trainingtee', 'p_sportsbra', 'p_runjacket', 'p_joggers'].includes(d.key)
      ? 'sport'
      : d.id.startsWith('b-') ? 'beauty'
      : d.id.startsWith('s-') ? 'shoes'
      : d.id.startsWith('a-') ? 'accessories'
      : d.id.startsWith('sp-') ? 'sport'
      : 'clothing',
    sub: d.sub,
    price: d.price,
    ...(d.oldPrice ? { oldPrice: d.oldPrice } : {}),
    images: photos.length ? photos : [IMG.hero1],
    colors: d.colors || [],
    sizes: d.sizes,
    rating: d.rating,
    reviews: d.reviews,
    popularity: d.pop,
    isNew: !!d.isNew,
    isTrending: !!d.trending,
    tags: [d.name, d.sub, d.id.startsWith('w-') ? 'women' : d.id.startsWith('m-') ? 'men' : 'unisex',
      ...(d.name.toLowerCase().split(/\s+/))].slice(0, 14),
    desc: d.desc,
    details: d.details
  };
});

/* sanity: category check for sport products defined with sp- ids */
products.forEach(p => { if (p.id.startsWith('sp-')) p.category = 'sport'; });

/* ---------- 7. write the two files ---------- */

const header = `/* ============================================================
   ÉLAN — automatic data file.
   Made by scripts/build_catalog.mjs — do not edit by hand.
   ============================================================ */\n`;

const imagesJs = header + `// Big pictures used for banners and menus
window.ELAN = window.ELAN || {};
window.ELAN.IMG = ${JSON.stringify(IMG, null, 2)};
`;

const productsJs = header + `// All products in the shop
window.ELAN_PRODUCTS = ${JSON.stringify(products, null, 2)};
`;

writeFileSync(`${OUT_DIR}/images.js`, imagesJs);
writeFileSync(`${OUT_DIR}/products.js`, productsJs);

console.log(`\nWrote ${OUT_DIR}/images.js and ${OUT_DIR}/products.js`);
console.log(`Products: ${products.length}`);
const noImgs = products.filter(p => p.images.length < 2);
console.log(`Products with fewer than 2 photos: ${noImgs.length ? noImgs.map(p => p.id).join(', ') : 'none'}`);
console.log(`New: ${products.filter(p => p.isNew).length}, Trending: ${products.filter(p => p.isTrending).length}, On sale: ${products.filter(p => p.oldPrice).length}`);
const byCat = {};
products.forEach(p => { byCat[p.category] = (byCat[p.category] || 0) + 1; });
console.log('Per category:', JSON.stringify(byCat));
