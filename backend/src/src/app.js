const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { CLIENT_URL } = require('./config');
const errorHandler = require('./middlewares/errorHandler');
const roomsApi = require('./routes/api/rooms');
const webRouter = require('./routes/web/pages');
const { webNotFound } = require('./controllers/web/pages');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(morgan('dev'));
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/rooms', cors({ origin: CLIENT_URL }), roomsApi);
app.use('/api', (req, res) => res.status(404).json({ erreur: 'Route introuvable' }));

app.use('/', webRouter);

app.use(webNotFound);
app.use(errorHandler);

module.exports = app;
