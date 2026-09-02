// Cloudflare Pages Function: POST /api/checkout
// Creates a Stripe Checkout session. Prices come from products.json on the
// server side, never from the browser, so nobody can edit the price in DevTools.

const FREE_DELIVERY_OVER = 150; // GBP
const DELIVERY = 6.95;          // GBP

export async function onRequestPost({ request, env }) {
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  if (!env.STRIPE_SECRET_KEY) {
    return json({ error: 'STRIPE_SECRET_KEY is not set in the Cloudflare Pages environment variables' }, 500);
  }

  let items;
  try {
    ({ items } = await request.json());
    if (!Array.isArray(items) || !items.length) throw new Error();
  } catch {
    return json({ error: 'Cart is empty or malformed' }, 400);
  }

  // Load the catalogue from the deployed site itself so prices are trusted.
  const origin = new URL(request.url).origin;
  const catalogue = await fetch(`${origin}/products.json`).then(r => r.json());
  const byId = Object.fromEntries(catalogue.products.map(p => [p.id, p]));

  const lines = [];
  let subtotal = 0;
  for (const { id, qty } of items) {
    const p = byId[id];
    const q = Math.max(1, Math.min(Number(qty) || 1, p ? p.stock : 0));
    if (!p || q < 1) return json({ error: `Unknown or out-of-stock item: ${id}` }, 400);
    subtotal += p.price * q;
    lines.push({ name: `${p.brand} ${p.name}`, sku: p.sku, unit: Math.round(p.price * 100), qty: q, image: `${origin}/${p.image}` });
  }
  if (subtotal < FREE_DELIVERY_OVER) {
    lines.push({ name: 'UK delivery', sku: 'DELIVERY', unit: Math.round(DELIVERY * 100), qty: 1 });
  }

  // Stripe's API takes form-encoded bodies, so build the params by hand (no SDK needed).
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', `${origin}/#/thanks`);
  params.set('cancel_url', `${origin}/#/`);
  params.set('shipping_address_collection[allowed_countries][0]', 'GB');
  lines.forEach((l, i) => {
    params.set(`line_items[${i}][quantity]`, String(l.qty));
    params.set(`line_items[${i}][price_data][currency]`, 'gbp');
    params.set(`line_items[${i}][price_data][unit_amount]`, String(l.unit));
    params.set(`line_items[${i}][price_data][product_data][name]`, l.name);
    params.set(`line_items[${i}][price_data][product_data][metadata][sku]`, l.sku);
    // Stripe only accepts raster images (png/jpg). Swap the placeholder SVGs for real photos and this line lights up.
    if (l.image && !l.image.endsWith('.svg')) params.set(`line_items[${i}][price_data][product_data][images][0]`, l.image);
  });

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });
  const session = await res.json();
  if (!res.ok) return json({ error: session.error?.message || 'Stripe rejected the request' }, 502);
  return json({ url: session.url });
}
