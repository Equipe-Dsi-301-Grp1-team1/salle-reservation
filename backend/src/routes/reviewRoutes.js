const router = require('express').Router();
const reviewController = require('../controllers/reviewController');
const clientOnly = require('../middlewares/clientOnly');

router.post('/bookings/:id/review', clientOnly, reviewController.create);
router.get('/rooms/:roomId/reviews', reviewController.list);

module.exports = router;
