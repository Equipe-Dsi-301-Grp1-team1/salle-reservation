
const express = require('express');
const router = express.Router();
const roomCtrl = require('../controllers/agentRoomController');

router.get('/equipments', roomCtrl.getAllowedEquipments);

router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'test') {
    const testAgentId =
      req.headers['x-test-agent-id'] ||
      req.query.agentId ||
      req.body?.agentId;

    req.user = testAgentId ? { id: testAgentId } : undefined;
  } else if (!req.user) {
    req.user = { id: '673f1234567890abcdef1234' };
  }

  next();
});

router.post('/rooms', roomCtrl.createRoom);
router.get('/rooms', roomCtrl.getMyRooms);
router.get('/rooms/:id', roomCtrl.getRoomById);
router.put('/rooms/:id', roomCtrl.updateRoom);
router.delete('/rooms/:id', roomCtrl.deleteRoom);

module.exports = router;
