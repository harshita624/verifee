# Verifee: know the fair price before you pay

Verifee protects travelers in India from tourist pricing. Verifee combines price transparency, receipt OCR, community trust reports, merchant PayPal checkout, and travel planning in one application. It includes **PayPal Fair Pay** and an **AI Pay Guard** that checks the price before checkout.

Built for the *Build What's Next with PayPal and AI* hackathon.

## What PayPal and AI do here

| Feature | PayPal | AI |
|---|---|---|
| **Fair Pay** (`/pay`) | Creates and captures a PayPal Orders v2 payment; when an enrolled, verified seller is selected and marketplace credentials are enabled, routes the order to that seller. Captures are verified against PayPal and receipted. | **AI Pay Guard** compares the quote with admin-approved community reports or an AI estimate, supports quality tiers, and returns a signed token bound to the amount. |
| **Receipt Verifier** (`/receipt-verify`) | n/a | A vision-capable model extracts visible receipt fields and compares readable item prices with the shared local price engine. |
| **Data quality** | Buyer payment records and receipts retain PayPal capture ID, time, recipient, and price reference. | A payment to Verifee is not proof of a sale by the named vendor, so it is not marked as a verified market-price report. |
| **Verifee Pro** (`/pricing`) | Monthly / yearly plan via PayPal. A webhook reconciles completed and refunded payments. | Free users get 3 premium AI actions per day; Pro is unlimited. |
| **Merchant portal** (`/merchant`) | Merchant onboarding, routed sales, full-refund requests, and CSV export for connected sellers. | Shop claims require review; merchant-specific payment data is private to the merchant. |
| **Travel toolkit** (`/travel`) | PayPal is available for Fair Pay where configured. | Route/distance and indicative fares, nearby discovery, saved trip budgets/expenses, currency conversion, and fair-price alerts. |
| **UPI QR (India)** | n/a | Scan a vendor QR → compare price → create a direct-to-vendor UPI QR. Pro can also be bought by UPI QR. |

## Architecture

```
root/    Next.js (App Router) + Tailwind        → deploy on Vercel
server/  Express + MongoDB (Mongoose)            → deploy on Render
         ├─ services/paypalService.js   PayPal REST v2 (OAuth, create/capture/refund, seller onboarding, webhook verify)
         ├─ routes/merchants.js         Merchant claims, seller onboarding, payment directory/dashboard
         ├─ routes/travel.js            Route lookup, nearby places, currency rates, trip budgets/alerts
         ├─ controllers/paymentController.js   Pay Guard, PayPal, UPI, receipts, history, admin review
         ├─ middleware/planGate.js      MongoDB-backed free-tier quota for premium AI routes
         ├─ services/mongoRateLimitStore.js     shared API rate limits across server instances
         ├─ services/{aiService,mlService,ragService,nlpService}.js   AI + ML pipeline
```

## 1. Prerequisites

- Node.js **22.15 or newer** (use a maintained LTS release; Next.js 16 requires Node.js 20.9 or newer)
- A MongoDB database (free MongoDB Atlas cluster is fine)
- A PayPal developer account (free)
- An AI key (Groq free tier is the default)

## 2. Get your keys

| Variable | Where to get it |
|---|---|
| `MONGO_URI` | <https://cloud.mongodb.com> → create a free cluster → **Connect → Drivers** → copy the string, put your DB user/password in it. In Atlas **Network Access**, allow your IP (or `0.0.0.0/0` for a hosted API). |
| `JWT_SECRET` | Run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` and paste the output. |
| `GROQ_API_KEY` | <https://console.groq.com/keys> |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | <https://developer.paypal.com/dashboard> → sign in → **Apps & Credentials** → switch to **Sandbox** → **Create App** (type *Merchant*) → copy **Client ID** and **Secret**. |
| PayPal test buyer | Same dashboard → **Testing Tools → Sandbox Accounts**. Use a **Personal** sandbox account's email/password to pay at checkout. |
| `PAYPAL_WEBHOOK_ID` (optional) | Dashboard → your sandbox app → **Webhooks → Add Webhook**. URL: `https://<your-api>/api/v1/payments/paypal/webhook`. Subscribe to completed, pending, denied, refunded, and reversed captures. Copy the **Webhook ID**. Needs a public URL. |
| `PAYPAL_PARTNER_ID` / `PAYPAL_PARTNER_ATTRIBUTION_ID` (optional) | PayPal partner onboarding and marketplace routing. These work only for a PayPal-approved platform/partner integration; ordinary developer app credentials are not sufficient. |
| `UPI_MERCHANT_VPA` | Your own UPI ID (for example `name@okhdfcbank`), shown in the QR when someone buys Pro by UPI. |
| `RESEND_API_KEY` (optional) | <https://resend.com/api-keys>. Without it, password-reset links are printed in the server console in development. |

## 3. Install and run

