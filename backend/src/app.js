
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

const creneauRoutes = require('./routes/creneauRoutes');
const agentRoomRoutes = require('./routes/agentRoomRoutes');
const agentCreneauViewRoutes = require('./routes/agentCreneauViewRoutes');
const authRoutes = require('./routes/authRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const { agentOnly } = require('./middlewares/identify');

app.use(cors());
app.use(express.json({
    verify: (req, res, buffer) => {
        req.rawBody = buffer;
    }
}));
app.use(express.urlencoded({ extended: true }));

app.use(reservationRoutes);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api', creneauRoutes);
app.use('/api/agent', agentRoomRoutes);
app.use('/agent', agentOnly, agentCreneauViewRoutes);

module.exports = app;
