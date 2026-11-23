const Creneau = require('../models/Creneau');
const Reservation = require('../models/Reservation');
const Room = require('../models/Room');

const DAY_START = '00:00';
const DAY_END = '23:59';

const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const STATE_NAMES = { DISPONIBLE: 'libre', RESERVE: 'reserve', BLOQUE: 'bloque' };
const STATE_TEXTS = { libre: 'libre', reserve: 'réservé', bloque: 'bloqué', 'non-ouvert': 'non ouvert' };

function makeError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function isDateText(text) {
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return false;
  }
  return !isNaN(new Date(text).getTime());
}

function toDate(text) {
  if (!isDateText(text)) {
    throw makeError(400, 'Date invalide.');
  }
  return new Date(text + 'T00:00:00.000Z');
}

function dateToText(date) {
  return date.toISOString().slice(0, 10);
}

function today() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

async function checkRoom(roomId, agentId) {
  const room = await Room.findById(roomId);
  if (!room) {
    throw makeError(404, 'Salle introuvable.');
  }
  if (room.agentId.toString() !== agentId) {
    throw makeError(403, 'Cette salle ne vous appartient pas.');
  }
  return room;
}

async function openDate(agentId, roomId, dateText) {
  await checkRoom(roomId, agentId);
  const date = toDate(dateText);
  if (date < today()) {
    throw makeError(400, "Date passée : impossible de l'ouvrir.");
  }
  const alreadyOpen = await Creneau.findOne({ roomId: roomId, date: date });
  if (alreadyOpen) {
    throw makeError(409, 'Cette date est déjà ouverte.');
  }
  return Creneau.create({ roomId: roomId, date: date, timeStart: DAY_START, timeEnd: DAY_END });
}

