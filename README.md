# Sidex – demo performance parts store

A working online shop with no monthly fee. Static site on Cloudflare Pages (free), catalogue in one JSON file, payments through Stripe Checkout (test mode, so no money moves).

## What's in the folder

| File | What it does |
|---|---|
| `index.html` | The whole storefront: home, shop-by-car, categories, search, product pages, cart |
| `products.json` | The catalogue. Edit this to change what the shop sells |
| `images/` | Product images. Currently placeholders; drop your mock images in here |
| `functions/api/checkout.js` | Runs on Cloudflare, turns the cart into a Stripe Checkout session |

## Run it locally (2 minutes)

The site needs to be served over HTTP (not opened as a file) so it can load `products.json`.

```
cd sidex
python3 -m http.server 8000
```
Open http://localhost:8000. Everything works except the checkout button, which needs the Cloudflare function.

To run with checkout locally: `npm i -g wrangler`, then `wrangler pages dev . --binding STRIPE_SECRET_KEY=sk_test_...`

## Put it online (10 minutes, free)

1. Create a free account at https://dash.cloudflare.com
2. Push this folder to a GitHub repo (or use Cloudflare's direct upload)
3. Cloudflare dashboard → Workers & Pages → Create → Pages → connect the repo. Build command: none. Output directory: `/`
4. In the project's Settings → Environment variables, add `STRIPE_SECRET_KEY` = your Stripe **test** secret key (starts `sk_test_`), from https://dashboard.stripe.com/test/apikeys
5. Redeploy. You'll get a `something.pages.dev` URL. Add a custom domain later if you want one.

Cloudflare picks up the `functions/` folder automatically and serves `checkout.js` at `/api/checkout`.

## Test a purchase

Add parts to the cart → Go to checkout → Stripe's page opens. Use:

- Card number `4242 4242 4242 4242`
- Any future expiry, any CVC, any postcode

Then look at https://dashboard.stripe.com/test/payments to see the order land. Nothing is charged in test mode.

## Change the products

Open `products.json`. Each product looks like this:

```json
{
  "id": "sdx-cl-001",          // unique, used in URLs and the cart
  "sku": "SDX-CL-350Z",
  "name": "Sidex Street coilover kit",
  "brand": "Sidex",
  "category": "suspension",    // must match a slug in "categories"
  "price": 749,                // GBP, no symbol
  "stock": 6,
  "image": "images/coilover.svg",
  "fitment": [{ "make": "Nissan", "model": "350Z" }],   // make/model must match "cars"
  "short": "one-line summary shown on the card",
  "description": "paragraph for the product page",
  "specs": { "Spring rates": "8k/6k", "Warranty": "2 years" }
}
```

Save, redeploy (or just refresh if running locally). Add a car under `cars` and it appears in the shop-by-car selector immediately.

Image tip: Stripe's checkout page only shows PNG or JPG product images, so once you swap the SVG placeholders for real mock images, the pictures will show up on the payment page too.

## What this costs to run for real

- Domain: about £10/year
- Cloudflare Pages: free
- Stripe: 1.5% + 20p per UK card payment, nothing monthly
- Total fixed cost: ~£1/month

## Talking points for the session

Things this demo shows an AI can do:
- Build a complete, mobile-friendly shop from a one-line brief
- Design a data model (the JSON) that a non-developer can edit
- Handle the security-sensitive part properly: prices are re-read on the server, so a customer can't change them in the browser

Things it deliberately doesn't do, and why:
- It doesn't copy a real shop's photos or product listings. Those belong to the shop that made them, and "the AI did it" isn't a defence
- It uses a made-up brand. Cloning a real brand's name or look is trademark infringement even if you never sell anything
- It uses Stripe's test mode. Taking real payments means real obligations: consumer rights, refunds, VAT, data protection
- It has no login or customer accounts. Storing people's data is a responsibility, not a feature, so leave it out until you need it
