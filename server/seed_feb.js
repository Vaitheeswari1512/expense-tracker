const mongoose = require('mongoose');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to Atlas DB');

        const user = await User.findOne({ email: 'vaithi1552006@gmail.com' });
        if (!user) {
            console.log('User not found');
            process.exit(1);
        }

        const baseDate = new Date('2026-02-15T10:00:00Z');

        const transactions = [
            {
                userId: user._id,
                type: 'income',
                amount: 5000,
                category: 'Salary',
                description: 'Monthly Income',
                date: baseDate,
            },
            { userId: user._id, type: 'expense', amount: 1000, category: 'Housing', description: 'Rent/Mortgage', date: baseDate },
            { userId: user._id, type: 'expense', amount: 300, category: 'Utilities', description: 'Bills', date: baseDate },
            { userId: user._id, type: 'expense', amount: 800, category: 'Food', description: 'Groceries', date: baseDate },
            { userId: user._id, type: 'expense', amount: 400, category: 'Transport', description: 'Gas/Transit', date: baseDate },
            { userId: user._id, type: 'expense', amount: 500, category: 'Entertainment', description: 'Movies, Subscriptions', date: baseDate },
            { userId: user._id, type: 'expense', amount: 600, category: 'Shopping', description: 'Clothes, Gadgets', date: baseDate },
            { userId: user._id, type: 'expense', amount: 400, category: 'Dining', description: 'Eating out', date: baseDate },
            { userId: user._id, type: 'expense', amount: 600, category: 'Savings', description: 'Emergency Fund', date: baseDate },
            { userId: user._id, type: 'expense', amount: 400, category: 'Investments', description: 'Stocks', date: baseDate }
        ];

        // Delete any existing 2026-02 transactions to be safe
        const startDate = new Date('2026-02-01T00:00:00.000Z');
        const endDate = new Date('2026-02-28T23:59:59.999Z');
        await Transaction.deleteMany({
            userId: user._id,
            date: { $gte: startDate, $lte: endDate }
        });

        await Transaction.insertMany(transactions);
        console.log('Successfully inserted February 2026 records.');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

run();
