const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const morgan = require('morgan');
// Middleware
app.use(morgan('dev'));

// ── CORS: allow Web (localhost) + Mobile (local network) ──────────────────────
app.use(cors({
    origin: (origin, callback) => {
        // Allow: no origin (mobile apps, curl), localhost ports, and local network IPs
        if (!origin) return callback(null, true);
        const allowedPatterns = [
            /^http:\/\/localhost(:\d+)?$/,          // localhost on any port (web/laptop)
            /^http:\/\/127\.0\.0\.1(:\d+)?$/,       // loopback
            /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/, // 10.x.x.x (corporate WiFi)
            /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/, // 192.168.x.x (home WiFi)
            /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?$/, // 172.16-31.x.x
        ];
        const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
        callback(null, isAllowed);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'auth-token', 'Authorization', 'userId'],
}));

app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection (MongoDB Atlas)
const dbUri = process.env.MONGODB_URI;

if (!dbUri) {
    console.error('CRITICAL ERROR: MONGODB_URI is not defined in environment variables.');
    process.exit(1);
}

mongoose.connect(dbUri)
    .then(() => {
        console.log('✅ Successfully connected to MongoDB Atlas');
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err.message);
        console.error('🚨 The server could not connect to the database. Check your connection string and Network IP details.');
        // Don't exit process so we can serve the /test-db failure message to mobile
    });

// API DB Check Endpoint (MongoDB diagnostic)
app.get('/test-db', (req, res) => {
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const state = mongoose.connection.readyState;
    if (state === 1) {
        res.status(200).json({ status: 'success', message: 'Database Connected' });
    } else {
        res.status(500).json({ 
            status: 'error', 
            message: 'Database Disconnected', 
            stateCode: state 
        });
    }
});

// Health check endpoint (used by Render to verify the server is alive)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Basic Route
app.get('/', (req, res) => {
    res.send('Intelligent Expense Tracker API');
});

// Import Routes
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const statsRoutes = require('./routes/stats');
const budgetRoutes = require('./routes/budgets');
const notificationRoutes = require('./routes/notifications');
const ocrRoutes = require('./routes/ocr');
const userRoutes = require('./routes/user');
const chatRoutes = require('./routes/chat');

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ai/chat', chatRoutes);

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
