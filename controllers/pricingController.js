import Package from '../models/Package.js';

export async function getPricing(req, res) {
  const packages = await Package.fetchAll();
  res.render('pricing', { packages, stripePublishable: process.env.STRIPE_PUBLISHABLE_KEY, YOUR_DOMAIN: process.env.YOUR_DOMAIN, title: "Pricing", description: "Choose a plan that suits your needs. All plans include a 14-day free trial." });
}