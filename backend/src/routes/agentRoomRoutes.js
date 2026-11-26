const express = require('express');
const router = express.Router();
const roomCtrl = require('../controllers/agentRoomController');
const { agentOnly } = require('../middlewares/identify');

router.get('/equipments', roomCtrl.getAllowedEquipments);

router.use(agentOnly);

router.post('/rooms', roomCtrl.createRoom);
router.get('/rooms', roomCtrl.getMyRooms);
router.get('/rooms/:id', roomCtrl.getRoomById);
router.put('/rooms/:id', roomCtrl.updateRoom);
router.delete('/rooms/:id', roomCtrl.deleteRoom);

module.exports = router;
