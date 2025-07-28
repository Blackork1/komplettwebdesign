import Order from '../models/Order.js';

export async function postWebhook(req, res) {
  const stripe = req.app.get('stripe');
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    await Order.markPaid(event.data.object.id);
  }
  if (event.type === 'invoice.payment_succeeded') {
    await Order.markActive(event.data.object.subscription);
  }

  res.json({ received: true });
}