const Reservation = require('../models/Reservation');
const Room = require('../models/Room');
const { User } = require('../models/User');
const Payment = require('../models/Payment');
const { STATUS } = require('../constants/bookingStatus');
const { getStripe, isDemoMode } = require('../config/stripe');
const { toPaymentView } = require('../utils/bookingPresenter');
const bookingMailer = require('./bookingMailer');

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
    success_url: clientUrl() + '/reservations/' + booking._id + '/paiement/succes',
    cancel_url: clientUrl() + '/reservations/' + booking._id + '/paiement/echec',
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

  const room = await Room.findById(booking.roomId);
  const client = await User.findById(booking.clientId).select('name email');
  await bookingMailer.sendPaidClient(
    client ? client.email : null,
    booking,
    room || { name: 'Salle' }
  );

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

async function handleWebhook(rawBody, signature) {
  const stripe = getStripe();
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    throw makeError(503, 'Le paiement Stripe n\'est pas configuré.');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    throw makeError(400, 'Signature Stripe invalide.');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const bookingId = session.metadata ? session.metadata.bookingId : null;
    if (bookingId) {
      await markPaid(bookingId, {
        stripeSessionId: session.id,
        stripeEventId: event.id,
        amount: session.amount_total ? session.amount_total / 100 : undefined,
      });
    }
  }

  return { received: true };
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

async function listClientPayments(clientId) {
  const payments = await Payment.find({ clientId: clientId, status: 'REUSSIE' })
    .populate({
      path: 'bookingId',
      select: 'reference date amount roomId',
      populate: { path: 'roomId', select: 'name' },
    })
    .sort({ paidAt: -1 });

  return payments.map(toPaymentView);
}

module.exports = { createCheckout, markPaid, handleWebhook, confirmDemoPayment, listClientPayments, makeError };
