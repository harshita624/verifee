# Verifee: know the fair price before you pay

Verifee protects travelers in India from tourist pricing. This version adds **PayPal checkout**, **UPI QR payments** and an **AI Pay Guard** that checks a price *before* money moves.

Built for the *Build What's Next with PayPal and AI* hackathon.

## What PayPal and AI do here

| Feature | PayPal | AI |
|---|---|---|
| **Fair Pay** (`/pay`) | Buyer pays with PayPal / card. The server creates and captures the order (Orders v2) and verifies the captured amount. | **AI Pay Guard** compares the vendor's quote with verified community prices or an AI estimate, writes a counter-offer script, and returns a signed token. **PayPal order creation is refused without that token**, and the token is bound to the exact amount. |
| **Data flywheel** | A captured Fair Pay payment automatically becomes a *verified* community price report (+80 XP). | Verified reports feed the RAG + anomaly-detection pipeline that powers every other AI answer. |
| **Verifee Pro** (`/pricing`) | Monthly / yearly plan via PayPal. A webhook reconciles completed and refunded payments. | Free users get 3 premium AI actions per day; Pro is unlimited. |
| **UPI QR (India)** | n/a | Scan the vendor's UPI QR → AI check → pay by UPI. Pro can also be bought by UPI QR. |

## Architecture

```
client/  Next.js (App Router) + Tailwind        → deploy on Vercel
server/  Express + MongoDB (Mongoose)            → deploy on Render
         ├─ services/paypalService.js   PayPal REST v2 (OAuth, create/capture, webhook verify)
         ├─ controllers/paymentController.js   Pay Guard, PayPal, UPI, history, admin review
         ├─ middleware/planGate.js      free-tier quota for premium AI routes
         ├─ services/{aiService,mlService,ragService,nlpService}.js   AI + ML pipeline
```

## 1. Prerequisites

- Node.js **18 or newer** (the server uses the built-in `fetch`)
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
| `PAYPAL_WEBHOOK_ID` (optional) | Dashboard → your sandbox app → **Webhooks → Add Webhook**. URL: `https://<your-api>/api/v1/payments/paypal/webhook`. Events: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.REVERSED`. Copy the **Webhook ID**. Needs a public URL (deploy first, or use a tunnel). |
| `UPI_MERCHANT_VPA` | Your own UPI ID (for example `name@okhdfcbank`), shown in the QR when someone buys Pro by UPI. |
| `RESEND_API_KEY` (optional) | <https://resend.com/api-keys>. Without it, password-reset links are printed in the server console in development. |

## 3. Install and run

```bash
# 1. Server
cd server
npm install
cp .env.example .env        # then fill in the values from the table above
npm run dev                 # or: node server.js        → http://localhost:5000

# 2. Client (new terminal)
cd client
npm install
npm install qrcode jsqr     # NEW dependencies for QR display + scanning
cp .env.local.example .env.local
npm run dev                 # → http://localhost:3000
```

Check the API: open <http://localhost:5000/health>. It should show `"paypal": true` and `"upi": true`.

## 4. Test the payments (sandbox)

1. Sign up on the site, then open **/pricing** → **PayPal / Card** → pay with your **sandbox Personal** account. Pro activates and a **PRO** badge appears in the navbar.
2. Open **/pay**, enter a product, city and price, and press **Check with AI Pay Guard**. Then pay by PayPal. A verified community price report is created and you earn +80 XP.
3. **UPI QR:** on **/pay**, enter any valid UPI ID (for example `test@okaxis`) to generate a payment QR, and scan it with a UPI app on your phone. On **/pricing → UPI QR** the Pro purchase is *pending* until an admin approves it:
   - Make yourself admin: in MongoDB set your user's `role` to `"admin"`.
   - `GET /api/v1/payments/admin/upi/pending` and `PATCH /api/v1/payments/admin/upi/:id` with `{"action":"approve"}` (send your `Authorization: Bearer <token>`).

## 5. Deploy

- **Server (Render):** set every variable from `server/.env.example` in the Render dashboard. Set `FRONTEND_URL` to your Vercel URL and `NODE_ENV=production`.
- **Client (Vercel):** set `NEXT_PUBLIC_API_URL` to your Render URL.
- For real money: create a **Live** PayPal app, set `PAYPAL_ENV=live` with the live credentials (PayPal must approve your business account first).

## 6. API (payments)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/payments/config` | none | Plans, PayPal client ID, UPI availability |
| POST | `/api/v1/payments/guard` | optional | AI Pay Guard verdict + signed token (quota-limited for free users) |
| POST | `/api/v1/payments/paypal/create-order` | user | Create PayPal order (`pro_plan` or `fair_pay`) |
| POST | `/api/v1/payments/paypal/capture-order` | user | Capture + verify amount + fulfil |
| POST | `/api/v1/payments/paypal/webhook` | PayPal | Signature-verified reconciliation |
| POST | `/api/v1/payments/upi/create` | user | UPI deep link / QR for a Pro plan |
| POST | `/api/v1/payments/upi/submit` | user | Submit 12-digit UTR (pending review) |
| GET | `/api/v1/payments/mine` | user | Payment history |
| GET/PATCH | `/api/v1/payments/admin/upi/...` | admin | Review UPI payments |

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
| `refund.id`, `refund.at` | Set by the refund webhook |
| `events[]` | Audit log of webhook events, deduplicated by event id |

Webhook events handled: `PAYMENT.CAPTURE.COMPLETED`, `.PENDING`, `.DENIED`, `.REFUNDED`, `.REVERSED`. Subscribe your PayPal webhook to all five. Webhooks need a public URL, so they only fire against a deployed API (or a tunnel such as ngrok). The PayPal dashboard's webhook simulator sends fake order IDs that match nothing in your database, so test with a real sandbox payment instead.

Admin insights: `GET /api/v1/payments/admin/insights` returns payments by status, captured totals per purpose, cancellation reasons, checkouts abandoned without any reason, and PayPal conversion.

Only an explicit cancel can record a reason. A buyer who simply closes the tab never reaches the server, so those checkouts show up as `abandonedNoReason` in the insights instead.

## 7. Honest limitations

- **Fair Pay with PayPal** charges the buyer on the platform's merchant account. Paying the *vendor* out of that balance (PayPal Payouts or Multiparty/Commerce Platform onboarding) is not built; it requires vendor onboarding and approval from PayPal.
- **UPI** has no server callback without a payment aggregator, so Pro-by-UPI is manually confirmed. Fair Pay by UPI goes straight from the buyer to the vendor and Verifee never touches it.
- PayPal charges in **USD** by default (₹ amounts are converted with `INR_PER_USD`).
- The camera scanner needs HTTPS (or `localhost`); a screenshot upload fallback is included.
- The Receipt Verifier needs `AI_PROVIDER=openai` (vision); otherwise it returns an empty result.

## License

MIT. See [LICENSE](LICENSE).
