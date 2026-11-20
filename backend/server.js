const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config();
const connectDB = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const agentRoutes = require('./routes/agentRoutes');
const pagesRoutes = require('./routes/pagesRoutes');
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(cors({
    origin: 'http://localhost:4200',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));
app.use('/api/auth', authRoutes);
app.use('/api/agent', agentRoutes);
app.use('/agent', pagesRoutes);
app.get('/', (req, res) => {
    res.json({
        message: 'API Salle de réservation fonctionne !'
    });
});
const PORT = process.env.PORT || 3000;
const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Serveur démarré sur http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Impossible de démarrer le serveur');
        process.exit(1);
    }
};
startServer();
