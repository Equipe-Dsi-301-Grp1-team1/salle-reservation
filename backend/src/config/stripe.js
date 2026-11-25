const Stripe = require('stripe');

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function isDemoMode() {
  return process.env.PAYMENT_MODE === 'demo' || !process.env.STRIPE_SECRET_KEY;
}

module.exports = { getStripe, isDemoMode };
