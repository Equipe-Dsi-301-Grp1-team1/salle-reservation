const { STATUS } = require('../constants/bookingStatus');


const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function isDateText(text) {
  return typeof text === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(text) && !isNaN(new Date(text + 'T00:00:00.000Z').getTime());
}

function toDay(text) {
  if (!isDateText(text)) {
    const error = new Error('Date invalide.');
    error.status = 400;
    throw error;
  }
  return new Date(text + 'T00:00:00.000Z');
}

function dayText(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function today() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function daysBetween(from, to) {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

function formatFrenchDate(date) {
  const day = new Date(date);
  const text = DAY_NAMES[day.getUTCDay()] + ' ' + day.getUTCDate() + ' ' + MONTH_NAMES[day.getUTCMonth()] + ' ' + day.getUTCFullYear();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function makeReference() {
  const time = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 90 + 10);
  return 'RES-' + time + '-' + random;
}

function isFinalStatus(status) {
  return [STATUS.REFUSEE, STATUS.EXPIREE, STATUS.ANNULEE, STATUS.TERMINEE].includes(status);
}

module.exports = {
  isDateText,
  toDay,
  dayText,
  today,
  daysBetween,
  formatFrenchDate,
  makeReference,
  isFinalStatus,
};
