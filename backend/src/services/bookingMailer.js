const emailService = require('./emailService');
const { formatFrenchDate } = require('../utils/bookingDate');

function euros(value) {
  return Number(value).toFixed(2) + ' €';
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

module.exports = { sendNewRequest };
