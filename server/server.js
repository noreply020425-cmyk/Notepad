"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { MongoClient, ObjectId } = require("mongodb");
const Stripe = require("stripe");

// ==========================================
// CONFIG
// ==========================================

const env = process.env;
const missing = ["MONGODB_URI", "JWT_SECRET", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "FRONTEND_ORIGIN"]
    .filter(key => !env[key]);

if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
}

const ORIGINS = env.FRONTEND_ORIGIN.split(",").map(s => s.trim().replace(/\/$/, "")).filter(Boolean);
const PRICE_CENTAVOS = 10000;   // PHP 100.00 (Stripe uses the smallest unit)
const PREMIUM_DAYS = 30;        // each payment adds 30 days
const DAY_MS = 86400000;

const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const client = new MongoClient(env.MONGODB_URI);
let db;
let dbReady = null;
const col = name => db.collection(name);

// Connects once and is reused by later requests (needed on serverless hosts like Vercel).
function ensureDb() {
    if (!dbReady) {
        dbReady = (async () => {
            await client.connect();
            db = client.db(env.MONGODB_DB || "notepad");
            await col("users").createIndex({ email: 1 }, { unique: true });
            await col("payments").createIndex({ userId: 1 });
        })().catch(error => { dbReady = null; throw error; });
    }
    return dbReady;
}

// ==========================================
// HELPERS
// ==========================================

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (value, max = 80) => String(value ?? "").trim().slice(0, max);
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const fail = (res, status, error) => res.status(status).json({ error });
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12); // equalizes login timing

const isPremium = user => Boolean(user.premiumUntil && new Date(user.premiumUntil) > new Date());

const publicUser = user => ({
    email: user.email,
    name: user.name,
    oracleId: user.oracleId,
    repId: user.repId,
    plan: isPremium(user) ? "premium" : "free",
    premiumUntil: user.premiumUntil || null
});

const signToken = user => jwt.sign({ sub: String(user._id) }, env.JWT_SECRET, { expiresIn: "30d" });

async function auth(req, res, next) {
    const match = /^Bearer (.+)$/.exec(req.headers.authorization || "");
    if (!match) return fail(res, 401, "Please sign in.");

    try {
        const payload = jwt.verify(match[1], env.JWT_SECRET);
        const user = await col("users").findOne({ _id: new ObjectId(payload.sub) });
        if (!user) return fail(res, 401, "Please sign in again.");
        req.user = user;
        next();
    } catch {
        fail(res, 401, "Your session expired. Please sign in again.");
    }
}

// Adds 30 days of Premium once per Stripe session. Safe to call many times
// (webhook retries, the browser's confirm call): the payment id is unique.
async function fulfil(session) {
    if (session.payment_status !== "paid") return false;

    const userId = session.metadata && session.metadata.userId;
    if (!userId || !ObjectId.isValid(userId)) return false;

    const dbSession = client.startSession();
    try {
        await dbSession.withTransaction(async () => {
            const now = new Date();

            await col("payments").insertOne({
                _id: session.id,
                userId: new ObjectId(userId),
                amount: session.amount_total,
                currency: session.currency,
                paidAt: now
            }, { session: dbSession });

            const result = await col("users").updateOne(
                { _id: new ObjectId(userId) },
                [{
                    $set: {
                        premiumUntil: {
                            $dateAdd: {
                                startDate: { $max: [{ $ifNull: ["$premiumUntil", now] }, now] },
                                unit: "day",
                                amount: PREMIUM_DAYS
                            }
                        }
                    }
                }],
                { session: dbSession }
            );

            if (result.matchedCount === 0) throw new Error("User not found for payment " + session.id);
        });
        return true;
    } catch (error) {
        if (error.code === 11000) return true; // already applied
        throw error;
    } finally {
        await dbSession.endSession();
    }
}

// ==========================================
// APP
// ==========================================

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(wrap(async (req, res, next) => { await ensureDb(); next(); }));
app.use(cors({
    origin: (origin, callback) => callback(null, !origin || ORIGINS.includes(origin)),
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Stripe needs the raw body to verify the signature, so this goes BEFORE express.json().
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], env.STRIPE_WEBHOOK_SECRET);
    } catch {
        return res.status(400).send("Invalid signature");
    }

    try {
        if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
            await fulfil(event.data.object);
        }
        res.json({ received: true });
    } catch (error) {
        console.error("Webhook error:", error);
        res.status(500).end(); // Stripe will retry
    }
});

