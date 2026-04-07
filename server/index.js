const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

mongoose.set('bufferCommands', false);

const morgan = require('morgan');
app.use(morgan('dev'));

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowedPatterns = [
            /^http:\/\/localhost(:\d+)?$/,
            /^http:\/\/127\.0\.0\.1(:\d+)?$/,
            /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
            /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
            /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?$/,
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

const dbUri = process.env.MONGODB_URI;

if (!dbUri) {
    console.error('CRITICAL ERROR: MONGODB_URI is not defined in environment variables.');
    process.exit(1);
}

mongoose.connection.on('connected', () => {
    console.log('Successfully connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB Connection Error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
});

mongoose.connect(dbUri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
})
    .catch(err => {
        console.error('MongoDB initial connection failed:', err.message);
        console.error('The server will stay up, but database-backed API routes will return 503 until MongoDB reconnects.');
    });

const requireDatabaseConnection = (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            error: 'Database unavailable',
            detail: 'MongoDB is not connected. Please try again in a moment.',
            stateCode: mongoose.connection.readyState,
        });
    }
    next();
};

app.get('/test-db', (req, res) => {
    const state = mongoose.connection.readyState;
    if (state === 1) {
        res.status(200).json({ status: 'success', message: 'Database Connected' });
    } else {
        res.status(500).json({
            status: 'error',
            message: 'Database Disconnected',
            stateCode: state,
        });
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.send('Intelligent Expense Tracker API');
});

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const statsRoutes = require('./routes/stats');
const budgetRoutes = require('./routes/budgets');
const notificationRoutes = require('./routes/notifications');
const ocrRoutes = require('./routes/ocr');
const userRoutes = require('./routes/user');
const chatRoutes = require('./routes/chat');

app.use('/api', requireDatabaseConnection);
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ai/chat', chatRoutes);

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
