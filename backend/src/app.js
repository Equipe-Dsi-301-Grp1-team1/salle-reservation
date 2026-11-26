const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const app = express();
const creneauRoutes = require('./routes/creneauRoutes');
const agentRoomRoutes = require('./routes/agentRoomRoutes');
const agentCreneauViewRoutes = require('./routes/agentCreneauViewRoutes');
const authRoutes = require('./routes/authRoutes');
const agentAuthRoutes = require('./routes/agentAuthRoutes');
const { agentOnly } = require('./middlewares/identify');

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/agent/login', (req, res) => {
    res.render('agent/login');
});

app.get('/agent/dashboard', agentOnly, (req, res) => {
    res.render('agent/dashboard', {
        agent: req.session.agent
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/agent', agentAuthRoutes);
app.use('/api', creneauRoutes);
app.use('/api/agent', agentRoomRoutes);
app.use('/agent', agentOnly, agentCreneauViewRoutes);

module.exports = app;
