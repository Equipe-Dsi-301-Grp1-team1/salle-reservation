
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

const creneauRoutes = require('./routes/creneauRoutes');
const agentRoomRoutes = require('./routes/agentRoomRoutes');
const agentCreneauViewRoutes = require('./routes/agentCreneauViewRoutes');
const authRoutes = require('./routes/authRoutes');
const roomImageRoutes = require('./routes/roomImageRoutes');
const { agentOnly } = require('./middlewares/identify');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dossier public/ : photos des salles (/uploads/rooms/...) et scripts de l'espace agent (/js/...).
// Il est servi par le backend, donc visible aussi bien par les pages EJS que par Angular.
app.use(express.static(path.join(__dirname, '..', 'public')));

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
app.use('/api/agent', roomImageRoutes.apiRouter);
app.use('/agent', agentOnly, agentCreneauViewRoutes);
app.use('/agent', agentOnly, roomImageRoutes.viewRouter);

module.exports = app;
