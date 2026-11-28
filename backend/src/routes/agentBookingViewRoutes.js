const router = require('express').Router();
const viewController = require('../controllers/agentBookingViewController');

router.get('/requests', viewController.showRequests);

module.exports = router;
