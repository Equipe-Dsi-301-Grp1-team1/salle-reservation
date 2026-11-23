const router = require('express').Router();
const creneauController = require('../controllers/creneauController');

router.get('/rooms/:roomId/creneaux', creneauController.listAvailable);
router.get('/creneaux/rooms', creneauController.roomsAvailable);

module.exports = router;
