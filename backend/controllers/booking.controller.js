'use strict';
const asyncHandler = require('../utils/asyncHandler');
const bookings = require('../services/booking.service');
const payments = require('../services/payment.service');
const receipts = require('../services/receipt.service');

exports.create = asyncHandler(async (req, res) => {
  const { roomId, date, hours, guests, eventType } = req.body;
  res.status(201).json({ booking: await bookings.createRequest(req.user.id, { roomId, date, hours, guests, eventType }) });
});
exports.listMine = asyncHandler(async (req, res) => res.json(await bookings.listForClient(req.user.id, { status: req.query.status, page: req.query.page, limit: req.query.limit })));
exports.getMine = asyncHandler(async (req, res) => res.json({ booking: await bookings.getForClient(req.params.id, req.user.id) }));
exports.cancel = asyncHandler(async (req, res) => res.json({ booking: await bookings.cancel(req.user.id, req.params.id) }));
exports.pay = asyncHandler(async (req, res) => res.json(await payments.createCheckoutSession(req.params.id, req.user.id)));
exports.receipt = asyncHandler(async (req, res) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="recu-${req.params.id}.pdf"`);
  await receipts.streamReceipt(req.params.id, req.user.id, res);
});

exports.listForAgent = asyncHandler(async (req, res) => {
  const { status, room, page, limit } = req.query;
  res.json(await bookings.listForAgent(req.user.id, { status, room, page, limit }));
});
exports.getForAgent = asyncHandler(async (req, res) => res.json(await bookings.getForAgent(req.params.id, req.user.id)));
exports.validate = asyncHandler(async (req, res) => res.json({ booking: await bookings.validate(req.user.id, req.params.id) }));
exports.reject = asyncHandler(async (req, res) => res.json({ booking: await bookings.reject(req.user.id, req.params.id, req.body.reason) }));
