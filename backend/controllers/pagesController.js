const showLogin = (req, res) => {
    res.render('agent/login');
};
const showDashboard = (req, res) => {
    res.render('agent/dashboard', {
        agent: req.session.agent
    });
};
module.exports = {
    showLogin,
    showDashboard
};