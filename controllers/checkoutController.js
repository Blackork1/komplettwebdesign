import Package from '../models/Package.js';
import Order from '../models/Order.js';

export async function postCreateCheckoutSession(req, res) {
  const { packageId, mode } = req.body;
  const stripe = req.app.get('stripe');
  const pkg = await Package.findById(packageId);
  //   const priceId = mode === 'once' ? pkg.stripe_price_id_once : pkg.stripe_price_id_recurring;
  //   const stripe = req.app.get('stripe');

  //   const session = await stripe.checkout.sessions.create({
  //     payment_method_types: ['card'],
  //     line_items: [{ price: priceId, quantity: 1 }],
  //     mode,
  //     success_url: `${process.env.YOUR_DOMAIN}/success`,
  //     cancel_url: `${process.env.YOUR_DOMAIN}/cancel`
  //   });

  const stripeMode = mode === 'once' ? 'payment' : 'subscription';
  const priceId = stripeMode === 'payment'
    ? pkg.stripe_price_id_once
    : pkg.stripe_price_id_recurring;
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: stripeMode,
    success_url: `${process.env.YOUR_DOMAIN}/success`,
    cancel_url: `${process.env.YOUR_DOMAIN}/cancel`
  });

  await Order.create(packageId, session.id, mode);
  return res.redirect(303, session.url);
}