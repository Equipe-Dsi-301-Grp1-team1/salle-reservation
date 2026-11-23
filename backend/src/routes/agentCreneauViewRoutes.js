const router = require('express').Router();
const viewController = require('../controllers/creneauViewController');

router.get('/rooms/:roomId/creneaux', viewController.showCalendar);
router.post('/rooms/:roomId/creneaux', viewController.open);
router.get('/rooms/:roomId/creneaux/recurring', viewController.showRecurring);
router.post('/rooms/:roomId/creneaux/recurring', viewController.generateRecurring);
router.get('/rooms/:roomId/creneaux/block', viewController.showBlockForm);
router.post('/rooms/:roomId/creneaux/block', viewController.block);
router.post('/rooms/:roomId/creneaux/:date/unblock', viewController.unblock);
router.post('/rooms/:roomId/creneaux/:date/delete', viewController.remove);

module.exports = router;
