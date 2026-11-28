const emailService = require('./emailService');
const { formatFrenchDate } = require('../utils/bookingDate');

function euros(value) {
  return Number(value).toFixed(2).replace('.', ',') + ' €';
}

async function sendNewRequest(agentEmail, booking, room, clientName) {
  if (!agentEmail) {
    return;
  }

  const html =
    '<p>Bonjour,</p>' +
    '<p>Vous avez reçu une nouvelle demande de réservation.</p>' +
    '<ul>' +
    '<li>Client : ' + clientName + '</li>' +
    '<li>Salle : ' + room.name + '</li>' +
    '<li>Date : ' + formatFrenchDate(booking.date) + '</li>' +
    '<li>Durée : ' + booking.hours + ' heures</li>' +
    '<li>Montant : ' + euros(booking.amount) + '</li>' +
    '</ul>' +
    '<p>Connectez-vous à votre espace agent pour la traiter.</p>';

  try {
    await emailService.sendMail({
      to: agentEmail,
      subject: 'Nouvelle demande de réservation - ' + booking.reference,
      html: html,
    });
  } catch (error) {
    console.error('E-mail de nouvelle demande non envoyé :', error.message);
  }
}

async function sendValidated(clientEmail, booking, room) {
  if (!clientEmail) {
    return;
  }

  const paiement = (process.env.CLIENT_URL || 'http://localhost:4200') +
    '/reservations/' + booking._id + '/paiement';

  const html =
    '<p>Bonjour,</p>' +
    '<p>Votre demande de réservation est <strong>validée</strong>.</p>' +
    '<ul>' +
    '<li>Salle : ' + room.name + '</li>' +
    '<li>Date : ' + formatFrenchDate(booking.date) + '</li>' +
    '<li>Montant : ' + euros(booking.amount) + '</li>' +
    '</ul>' +
    '<p>Vous avez 48 heures pour payer, sinon le jour sera de nouveau libre.</p>' +
    '<p><a href="' + paiement + '">Payer ma réservation</a></p>';

  try {
    await emailService.sendMail({
      to: clientEmail,
      subject: 'Demande validée - ' + booking.reference,
      html: html,
    });
  } catch (error) {
    console.error('E-mail de validation non envoyé :', error.message);
  }
}

async function sendRejected(clientEmail, booking, room) {
  if (!clientEmail) {
    return;
  }

  const html =
    '<p>Bonjour,</p>' +
    '<p>Votre demande de réservation a été <strong>refusée</strong>.</p>' +
    '<ul>' +
    '<li>Salle : ' + room.name + '</li>' +
    '<li>Date : ' + formatFrenchDate(booking.date) + '</li>' +
    '<li>Motif : ' + booking.rejectionReason + '</li>' +
    '</ul>' +
    '<p>Vous pouvez chercher une autre salle ou une autre date.</p>';

  try {
    await emailService.sendMail({
      to: clientEmail,
      subject: 'Demande refusée - ' + booking.reference,
      html: html,
    });
  } catch (error) {
    console.error('E-mail de refus non envoyé :', error.message);
  }
}

async function sendPaidClient(clientEmail, booking, room) {
  if (!clientEmail) {
    return;
  }

  const html =
    '<p>Bonjour,</p>' +
    '<p>Votre paiement est confirmé. Votre réservation est <strong>payée</strong>.</p>' +
    '<ul>' +
    '<li>Référence : ' + booking.reference + '</li>' +
    '<li>Salle : ' + room.name + '</li>' +
    '<li>Date : ' + formatFrenchDate(booking.date) + '</li>' +
    '<li>Montant : ' + euros(booking.amount) + '</li>' +
    '</ul>' +
    '<p>Conservez cet e-mail comme preuve de votre réservation.</p>';

  try {
    await emailService.sendMail({
      to: clientEmail,
      subject: 'Paiement confirmé - ' + booking.reference,
      html: html,
    });
  } catch (error) {
    console.error('E-mail de paiement client non envoyé :', error.message);
  }
}

module.exports = { sendNewRequest, sendValidated, sendRejected, sendPaidClient };
