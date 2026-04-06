const router = require('express').Router();
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register
router.post('/register', async (req, res) => {
    console.log('Register Request:', req.body);
    try {
        const { name, email, password, phone } = req.body;

        // Check if user exists
        console.log('MongoDB: Checking if user email already exists...');
        const userExists = await User.findOne({ email });
        if (userExists) {
            console.warn('MongoDB Register: Email already exists in database');
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        console.log('MongoDB: Attempting to save new user object...');
        const user = new User({
            name,
            email,
            password: hashedPassword,
            phone: phone || ''
        });
        const savedUser = await user.save();
        console.log('✅ MongoDB: User successfully saved with ID', savedUser._id);

        // Create empty financial record for the new user
        console.log('MongoDB: Attempting to initialize Wallet document...');
        const wallet = new Wallet({
            userId: savedUser._id,
            income: 0,
            expenses: 0,
            balance: 0
        });
        await wallet.save();
        console.log('✅ MongoDB: Wallet successfully initialized.');

        // Generate token so they can auto-login after register
        const token = jwt.sign({ _id: savedUser._id }, process.env.JWT_SECRET);

        res.json({ 
            success: true, 
            token, 
            user: { 
                _id: savedUser._id, 
                name: savedUser.name, 
                email: savedUser.email 
            } 
        });
    } catch (err) {
        console.log('Full Register Error:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
        res.status(400).json({ error: 'Registration failed', detail: err.toString() });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        console.log(`Login Request for email: ${req.body.email}`);
        const { email, password } = req.body;

        // Check user
        console.log('MongoDB: Querying users collection for email...');
        const user = await User.findOne({ email });
        if (!user) {
            console.warn('MongoDB Login: Email is not found in database');
            return res.status(400).json({ error: 'Email is not found' });
        }
        console.log(`✅ MongoDB: Found existing user (ID: ${user._id})`);

        // Check password
        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ error: 'Invalid password' });

        // Create token
        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
        res.header('auth-token', token).json({ success: true, token, user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, settings: user.settings } });
    } catch (err) {
        console.error('Login Error:', err.message);
        res.status(400).json({ error: err.message });
    }
});

// Update User
router.put('/update/:id', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        const updateData = { name, email, phone };

        if (password && password.length > 0) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updatedUser) return res.status(404).json({ error: 'User not found' });

        res.json(updatedUser);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

const verify = require('./verifyToken');

// Dashboard Data API
router.get('/dashboard/:userId', verify, async (req, res) => {
    // Security Check: Ensure authenticated user is only accessing their own data
    if (req.user._id !== req.params.userId) {
        return res.status(403).json({ error: 'Access denied. You can only view your own dashboard.' });
    }

    try {
        const wallet = await Wallet.findOne({ userId: req.params.userId });
        if (!wallet) {
            // If No record found, create one for existing users (safety catch)
            const newWallet = new Wallet({
                userId: req.params.userId,
                income: 0,
                expenses: 0,
                balance: 0
            });
            await newWallet.save();
            return res.json(newWallet);
        }
        res.json(wallet);
    } catch (err) {
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

// Update Wallet Balance API
router.put('/wallet/:userId', verify, async (req, res) => {
    // Security Check: Ensure authenticated user is only updating their own data
    if (req.user._id !== req.params.userId) {
        return res.status(403).json({ error: 'Access denied. You can only update your own wallet.' });
    }

    try {
        const { balance } = req.body;
        const updatedWallet = await Wallet.findOneAndUpdate(
            { userId: req.params.userId },
            { balance: Number(balance) },
            { new: true }
        );

        if (!updatedWallet) return res.status(404).json({ error: 'Wallet not found' });

        res.json(updatedWallet);
    } catch (err) {
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

module.exports = router;
