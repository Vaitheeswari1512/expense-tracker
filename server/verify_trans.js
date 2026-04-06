const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const count = await Transaction.countDocuments({});
        console.log(`Total transactions in DB: ${count}`);

        const janStart = new Date('2026-01-01');
        const janEnd = new Date('2026-01-31T23:59:59');
        const janCount = await Transaction.countDocuments({ date: { $gte: janStart, $lte: janEnd } });
        console.log(`Transactions in Jan: ${janCount}`);

        const febStart = new Date('2026-02-01');
        const febEnd = new Date('2026-02-28T23:59:59');
        const febCount = await Transaction.countDocuments({ date: { $gte: febStart, $lte: febEnd } });
        console.log(`Transactions in Feb: ${febCount}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

run();