```bash
# 1. Server
cd server
npm ci
cp .env.example .env        # then fill in the values from the table above
npm run dev                 # or: node index.js         → http://localhost:5000

# 2. Next.js frontend (new terminal, from the repository root)
npm ci
cp .env.local.example .env.local
npm run dev                 # → http://localhost:3000
```

Check the API: open <http://localhost:5000/health>. It should show `"paypal": true` and `"upi": true`.

## 4. Test the payments (sandbox)

1. Sign up on the site, then open **/pricing** → **PayPal / Card** → pay with your **sandbox Personal** account. Pro activates and a **PRO** badge appears in the navbar.
2. Open **/pay**, enter a product, city and price, and press **Check with AI Pay Guard**. Complete the PayPal sandbox checkout. Verifee records the platform payment and issues a receipt; this is not proof of a sale by the named shop.
3. **UPI QR:** on **/pay**, enter any valid UPI ID (for example `test@okaxis`) to generate a payment QR, and scan it with a UPI app on your phone. On **/pricing → UPI QR** the Pro purchase is *pending* until an admin approves it:
   - Make yourself admin: in MongoDB set your user's `role` to `"admin"`.
   - `GET /api/v1/payments/admin/upi/pending` and `PATCH /api/v1/payments/admin/upi/:id` with `{"action":"approve"}` (send your `Authorization: Bearer <token>`).

## 5. Deploy

- **Server (Render):** set every variable from `server/.env.example` in the Render dashboard. Set `FRONTEND_URL` to your Vercel URL and `NODE_ENV=production`.
- Set `JWT_SECRET` to a unique random secret of at least 32 bytes; the API refuses to start in production with a missing, short, or example secret.
- **Client (Vercel):** set `NEXT_PUBLIC_API_URL` to your Vercel site origin and `API_REWRITE_URL` to your Render API origin. This keeps browser API calls on the site origin so HttpOnly login cookies work without third-party cookies.
- Browser sign-in uses a `Secure` (in production), `HttpOnly`, `SameSite=Lax` session cookie. After deploying this change, users must sign in again. External API clients can continue to use the bearer-token response.
- Signing out, changing a password, or resetting a password invalidates previously issued sessions for that account, including sessions on other devices.
- For real money: create a **Live** PayPal app, set `PAYPAL_ENV=live` with the live credentials (PayPal must approve your business account first).

## 6. API (payments)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/payments/config` | none | Plans, PayPal client ID, UPI availability |
| POST | `/api/v1/payments/guard` | optional | AI Pay Guard verdict + signed token (quota-limited for free users) |
| POST | `/api/v1/payments/paypal/create-order` | user | Create PayPal order (`pro_plan` or `fair_pay`) |
| POST | `/api/v1/payments/paypal/capture-order` | user | Capture + verify amount + fulfil |
| POST | `/api/v1/payments/paypal/refund` | seller | Request a full PayPal refund for a captured payment routed to that seller |
| POST | `/api/v1/payments/paypal/webhook` | PayPal | Signature-verified reconciliation |
| POST | `/api/v1/payments/upi/create` | user | UPI deep link / QR for a Pro plan |
| POST | `/api/v1/payments/upi/submit` | user | Submit 12-digit UTR (pending review) |
| GET | `/api/v1/payments/mine` | user | Payment history |
| GET | `/api/v1/payments/receipt/:paymentId` | owner | Printable PayPal receipt for a captured payment |
| GET/PATCH | `/api/v1/payments/admin/upi/...` | admin | Review UPI payments |
| POST | `/api/v1/ai/verify-receipt` | optional | Vision extraction and local price comparison |
| GET/POST | `/api/v1/travel/route`, `/nearby`, `/currencies` | public | Route/fare context, OSM places, reference exchange rates |
| GET/POST/PATCH/DELETE | `/api/v1/travel/trips...` | user | Private trips, budgets, expenses, and price alerts |
| GET/POST | `/api/v1/merchants/me` | user | Merchant claim and private seller dashboard |
| POST | `/api/v1/merchants/paypal/onboard`, `/paypal/complete` | user | PayPal seller connection, requires approved partner setup |
| GET | `/api/v1/merchants/directory` | public | Verified sellers that can receive PayPal payments |
| GET | `/api/v1/prices/admin/pending` | admin | Review pending and legacy price reports |
| GET | `/api/v1/prices/admin/receipt-asset/:id` | admin | View an uploaded MongoDB receipt during review |
| PATCH | `/api/v1/prices/admin/:id/review` | admin | Approve or reject a price report; approval requires an uploaded receipt |

Price contributions start as **pending**. Plausible-looking prices are no longer automatically called verified: only an admin-reviewed report with receipt evidence contributes to community price statistics and risk checks. Older reports created by the previous automatic-screening behavior remain unapproved until reviewed. Set a user's MongoDB `role` to `"admin"` to access the moderation endpoints; send `Authorization: Bearer <token>`.

## 6a. Travel and merchant features

