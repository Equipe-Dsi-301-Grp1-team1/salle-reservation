const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// 1. Middlewares globaux (en premier, avant les routes)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Configuration EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// 3. Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/agent', require('./routes/agentRoomRoutes'));

module.exports = app;