app.use(express.json({ limit: "10kb" }));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
    message: { error: "Too many attempts. Try again in a few minutes." }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

// ---------- Accounts ----------

app.post("/api/auth/register", authLimiter, wrap(async (req, res) => {
    const email = clean(req.body.email, 254).toLowerCase();
    const password = String(req.body.password || "");
    const name = clean(req.body.name, 60);
    const oracleId = clean(req.body.oracleId, 40);
    const repId = clean(req.body.repId, 40);

    if (!EMAIL.test(email)) return fail(res, 400, "Enter a valid email address.");
    if (password.length < 8 || password.length > 72) return fail(res, 400, "Password must be 8 to 72 characters.");
    if (!name || !oracleId || !repId) return fail(res, 400, "Name, Oracle ID and Rep ID are required.");

    const user = {
        email, name, oracleId, repId,
        passwordHash: await bcrypt.hash(password, 12),
        premiumUntil: null,
        createdAt: new Date()
    };

    try {
        const result = await col("users").insertOne(user);
        user._id = result.insertedId;
    } catch (error) {
        if (error.code === 11000) return fail(res, 409, "An account with this email already exists.");
        throw error;
    }

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

app.post("/api/auth/login", authLimiter, wrap(async (req, res) => {
    const email = clean(req.body.email, 254).toLowerCase();
    const password = String(req.body.password || "");

    const user = await col("users").findOne({ email });
    const valid = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

    if (!user || !valid) return fail(res, 401, "Incorrect email or password.");
    res.json({ token: signToken(user), user: publicUser(user) });
}));

app.get("/api/me", auth, (req, res) => res.json({ user: publicUser(req.user) }));

// ---------- Billing ----------

app.post("/api/billing/checkout", auth, wrap(async (req, res) => {
    let base;
    try {
        const url = new URL(String(req.body.returnUrl || ""));
        if (!ORIGINS.includes(url.origin)) throw new Error("origin");
        base = url.origin + url.pathname;
    } catch {
        return fail(res, 400, "Invalid return address.");
    }

    // No payment_method_types: Stripe shows the methods enabled in your Dashboard
    // (cards, and GCash once Stripe enables it for your account).
    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
            quantity: 1,
            price_data: {
                currency: "php",
                unit_amount: PRICE_CENTAVOS,
                product_data: {
                    name: "Notepad Premium",
                    description: `${PREMIUM_DAYS} days of Premium access`
                }
            }
        }],
        customer_email: req.user.email,
        client_reference_id: String(req.user._id),
        metadata: { userId: String(req.user._id) },
        success_url: `${base}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}?checkout=cancel`
    });

    res.json({ url: session.url });
}));

// Called when the person returns from Stripe so Premium shows immediately,
// without waiting for the webhook. It is safe: the session is read from Stripe.
app.get("/api/billing/confirm", auth, wrap(async (req, res) => {
    const sessionId = clean(req.query.session_id, 200);
    if (!sessionId.startsWith("cs_")) return fail(res, 400, "Invalid session.");

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session.metadata || session.metadata.userId !== String(req.user._id)) {
        return fail(res, 403, "This payment belongs to another account.");
    }

    const paid = await fulfil(session);
    const user = await col("users").findOne({ _id: req.user._id });
    res.json({ status: paid ? "paid" : "pending", user: publicUser(user) });
}));

// ---------- Errors ----------

app.use((req, res) => fail(res, 404, "Not found."));
app.use((error, req, res, next) => {
    console.error(error);
    fail(res, 500, "Something went wrong. Please try again.");
});

// ==========================================
// START (local / Render) or EXPORT (Vercel)
// ==========================================

if (require.main === module) {
    ensureDb()
        .then(() => app.listen(env.PORT || 3000, () => console.log("Notepad API running")))
        .catch(error => { console.error("Failed to start:", error); process.exit(1); });
}

module.exports = { app, stripe, fulfil, ensureDb, env };
