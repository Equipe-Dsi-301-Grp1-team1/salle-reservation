const creneauService = require('../services/creneauService');

const WEEK_DAYS = [
  { number: 1, letter: 'L', name: 'Lundi' },
  { number: 2, letter: 'M', name: 'Mardi' },
  { number: 3, letter: 'M', name: 'Mercredi' },
  { number: 4, letter: 'J', name: 'Jeudi' },
  { number: 5, letter: 'V', name: 'Vendredi' },
  { number: 6, letter: 'S', name: 'Samedi' },
  { number: 0, letter: 'D', name: 'Dimanche' },
];

function readDays(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map(Number);
  }
  return [Number(value)];
}

function calendarUrl(req, dateText) {
  let url = '/agent/rooms/' + req.params.roomId + '/creneaux?agentId=' + req.agentId;
  if (dateText && dateText.length === 10) {
    url = url + '&month=' + dateText.slice(0, 7) + '&day=' + dateText;
  }
  return url;
}

function goToCalendar(req, res, dateText, message) {
  res.redirect(calendarUrl(req, dateText) + '&message=' + encodeURIComponent(message));
}

function goToCalendarWithError(req, res, dateText, error) {
  res.redirect(calendarUrl(req, dateText) + '&error=' + encodeURIComponent(error.message));
}

async function showCalendar(req, res) {
  try {
    const calendar = await creneauService.getCalendar(req.agentId, req.params.roomId, req.query.month, req.query.day);
    res.render('availability/calendar', {
      agentId: req.agentId,
      roomId: req.params.roomId,
      calendar: calendar,
      message: req.query.message || null,
      error: req.query.error || null,
    });
  } catch (error) {
    res.status(error.status || 500).send(error.message);
  }
}

async function open(req, res) {
  try {
    await creneauService.openDate(req.agentId, req.params.roomId, req.body.date);
    goToCalendar(req, res, req.body.date, 'Date ouverte.');
  } catch (error) {
    goToCalendarWithError(req, res, req.body.date, error);
  }
}

function renderRecurring(req, res, values, days, previewText, error) {
  res.status(error ? 400 : 200).render('availability/recurring', {
    agentId: req.agentId,
    roomId: req.params.roomId,
    weekDays: WEEK_DAYS,
    values: { startDate: values.startDate || '', endDate: values.endDate || '', days: days },
    previewText: previewText,
    message: null,
    error: error,
  });
}

async function showRecurring(req, res) {
  const days = readDays(req.query.days);
  if (!req.query.startDate || !req.query.endDate) {
    return renderRecurring(req, res, {}, days, null, null);
  }
  try {
    const count = await creneauService.countRecurring(req.agentId, req.params.roomId, req.query.startDate, req.query.endDate, days);
    let text = count + ' dates seront créées.';
    if (count === 1) {
      text = '1 date sera créée.';
    }
    renderRecurring(req, res, req.query, days, text, null);
  } catch (error) {
    renderRecurring(req, res, req.query, days, null, error.message);
  }
}

async function generateRecurring(req, res) {
  const days = readDays(req.body.days);
  try {
    const count = await creneauService.generateRecurring(req.agentId, req.params.roomId, req.body.startDate, req.body.endDate, days);
    goToCalendar(req, res, req.body.startDate, count + ' date(s) ouverte(s).');
  } catch (error) {
    renderRecurring(req, res, req.body, days, null, error.message);
  }
}

async function renderBlock(req, res, values, error) {
  try {
    const calendar = await creneauService.getCalendar(req.agentId, req.params.roomId, req.query.month, values.date);
    res.status(error ? 400 : 200).render('availability/block-date', {
      agentId: req.agentId,
      roomId: req.params.roomId,
      calendar: calendar,
      values: { date: values.date || '', reason: values.reason || '' },
      message: null,
      error: error,
    });
  } catch (roomError) {
    res.status(roomError.status || 500).send(roomError.message);
  }
}

function showBlockForm(req, res) {
  renderBlock(req, res, { date: req.query.date }, null);
}

async function block(req, res) {
  try {
    await creneauService.blockDate(req.agentId, req.params.roomId, req.body.date, req.body.reason);
    goToCalendar(req, res, req.body.date, 'Date bloquée.');
  } catch (error) {
    renderBlock(req, res, req.body, error.message);
  }
}

async function unblock(req, res) {
  try {
    await creneauService.unblockDate(req.agentId, req.params.roomId, req.params.date);
    goToCalendar(req, res, req.params.date, 'Date débloquée.');
  } catch (error) {
    goToCalendarWithError(req, res, req.params.date, error);
  }
}

async function remove(req, res) {
  try {
    await creneauService.removeDate(req.agentId, req.params.roomId, req.params.date);
    goToCalendar(req, res, req.params.date, 'Date retirée.');
  } catch (error) {
    goToCalendarWithError(req, res, req.params.date, error);
  }
}

module.exports = {
  showCalendar,
  open,
  showRecurring,
  generateRecurring,
  showBlockForm,
  block,
  unblock,
  remove,
};
