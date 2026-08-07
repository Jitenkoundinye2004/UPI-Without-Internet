const express = require('express');
const cors = require('cors');
const path = require('path');
const sequelize = require('./config/database');
const serverKeyHolder = require('./crypto/ServerKeyHolder');
const demo = require('./services/DemoService');
const apiRoutes = require('./controllers/api');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api', apiRoutes);

// Fallback for dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Initialize server
async function start() {
    try {
        // Initialize database (create tables)
        await sequelize.sync({ force: true }); // drop and re-create like create-drop
        console.log('Database synced');

        // Seed initial accounts
        await demo.seedAccounts();

        // Initialize RSA key pair
        serverKeyHolder.init();

        app.listen(PORT, () => {
            console.log(`Node.js server listening on port ${PORT}`);
        });
    } catch (e) {
        console.error('Failed to start server:', e);
    }
}

start();
