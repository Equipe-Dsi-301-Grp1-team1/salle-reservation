const Reservation = require('../models/Reservation');
const Payment = require('../models/Payment');
const { STATUS } = require('../constants/bookingStatus');
const { getStripe, isDemoMode } = require('../config/stripe');

function makeError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function clientUrl() {
  return process.env.CLIENT_URL || 'http://localhost:4200';
}

async function createCheckout(clientId, bookingId) {
  const booking = await Reservation.findOne({ _id: bookingId, clientId: clientId });
  if (!booking) {
    throw makeError(404, 'Réservation introuvable.');
  }
  if (booking.status !== STATUS.VALIDEE) {
    throw makeError(409, 'Seule une réservation validée peut être payée.');
  }
  if (booking.expiresAt && booking.expiresAt < new Date()) {
    throw makeError(409, 'Le délai de paiement de 48 h est dépassé.');
  }

  if (isDemoMode()) {
    return {
      mode: 'demo',
      url: null,
      amount: booking.amount,
      message: 'Mode démonstration : aucun paiement réel ne sera effectué.',
    };
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(booking.amount * 100),
          product_data: {
            name: 'Réservation ' + booking.reference,
          },
        },
      },
    ],
    metadata: { bookingId: booking._id.toString() },
    success_url: clientUrl() + '/reservations/' + booking._id + '?paiement=succes',
    cancel_url: clientUrl() + '/reservations/' + booking._id + '/paiement?paiement=echec',
  });

  await Payment.create({
    bookingId: booking._id,
    clientId: clientId,
    amount: booking.amount,
    status: 'EN_ATTENTE',
    stripeSessionId: session.id,
  });

  return { mode: 'stripe', url: session.url, amount: booking.amount };
}

async function markPaid(bookingId, data) {
  const options = data || {};
  const booking = await Reservation.findById(bookingId);
  if (!booking) {
    throw makeError(404, 'Réservation introuvable.');
  }

  if (options.stripeEventId) {
    const already = await Payment.findOne({ stripeEventId: options.stripeEventId });
    if (already) {
      return booking;
    }
  }

  if (booking.status === STATUS.PAYEE) {
    return booking;
  }
  if (booking.status !== STATUS.VALIDEE) {
    throw makeError(409, 'Cette réservation ne peut pas être payée.');
  }

  booking.status = STATUS.PAYEE;
  booking.paidAt = new Date();
  await booking.save();

  const amount = options.amount !== undefined ? options.amount : booking.amount;

  if (options.stripeSessionId) {
    const payment = await Payment.findOne({ stripeSessionId: options.stripeSessionId });
    if (payment) {
      payment.status = 'REUSSIE';
      payment.paidAt = new Date();
      payment.stripeEventId = options.stripeEventId;
      await payment.save();
      return booking;
    }
  }

  await Payment.create({
    bookingId: booking._id,
    clientId: booking.clientId,
    amount: amount,
    status: 'REUSSIE',
    stripeSessionId: options.stripeSessionId,
    stripeEventId: options.stripeEventId,
    paidAt: new Date(),
  });

  return booking;
}

async function confirmDemoPayment(clientId, bookingId) {
  if (!isDemoMode()) {
    throw makeError(403, 'Le paiement de démonstration est désactivé.');
  }

  const booking = await Reservation.findOne({ _id: bookingId, clientId: clientId });
  if (!booking) {
    throw makeError(404, 'Réservation introuvable.');
  }

  return markPaid(booking._id, {
    stripeEventId: 'demo-' + booking._id,
    amount: booking.amount,
  });
}

module.exports = { createCheckout, markPaid, confirmDemoPayment, makeError };
