'use strict';
const Stripe = require('stripe');
const env = require('./env');

let client = null;

function getStripe() {
  if (!client) {
    if (!env.STRIPE_SECRET_KEY) {
      const AppError = require('../utils/AppError');
      throw new AppError(503, 'PAYMENT_ERROR', "Le paiement n'est pas configuré (STRIPE_SECRET_KEY manquante).");
    }
    client = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return client;
}

function setStripe(custom) {
  client = custom;
}

function getWebhookVerifier() {
  return client || new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
}

module.exports = { getStripe, setStripe, getWebhookVerifier };
