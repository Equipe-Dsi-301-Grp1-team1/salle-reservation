const dashboardService = require('../services/dashboardService');

async function showApi(req, res) {
  try {
    const dashboard = await dashboardService.getDashboard(req.user.id);
    res.json(dashboard);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

async function showPage(req, res) {
  try {
    const dashboard = await dashboardService.getDashboard(req.agentId);
    res.render('reservations/agent/dashboard', {
      agentId: req.agentId,
      title: 'Tableau de bord',
      dashboard: dashboard,
      message: req.query.message || null,
      error: req.query.error || null,
    });
  } catch (error) {
    res.status(error.status || 500).send(error.message);
  }
}

module.exports = { showApi, showPage };
