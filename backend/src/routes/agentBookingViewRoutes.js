const router = require('express').Router();
const viewController = require('../controllers/agentBookingViewController');

router.get('/requests', viewController.showRequests);
router.get('/requests/:id', viewController.showRequest);
router.post('/requests/:id/validate', viewController.validateRequest);

module.exports = router;
