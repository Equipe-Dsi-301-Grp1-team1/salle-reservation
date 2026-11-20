const express = require('express');
const path = require('path');
const cors = require('cors');

const authRoutes = require('../routes/authRoutes');

const app = express();

app.use(cors({
    origin: 'http://localhost:4200',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use('/api/auth', authRoutes);


app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

module.exports = app;