- `/travel` combines route distance/duration (Nominatim + OSRM), indicative local fare bands, OpenStreetMap nearby listings, and admin-reviewed Verifee merchant profiles. It also stores private trip budgets, expenses, currency conversions, and manually checked price alerts.
- `/merchant` lets a signed-in seller submit a shop profile for human review, start PayPal seller onboarding, inspect PayPal-routed captures/refunds, issue a full refund for a sale routed to that seller, and export a CSV.
- Community scam reports appear in `/scam-feed`; signed-in members can mark a report helpful once. Public shop discovery shows reviewed profiles only. Price data and complaint counts are signals, not guarantees of merchant conduct.
- Price checks, scam analysis, bargaining context, and price trends use one canonical category and quality tier. Community reports are matched by normalized product, city, category, and quality; category guidance and risk tolerances differ for textiles, handicrafts, jewellery, food, hotels, transport, electronics, souvenirs, produce, and tickets. The estimator uses the configured language model only when there is not enough matching community data; it does not browse live web listings or train on Verifee data. If the AI provider is unavailable but one or two matching reports exist, Verifee returns a wide low-confidence band and will not label the quote “Scam.”

## 6b. Payment records, purpose and cancellations

Every PayPal checkout creates a `Payment` record the moment the order is created, so even a cancelled or abandoned checkout leaves a trace.

| Field | Meaning |
|---|---|
| `paypalOrderId`, `paypalCaptureId` | PayPal's identifiers |
| `amount`, `currency`, `amountInr` | What was charged |
| `status` | `created` → `captured`, or `cancelled`, `failed`, `refunded` |
| `capturedAt`, `fulfilledAt` | PayPal's capture time, and when we applied it |
| `purpose` | Fair Pay: chosen by the buyer (transport, food, shopping, accommodation, other). Pro: always `premium` |
| `cancel.reason`, `cancel.note` | Why the buyer closed checkout (`skipped` if they did not answer) |
| `refund.id`, `refund.at`, `refund.status`, `refund.amount` | Set by a seller refund action or PayPal refund webhook |
| `events[]` | Audit log of webhook events, deduplicated by event id |

Webhook events handled: `PAYMENT.CAPTURE.COMPLETED`, `.PENDING`, `.DENIED`, `.REFUNDED`, `.REVERSED`. Subscribe your PayPal webhook to all five. Webhooks need a public URL, so they only fire against a deployed API (or a tunnel such as ngrok). The PayPal dashboard's webhook simulator sends fake order IDs that match nothing in your database, so test with a real sandbox payment instead.

Admin insights: `GET /api/v1/payments/admin/insights` returns payments by status, captured totals per purpose, cancellation reasons, checkouts abandoned without any reason, and PayPal conversion.

Only an explicit cancel can record a reason. A buyer who simply closes the tab never reaches the server, so those checkouts show up as `abandonedNoReason` in the insights instead.

## 7. Honest limitations

- **Marketplace PayPal routing** is implemented for approved, onboarded sellers, but it stays disabled until PayPal approves the platform and the server has partner credentials (`PAYPAL_PARTNER_ID`). Without those credentials, Fair Pay charges Verifee's platform account. Seller onboarding links, payouts, and merchant refunds cannot be demonstrated with a standard PayPal developer app alone.
- The receipt identifies the actual configured PayPal recipient. A free-text seller name is buyer-provided and does not prove that seller received funds. A Verifee payment receipt is not a merchant-issued tax invoice.
- **UPI** has no server callback without a payment aggregator, so Pro-by-UPI is manually confirmed. Fair Pay by UPI goes straight from the buyer to the vendor and Verifee never touches it.
- PayPal charges in **USD** by default (₹ amounts are converted with `INR_PER_USD`).
- A captured PayPal Fair Pay payment has a printable receipt at `/payment-receipt/<payment-id>` with the capture ID, timestamp, actual recipient, seller name/profile, and saved price reference. Receipts are private to the purchasing account.
- Receipt image extraction requires a vision-capable provider key/model on the server. With Groq, the default is `qwen/qwen3.8-27b` (override with `GROQ_VISION_MODEL`). OCR confidence is model-reported and must be reviewed; a price comparison is guidance, not proof of fraud.
- Route distances use OpenStreetMap geocoding and OSRM driving routes. Fare bands are transparent Verifee heuristics, and public-transport fares are not live transit quotes. Nearby POIs come from community-maintained OpenStreetMap and are not automatically verified; nearby search caches results and falls back from Overpass to bounded Nominatim search when Overpass is unavailable.
- Exchange rates are reference rates, not guaranteed card/bank rates. Travel price alerts are checked when the user opens the trip or manually refreshes; push/email notifications are not configured.
- The camera scanner needs HTTPS (or `localhost`); a screenshot upload fallback is included.
- Scam detection returns a heuristic price-risk indicator, not a calibrated fraud probability or a finding that a seller committed fraud.
- The Receipt Verifier uses the configured vision-capable provider (`groq`, `openai`, or `gemini`). If the provider/key/model is missing or the receipt is unreadable, it returns a clear error instead of an empty success.

## License

MIT. See [LICENSE](LICENSE).
