const router = require('express').Router();
const viewController = require('../controllers/agentBookingViewController');
const dashboardController = require('../controllers/dashboardController');

router.get('/dashboard', dashboardController.showPage);
router.get('/requests', viewController.showRequests);
router.get('/requests/:id', viewController.showRequest);
router.post('/requests/:id/validate', viewController.validateRequest);
router.post('/requests/:id/reject', viewController.rejectRequest);

module.exports = router;
