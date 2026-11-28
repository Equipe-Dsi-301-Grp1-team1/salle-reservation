const roomImageService = require('../services/roomImageService');


async function list(req, res) {
  try {
    const photos = await roomImageService.listPhotos(req.params.id, req.user.id);
    res.status(200).json({ photos });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

async function upload(req, res) {
  try {
    const photos = await roomImageService.addPhotos(req.params.id, req.user.id, req.files);
    res.status(201).json({ message: 'Photo(s) ajoutée(s) avec succès.', photos });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

async function remove(req, res) {
  try {
    const photos = await roomImageService.removePhoto(req.params.id, req.user.id, req.params.fileName);
    res.status(200).json({ message: 'Photo supprimée.', photos });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}


function pageUrl(req, extra) {
  return '/agent/rooms/' + req.params.roomId + '/photos?agentId=' + encodeURIComponent(req.agentId) + extra;
}

async function showPage(req, res) {
  try {
    const room = await roomImageService.getOwnedRoom(req.params.roomId, req.agentId);
    res.render('rooms/photos', {
      agentId: req.agentId,
      roomId: req.params.roomId,
      room: room,
      photos: room.photos || [],
      message: req.query.message || null,
      error: req.query.error || null,
    });
  } catch (error) {
    res.status(error.status || 500).send(error.message);
  }
}

async function uploadFromPage(req, res) {
  try {
    await roomImageService.addPhotos(req.params.roomId, req.agentId, req.files);
    res.redirect(pageUrl(req, '&message=' + encodeURIComponent('Photo(s) ajoutée(s).')));
  } catch (error) {
    res.redirect(pageUrl(req, '&error=' + encodeURIComponent(error.message)));
  }
}

async function removeFromPage(req, res) {
  try {
    await roomImageService.removePhoto(req.params.roomId, req.agentId, req.params.fileName);
    res.redirect(pageUrl(req, '&message=' + encodeURIComponent('Photo supprimée.')));
  } catch (error) {
    res.redirect(pageUrl(req, '&error=' + encodeURIComponent(error.message)));
  }
}

module.exports = { list, upload, remove, showPage, uploadFromPage, removeFromPage };
