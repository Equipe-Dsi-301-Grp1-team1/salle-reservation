'use strict';
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const env = require('../config/env');
const logger = require('../utils/logger');
const { getWebhookVerifier } = require('../config/stripe');
const payments = require('../services/payment.service');

exports.simulate = asyncHandler(async (req, res) => res.json(await payments.simulatePayment(req.params.sessionId, req.user.id)));
exports.listMine = asyncHandler(async (req, res) => res.json({ items: await payments.listForClient(req.user.id) }));

exports.webhook = asyncHandler(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = getWebhookVerifier().webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.warn(`Webhook Stripe refusé : ${err.message}`);
    throw new AppError(400, 'INVALID_SIGNATURE', 'Signature Stripe invalide.');
  }
  await payments.handleWebhookEvent(event);
  res.status(200).json({ received: true });
});
