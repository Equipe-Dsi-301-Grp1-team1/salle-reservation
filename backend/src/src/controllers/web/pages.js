const { validationResult } = require('express-validator');
const Room = require('../../models/room');
const { removeFile } = require('../../utils/files');

const errorMessages = (errors) => errors.array().map((e) => e.msg);
const editUrl = (room) => `/rooms/${room.id}/edit`;

async function webListRooms(req, res) {
  const rooms = await Room.searchRooms({ onlyPublished: false });
  res.render('rooms', { rooms });
}

function webNewForm(req, res) {
  res.render('room-form', { room: { photos: [] }, errors: [] });
}

async function webCreateRoom(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const room = { ...req.body, photos: [] };
    return res.status(400).render('room-form', { room, errors: errorMessages(errors) });
  }
  const room = await Room.createRoom(req.body);
  res.redirect(editUrl(room));
}

async function webEditForm(req, res, next) {
  const room = await Room.findOne({ _id: req.params.id });
  if (!room) return next();
  res.render('room-form', { room, errors: [] });
}

async function webUpdateRoom(req, res, next) {
  const existing = await Room.findOne({ _id: req.params.id });
  if (!existing) return next();

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const room = { ...req.body, id: existing.id, photos: existing.photos };
    return res.status(400).render('room-form', { room, errors: errorMessages(errors) });
  }
  await Room.updateRoom(req.params.id, req.body);
  res.redirect('/rooms');
}

async function webDeleteRoom(req, res, next) {
  const room = await Room.deleteRoom(req.params.id);
  if (!room) return next();
  res.redirect('/rooms');
}

async function webTogglePublish(req, res, next) {
  const room = await Room.togglePublish(req.params.id);
  if (!room) return next();
  res.redirect('/rooms');
}

async function webAddPhotos(req, res, next) {
  const files = req.files || [];
  try {
    const room = await Room.addPhotos(req.params.id, files);
    if (room) return res.redirect(editUrl(room));
    files.forEach((file) => removeFile(file.filename));
    next();
  } catch (err) {
    files.forEach((file) => removeFile(file.filename));
    throw err;
  }
}

async function webDeletePhoto(req, res, next) {
  const room = await Room.removePhoto(req.params.id, req.params.file);
  if (!room) return next();
  res.redirect(editUrl(room));
}

function webNotFound(req, res) {
  res.status(404).render('error', { title: 'Page introuvable', message: 'Cette page n’existe pas.' });
}

module.exports = {
  webListRooms, webNewForm, webCreateRoom, webEditForm, webUpdateRoom,
  webDeleteRoom, webTogglePublish, webAddPhotos, webDeletePhoto, webNotFound
};
