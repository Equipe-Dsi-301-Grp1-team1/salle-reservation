'use strict';
const { api } = require('../services/apiClient');
const { failWithFlash } = require('../utils/actionError');

const tok = (req) => ({ token: req.session.token });
const STATUS_FILTERS = ['PENDING', 'VALIDATED', 'REJECTED'];

exports.index = async (req, res) => {
  const status = STATUS_FILTERS.includes(req.query.status) ? req.query.status : '';
  const room = String(req.query.room || '');
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const [list, rooms] = await Promise.all([
    api.get('/agent/bookings', { ...tok(req), query: { status, room, page, limit: 10 } }),
    api.get('/agent/rooms', tok(req)),
  ]);
  const summary = list.summary || {};
  const counts = summary.counts || {};
  res.render('bookings/index', {
    title: 'Demandes de réservation',
    bookings: list.items || [],
    page: list.page || page,
    totalPages: list.totalPages || 0,
    total: list.total || 0,
    status,
    room,
    rooms: rooms.items || [],
    counts,
    monthRevenueCents: summary.monthRevenueCents || 0,
    query: { status, room },
  });
};

exports.show = async (req, res) => {
  const data = await api.get(`/agent/bookings/${encodeURIComponent(req.params.id)}`, tok(req));
  const history = data.history || { counts: {}, paidTotalCents: 0, items: [] };
  res.render('bookings/show', { title: `Demande de ${data.booking.client.name}`, booking: data.booking, history });
};

exports.validate = async (req, res, next) => {
  const id = encodeURIComponent(req.params.id);
  try {
    await api.post(`/agent/bookings/${id}/validate`, undefined, tok(req));
    req.flash('success', 'Demande validée. Le client a 48 h pour payer.');
    return res.redirect('/bookings');
  } catch (err) {
    return failWithFlash(req, res, next, err, `/bookings/${id}`);
  }
};

exports.reject = async (req, res, next) => {
  const id = encodeURIComponent(req.params.id);
  const reason = String(req.body.reason || '').trim();
  if (!reason) {
    req.flash('error', 'Le motif du refus est obligatoire.');
    return res.redirect(`/bookings/${id}`);
  }
  try {
    await api.post(`/agent/bookings/${id}/reject`, { reason }, tok(req));
    req.flash('success', 'Demande refusée. Le client est prévenu par e-mail.');
    return res.redirect('/bookings');
  } catch (err) {
    return failWithFlash(req, res, next, err, `/bookings/${id}`);
  }
};
