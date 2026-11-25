const router = require('express').Router();
const viewController = require('../controllers/agentBookingViewController');

router.get('/requests', viewController.showRequests);
router.get('/requests/:id', viewController.showRequest);

module.exports = router;
