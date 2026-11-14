# Notepad with Free / Premium (MongoDB Atlas + Stripe + GitHub Pages)

```
/                 <- frontend (GitHub Pages)  index.html, notepad.html, config.js, plan.js ...
/server           <- API (Render / Railway)   server.js, package.json
```

GitHub Pages can only host static files, so the API (accounts, plan, Stripe) runs separately.
The MongoDB connection string and Stripe secret key live ONLY on the API host, never in the frontend.

## 1. MongoDB Atlas
1. Create a free cluster, then Database Access > add a user with a password.
2. Network Access > allow `0.0.0.0/0` (Render has no fixed IP).
3. Connect > Drivers > copy the connection string into `MONGODB_URI`.
Collections (`users`, `payments`) and indexes are created automatically.

## 2. Stripe
1. Dashboard > Developers > API keys: copy the **secret key** into `STRIPE_SECRET_KEY` (use test mode first).
2. Settings > Payment methods: enable the methods you want. Checkout shows whatever is enabled.
   GCash is a Stripe payment method but may need to be enabled for your account first. Without it, only cards show.
3. After deploying the API (step 3), Developers > Webhooks > Add endpoint:
   - URL: `https://YOUR-API.onrender.com/api/billing/webhook`
   - Events: `checkout.session.completed` and `checkout.session.async_payment_succeeded`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

## 3. Deploy the API (Render example)
1. Push this repo to GitHub. On Render: New > Web Service > pick the repo.
2. Root Directory: `server`. Build: `npm install`. Start: `npm start`.
3. Add the environment variables from `server/.env.example`.
   `FRONTEND_ORIGIN` must be your Pages origin, e.g. `https://yourname.github.io` (no path).
4. Open `https://YOUR-API.onrender.com/api/health`. It should return `{"ok":true}`.

## 4. Frontend on GitHub Pages
1. Edit `config.js`: set `window.NOTEPAD_API` to your API URL.
2. Repo Settings > Pages > deploy from the branch root.
3. Open `https://yourname.github.io/REPO/` and create an account.

## How payment works
- Notepad Premium is PHP 100 per payment and adds 30 days (paying again before it ends adds to the remaining time).
- It does not auto-renew: GCash recurring payments are limited on Stripe, so each payment is one-time.
- The webhook is the source of truth; the page also confirms on return so Premium shows instantly. Both are idempotent.

## Local testing
```
cd server && cp .env.example .env   # fill it in
npm install && npm run dev
stripe listen --forward-to localhost:3000/api/billing/webhook   # Stripe CLI, prints the whsec_ secret
```
Serve the frontend with any static server and set `FRONTEND_ORIGIN=http://localhost:5500` (match your port), `NOTEPAD_API=http://localhost:3000`.
Test card: 4242 4242 4242 4242.

## Good to know
- Premium gating on the frontend hides features in the browser. Because notes are stored in localStorage, a technical user could bypass it. Real enforcement needs notes stored on the server.
- Credentials edited in Settings change only this browser; the account profile on the server is set at sign-up.
- Free Render services sleep when idle, so the first request after a pause can take about 30 seconds.
