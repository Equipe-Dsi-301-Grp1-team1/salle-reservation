'use strict';
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const AppError = require('../utils/AppError');
const env = require('../config/env');
const logger = require('../utils/logger');
const eventBus = require('../utils/eventBus');
const crypto = require('crypto');
const { getStripe } = require('../config/stripe');
const bookingService = require('./booking.service');
const { BOOKING_STATUS: S, PAYMENT_STATUS: P } = require('../utils/constants');

async function createCheckoutSession(bookingId, clientId) {
  const booking = await bookingService.getOwnedByClient(bookingId, clientId);
  if (booking.status !== S.VALIDATED) throw AppError.conflict('INVALID_TRANSITION', "Seule une réservation validée peut être payée.");
  if (!booking.expiresAt || booking.expiresAt <= new Date()) throw AppError.conflict('BOOKING_EXPIRED', 'Le délai de paiement est dépassé.');

  if (env.PAYMENT_MODE === 'simulated') {
    const sessionId = `sim_${crypto.randomBytes(12).toString('hex')}`;
    await Payment.create({ booking: booking._id, client: clientId, amountCents: booking.amountCents, status: P.PENDING, stripeSessionId: sessionId });
    return { url: `${env.CLIENT_URL}/paiement/simulation/${booking._id}?session=${sessionId}`, sessionId };
  }

  const params = {
    mode: 'payment',
    client_reference_id: booking._id.toString(),
    customer_email: booking.client.email,
    metadata: { bookingId: booking._id.toString() },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: booking.amountCents,
          product_data: { name: `${booking.room.name} — ${booking.date}`, description: `${booking.hours} h · ${booking.guests} invités` },
        },
      },
    ],
    success_url: `${env.CLIENT_URL}/paiement/succes?booking=${booking._id}`,
    cancel_url: `${env.CLIENT_URL}/paiement/echec?booking=${booking._id}`,
  };
  const secondsLeft = Math.floor((booking.expiresAt.getTime() - Date.now()) / 1000);
  if (secondsLeft > 31 * 60) params.expires_at = Math.floor(Date.now() / 1000) + Math.min(secondsLeft, 23 * 3600);

  let session;
  try {
    session = await getStripe().checkout.sessions.create(params);
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('Stripe : création de session impossible', err);
    throw new AppError(502, 'PAYMENT_ERROR', 'Le service de paiement est indisponible. Réessayez dans un instant.');
  }
  await Payment.create({
    booking: booking._id,
    client: clientId,
    amountCents: booking.amountCents,
    status: P.PENDING,
    stripeSessionId: session.id,
  });
  return { url: session.url, sessionId: session.id };
}


async function handleWebhookEvent(event) {
  const type = event.type;
  const session = event.data && event.data.object;
  if (!session) return { handled: false };

  if (type === 'checkout.session.completed' || type === 'checkout.session.async_payment_succeeded') {
    if (session.payment_status && session.payment_status !== 'paid') return { handled: false };
    const paidAt = new Date();
    let known = await Payment.exists({ stripeSessionId: session.id });
    if (!known && session.metadata && session.metadata.bookingId) {
      const booking = await Booking.findById(session.metadata.bookingId);
      if (booking) {
        await Payment.create({ booking: booking._id, client: booking.client, amountCents: booking.amountCents, stripeSessionId: session.id, status: P.PENDING });
        known = true;
      }
    }
    if (!known) return { handled: false };
    const payment = await Payment.findOneAndUpdate(
      { stripeSessionId: session.id, status: { $ne: P.SUCCEEDED } },
      { $set: { status: P.SUCCEEDED, stripeEventId: event.id, stripePaymentIntentId: session.payment_intent || undefined, paidAt } },
      { new: true },
    );
    if (!payment) return { handled: true, duplicate: true };
    const booking = await bookingService.markPaid(payment.booking, paidAt);
    if (booking) eventBus.emit(eventBus.EVENTS.BOOKING_PAID, { bookingId: payment.booking.toString() });
    else logger.error(`Paiement ${payment._id} reçu mais la réservation ${payment.booking} n'est plus payable : remboursement manuel à prévoir.`);
    return { handled: true, duplicate: false };
  }

  if (type === 'checkout.session.expired' || type === 'checkout.session.async_payment_failed') {
    await Payment.updateOne({ stripeSessionId: session.id, status: P.PENDING }, { $set: { status: P.FAILED } });
    return { handled: true };
  }
  return { handled: false };
}


async function simulatePayment(sessionId, clientId) {
  if (env.PAYMENT_MODE !== 'simulated') throw AppError.notFound();
  const payment = await Payment.findOne({ stripeSessionId: sessionId, client: clientId });
  if (!payment) throw AppError.notFound('Session de paiement introuvable.');
  const event = {
    id: `evt_sim_${sessionId}`,
    type: 'checkout.session.completed',
    data: { object: { id: sessionId, payment_status: 'paid', metadata: { bookingId: payment.booking.toString() } } },
  };
  const result = await handleWebhookEvent(event);
  return { bookingId: payment.booking.toString(), ...result };
}

async function listForClient(clientId) {
  const items = await Payment.find({ client: clientId, status: { $ne: P.PENDING } }).populate({ path: 'booking', populate: { path: 'room', select: 'name' } }).sort({ createdAt: -1 });
  return items.map((p) => ({
    id: p._id.toString(),
    bookingId: p.booking._id.toString(),
    roomName: p.booking.room ? p.booking.room.name : '—',
    date: p.booking.date,
    amountCents: p.amountCents,
    status: p.status,
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  }));
}

module.exports = { createCheckoutSession, handleWebhookEvent, simulatePayment, listForClient };
