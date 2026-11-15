// Stripe webhook as its own function so the request body stays untouched (raw),
// which Stripe's signature check requires.
const { stripe, fulfil, ensureDb, env } = require("../../server");

const readRaw = async req => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    return Buffer.concat(chunks);
};

module.exports = async (req, res) => {
    if (req.method !== "POST") { res.statusCode = 405; return res.end(); }

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            await readRaw(req), req.headers["stripe-signature"], env.STRIPE_WEBHOOK_SECRET
        );
    } catch {
        res.statusCode = 400;
        return res.end("Invalid signature");
    }

    try {
        if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
            await ensureDb();
            await fulfil(event.data.object);
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end('{"received":true}');
    } catch (error) {
        console.error("Webhook error:", error);
        res.statusCode = 500; // Stripe will retry
        res.end();
    }
};

module.exports.config = { api: { bodyParser: false } };