function listDays(startText, endText, days) {
  const start = toDate(startText);
  const end = toDate(endText);
  if (start < today()) {
    throw makeError(400, 'La date de début est passée.');
  }
  if (end < start) {
    throw makeError(400, 'La date de fin doit être après la date de début.');
  }
  if ((end - start) / 86400000 > 366) {
    throw makeError(400, 'Période trop longue : un an maximum.');
  }
  if (days.length === 0) {
    throw makeError(400, 'Choisissez au moins un jour de la semaine.');
  }
  const result = [];
  const day = new Date(start);
  while (day <= end) {
    if (days.includes(day.getUTCDay())) {
      result.push(new Date(day));
    }
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return result;
}

async function keepNewDates(roomId, dates) {
  const existing = await Creneau.find({ roomId: roomId, date: { $in: dates } });
  const existingTimes = existing.map(function (creneau) {
    return creneau.date.getTime();
  });
  return dates.filter(function (date) {
    return !existingTimes.includes(date.getTime());
  });
}

async function countRecurring(agentId, roomId, startText, endText, days) {
  await checkRoom(roomId, agentId);
  const dates = listDays(startText, endText, days);
  const newDates = await keepNewDates(roomId, dates);
  return newDates.length;
}

async function generateRecurring(agentId, roomId, startText, endText, days) {
  await checkRoom(roomId, agentId);
  const dates = listDays(startText, endText, days);
  const newDates = await keepNewDates(roomId, dates);
  const newCreneaux = newDates.map(function (date) {
    return { roomId: roomId, date: date, timeStart: DAY_START, timeEnd: DAY_END };
  });
  await Creneau.insertMany(newCreneaux);
  return newCreneaux.length;
}

async function blockDate(agentId, roomId, dateText, reason) {
  await checkRoom(roomId, agentId);
  const date = toDate(dateText);
  const creneaux = await Creneau.find({ roomId: roomId, date: date });
  if (creneaux.length === 0) {
    throw makeError(404, "Cette date n'est pas ouverte.");
  }
  for (const creneau of creneaux) {
    if (creneau.status === 'RESERVE') {
      throw makeError(409, 'Blocage impossible : une réservation est validée ce jour-là.');
    }
  }
  await Creneau.updateMany({ roomId: roomId, date: date }, { status: 'BLOQUE', blockReason: reason || '' });
}

async function unblockDate(agentId, roomId, dateText) {
  await checkRoom(roomId, agentId);
  const date = toDate(dateText);
  const blocked = await Creneau.find({ roomId: roomId, date: date, status: 'BLOQUE' });
  if (blocked.length === 0) {
    throw makeError(404, "Cette date n'est pas bloquée.");
  }
  await Creneau.updateMany({ roomId: roomId, date: date, status: 'BLOQUE' }, { status: 'DISPONIBLE', blockReason: '' });
}

async function removeDate(agentId, roomId, dateText) {
  await checkRoom(roomId, agentId);
  const date = toDate(dateText);
  const creneaux = await Creneau.find({ roomId: roomId, date: date });
  if (creneaux.length === 0) {
    throw makeError(404, "Cette date n'est pas ouverte.");
  }
  const ids = [];
  let reserved = false;
  for (const creneau of creneaux) {
    ids.push(creneau._id);
    if (creneau.status === 'RESERVE') {
      reserved = true;
    }
  }
  const request = await Reservation.findOne({
    creneaux: { $in: ids },
    status: { $in: ['EN_ATTENTE', 'VALIDEE', 'PAYEE'] },
  });
  if (reserved || request) {
    throw makeError(409, 'Retrait impossible : une demande est en attente, validée ou payée ce jour-là.');
  }
  await Creneau.deleteMany({ roomId: roomId, date: date });
}

async function getCalendar(agentId, roomId, monthText, dayText) {
  const room = await checkRoom(roomId, agentId);

  let reference = new Date();
  if (isDateText(dayText)) {
    reference = toDate(dayText);
  }
  if (monthText && /^\d{4}-\d{2}$/.test(monthText) && isDateText(monthText + '-01')) {
    reference = toDate(monthText + '-01');
  }
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();

  const firstDay = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const emptyBefore = (firstDay.getUTCDay() + 6) % 7;
  const lastDay = new Date(Date.UTC(year, month, daysInMonth));

  const creneaux = await Creneau.find({ roomId: roomId, date: { $gte: firstDay, $lte: lastDay } });

  const cells = [];
  for (let i = 0; i < emptyBefore; i++) {
    cells.push(null);
  }
  for (let number = 1; number <= daysInMonth; number++) {
    const text = dateToText(new Date(Date.UTC(year, month, number)));
    let state = 'non-ouvert';
    for (const creneau of creneaux) {
      if (dateToText(creneau.date) === text) {
        state = STATE_NAMES[creneau.status];
      }
    }
    cells.push({ number: number, date: text, state: state });
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  let selected = null;
  if (isDateText(dayText)) {
    const day = toDate(dayText);
    const creneau = await Creneau.findOne({ roomId: roomId, date: day });
    const label = DAY_NAMES[day.getUTCDay()] + ' ' + day.getUTCDate() + ' ' + MONTH_NAMES[day.getUTCMonth()];
    let state = 'non-ouvert';
    let reason = '';
    if (creneau) {
      state = STATE_NAMES[creneau.status];
      reason = creneau.blockReason;
    }
    selected = {
      date: dayText,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      state: state,
      stateText: STATE_TEXTS[state],
      reason: reason,
    };
  }

  const monthLabel = MONTH_NAMES[month].charAt(0).toUpperCase() + MONTH_NAMES[month].slice(1) + ' ' + year;
  return {
    room: room,
    month: dateToText(firstDay).slice(0, 7),
    monthLabel: monthLabel,
    previousMonth: dateToText(new Date(Date.UTC(year, month - 1, 1))).slice(0, 7),
    nextMonth: dateToText(new Date(Date.UTC(year, month + 1, 1))).slice(0, 7),
    weeks: weeks,
    selected: selected,
  };
}

async function listAvailableCreneaux(roomId, dateText) {
  const filter = { roomId: roomId, status: 'DISPONIBLE', date: { $gte: today() } };
  if (dateText) {
    filter.date = toDate(dateText);
  }
  return Creneau.find(filter).sort({ date: 1, timeStart: 1 });
}

async function roomsAvailableOn(dateText) {
  return Creneau.distinct('roomId', { date: toDate(dateText), status: 'DISPONIBLE' });
}

module.exports = {
  openDate,
  countRecurring,
  generateRecurring,
  blockDate,
  unblockDate,
  removeDate,
  getCalendar,
  listAvailableCreneaux,
  roomsAvailableOn,
};
