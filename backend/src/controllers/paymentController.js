const paymentService = require('../services/paymentService');
const { toClientView } = require('../utils/bookingPresenter');

async function pay(req, res) {
  try {
    const result = await paymentService.createCheckout(req.user.id, req.params.id);
    res.json({
      message: result.mode === 'demo'
        ? 'Mode démonstration : confirmez le paiement pour tester le parcours.'
        : 'Redirection vers la page de paiement Stripe.',
      mode: result.mode,
      url: result.url,
      amount: result.amount,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

async function payDemo(req, res) {
  try {
    const booking = await paymentService.confirmDemoPayment(req.user.id, req.params.id);
    res.json({
      message: 'Paiement confirmé (démonstration). Votre réservation est payée.',
      booking: toClientView(booking),
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

module.exports = { pay, payDemo };
