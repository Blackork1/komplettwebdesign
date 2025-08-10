// controllers/shopController.js
import { getAllPackages, getPackageById } from '../models/packageModel.js';
import { createOrder, updateOrderStatusBySession } from '../models/orderModel.js';
import { resolveBaseUrl } from '../util/resolveBaseUrl.js';


export async function listPackages(req, res) {
    const db = req.app.get('db');
    const packages = await getAllPackages(db);
    res.render('shop/list', { packages });
}

export async function createCheckoutSession(req, res) {
    const db = req.app.get('db');
    const stripe = req.app.get('stripe');
    const baseUrl = resolveBaseUrl(req);

    if (!/^https?:\/\//i.test(baseUrl)) {
        return res.status(500).send('BASE_URL fehlt oder ist ungültig (muss mit http/https beginnen).');
    }

    const { id } = req.params;
    const billing = (req.query.billing || 'once').toLowerCase(); // 'once' | 'recurring'
    const pack = await getPackageById(db, id);
    if (!pack) return res.status(404).send('Paket nicht gefunden');

    const isRecurring = billing === 'recurring';

    let lineItem;

    if (isRecurring) {
        // Abo benötigt eine Recurring-Price-ID aus Stripe
        if (!pack.stripe_price_id_recurring) {
            return res.status(400).send('Für dieses Paket ist keine Recurring-Price-ID hinterlegt.');
        }
        lineItem = { price: pack.stripe_price_id_recurring, quantity: 1 };
    } else {
        // Einmalzahlung: bevorzugt Stripe-Price-ID; sonst Betrag aus der DB
        if (pack.stripe_price_id_once) {
            lineItem = { price: pack.stripe_price_id_once, quantity: 1 };
        } else {
            const amount = parseInt(pack.amount_cents, 10); // <-- kommt aus dem Model-ALIAS
            if (!Number.isInteger(amount) || amount <= 0) {
                console.error('Invalid amount for package', { id: pack.id, amount_cents: pack.amount_cents });
                return res.status(400).send('Preis (price_amount_cents) fehlt oder ist ungültig.');
            }
            const currency = (pack.currency || process.env.CURRENCY || 'eur').toLowerCase();
            lineItem = {
                price_data: {
                    currency,
                    product_data: { name: pack.name, description: pack.description || undefined },
                    unit_amount: amount, // <-- HIER wird unit_amount gesetzt (Integer in Cent!)
                },
                quantity: 1,
            };
        }
    }

    const session = await stripe.checkout.sessions.create({
        mode: isRecurring ? 'subscription' : 'payment',
        line_items: [lineItem],
        success_url: `${baseUrl}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/shop/cancel`,
        customer_creation: 'always',
        phone_number_collection: { enabled: true, },
        billing_address_collection: 'required',
        automatic_tax: { enabled: true },
        metadata: { package_id: String(pack.id), billing }
    });

    await createOrder(db, {
        stripe_session_id: session.id,
        package_id: pack.id,
        amount_total: null,
        currency: pack.currency,
        user_email: null,
        status: session.status || 'created',
        payment_intent: null,
        mode: session.mode || (isRecurring ? 'subscription' : 'payment')
    });

    return res.redirect(303, session.url);
}

export async function successPage(req, res) {
    const stripe = req.app.get('stripe');
    const db = req.app.get('db');
    const { session_id } = req.query;
    if (!session_id) return res.redirect('/shop');

    const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ['payment_intent'] });
    // Status ggf. synchronisieren (falls Webhook später kommt)
    await updateOrderStatusBySession(db, session.id, session.payment_status, {
        payment_intent: session.payment_intent?.id,
        amount_total: session.amount_total,
        currency: session.currency,
        user_email: session.customer_details?.email,
        mode: session.mode
    });

    res.render('shop/success', { session });
}

export function cancelPage(req, res) {
    res.render('shop/cancel');
}

/**
 * Stripe Webhook: unbedingt raw body verwenden!
 */
export async function webhook(req, res) {
    const stripe = req.app.get('stripe');
    const db = req.app.get('db');
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        case 'checkout.session.completed': {
            const s = event.data.object;
            await updateOrderStatusBySession(db, s.id, 'paid', {
                payment_intent: s.payment_intent,
                amount_total: s.amount_total,
                currency: s.currency,
                user_email: s.customer_details?.email,
                mode: s.mode
            });
            break;
        }
        case 'checkout.session.expired': {
            const session = event.data.object;
            await updateOrderStatusBySession(db, session.id, 'expired');
            break;
        }
        case 'charge.refunded': {
            const charge = event.data.object;
            // Optional: hier könntest du per charge.payment_intent → session finden und Status "refunded" setzen
            break;
        }
        default:
            // andere Events bei Bedarf behandeln
            break;
    }

    res.json({ received: true });
}
