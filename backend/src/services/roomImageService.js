const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const Room = require('../models/Room');
const { MAX_PHOTOS } = require('../middlewares/uploadImages');

const PUBLIC_URL_PREFIX = '/uploads/rooms/';
const FILE_NAME_PATTERN = /^[a-f0-9-]{36}\.(jpg|png|webp)$/;

function getUploadDir() {
  return process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'public', 'uploads', 'rooms');
}

function makeError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function getOwnedRoom(roomId, agentId) {
  let room;
  try {
    room = await Room.findById(roomId);
  } catch (error) {
    throw makeError(400, 'Identifiant de salle invalide.');
  }
  if (!room) {
    throw makeError(404, 'Salle introuvable.');
  }
  if (String(room.agentId) !== String(agentId)) {
    throw makeError(403, "Accès refusé : cette salle ne vous appartient pas.");
  }
  return room;
}

async function listPhotos(roomId, agentId) {
  const room = await getOwnedRoom(roomId, agentId);
  return room.photos || [];
}

async function addPhotos(roomId, agentId, files) {
  if (!files || files.length === 0) {
    throw makeError(400, 'Aucune photo sélectionnée.');
  }

  const room = await getOwnedRoom(roomId, agentId);
  const currentCount = (room.photos || []).length;
  if (currentCount + files.length > MAX_PHOTOS) {
    throw makeError(400, 'Limite atteinte : une salle peut avoir ' + MAX_PHOTOS + ' photos au maximum (' + currentCount + ' déjà ajoutée(s)).');
  }

  const dir = getUploadDir();
  await fs.mkdir(dir, { recursive: true });

  // Le nom est généré par le serveur : jamais celui de l'utilisateur.
  const savedNames = [];
  try {
    for (const file of files) {
      const name = crypto.randomUUID() + file.detectedExt;
      await fs.writeFile(path.join(dir, name), file.buffer);
      savedNames.push(name);
    }

    // La condition sur la taille du tableau évite de dépasser la limite
    // si deux envois arrivent en même temps.
    const updated = await Room.findOneAndUpdate(
      {
        _id: room._id,
        agentId: room.agentId,
        $expr: { $lte: [{ $size: { $ifNull: ['$photos', []] } }, MAX_PHOTOS - files.length] },
      },
      { $push: { photos: { $each: savedNames.map((name) => PUBLIC_URL_PREFIX + name) } } },
      { new: true }
    );

    if (!updated) {
      throw makeError(400, 'Limite atteinte : une salle peut avoir ' + MAX_PHOTOS + ' photos au maximum.');
    }
    return updated.photos;
  } catch (error) {
    await Promise.all(savedNames.map((name) => fs.rm(path.join(getUploadDir(), name), { force: true })));
    throw error;
  }
}

async function removePhoto(roomId, agentId, fileName) {
  if (!FILE_NAME_PATTERN.test(fileName || '')) {
    throw makeError(400, 'Nom de photo invalide.');
  }
  await getOwnedRoom(roomId, agentId);

  const updated = await Room.findOneAndUpdate(
    { _id: roomId, agentId: agentId, photos: PUBLIC_URL_PREFIX + fileName },
    { $pull: { photos: PUBLIC_URL_PREFIX + fileName } },
    { new: true }
  );
  if (!updated) {
    throw makeError(404, 'Photo introuvable pour cette salle.');
  }

  await fs.rm(path.join(getUploadDir(), fileName), { force: true });
  return updated.photos;
}

module.exports = { listPhotos, addPhotos, removePhoto, getOwnedRoom, PUBLIC_URL_PREFIX };
