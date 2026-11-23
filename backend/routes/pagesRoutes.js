const express = require('express');
const router = express.Router();
const pagesController = require('../controllers/pagesController');
const authAgent = require('../middlewares/authAgent');
router.get('/login', pagesController.showLogin);
router.get('/dashboard', authAgent, pagesController.showDashboard);
module.exports = router;
