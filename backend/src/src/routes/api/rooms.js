const express = require('express');
const { validateSearch } = require('../../middlewares/validators');
const rooms = require('../../controllers/api/rooms');

const router = express.Router();

router.param('id', (req, res, next, id) => {
  if (/^[0-9a-f]{24}$/i.test(id)) return next();
  res.status(404).json({ erreur: 'Salle introuvable' });
});

router.get('/', validateSearch, rooms.apiSearchRooms);
router.get('/:id', rooms.apiGetRoom);

module.exports = router;
