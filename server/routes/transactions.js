const router = require('express').Router();
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const verify = require('./verifyToken');
const { checkBudgetAndNotify } = require('../services/budgetService');

// Get all transactions for a user
router.get('/', verify, async (req, res) => {
    try {
        const { month, year, limit } = req.query;
        let query = { userId: req.user._id };

        if (month && year) {
            // month is 1-indexed (1-12)
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59, 999);
            query.date = { $gte: startDate, $lte: endDate };
        }

        let transactionQuery = Transaction.find(query).sort({ date: -1 });
        
        if (limit) {
            transactionQuery = transactionQuery.limit(parseInt(limit));
        }

        const transactions = await transactionQuery;
        res.json(transactions);
    } catch (err) {
        res.status(400).send(err);
    }
});

// Add a transaction
router.post('/', verify, async (req, res) => {
    const { type, amount, category, date, description, isSmsAuto } = req.body;

    // Optional Check: Prevent duplicates from Auto SMS
    if (isSmsAuto) {
        // Look for recent exact duplicates within the last few minutes
        const fewMinutesAgo = new Date(Date.now() - 5 * 60 * 1000); 
        const existingTrans = await Transaction.findOne({
            userId: req.user._id,
            amount,
            type,
            category,
            date: { $gte: fewMinutesAgo }
        });
        
        if (existingTrans) {
            return res.status(409).json({ success: false, message: 'Duplicate transaction detected.' });
        }
    }

    const transaction = new Transaction({
        userId: req.user._id,
        type,
        amount,
        category,
        date: date || Date.now(),
        description,
        isSmsAuto
    });

    try {
        const savedTransaction = await transaction.save();

        // UPDATE WALLET LOGIC
        const wallet = await Wallet.findOne({ userId: req.user._id });
        if (wallet) {
            if (type === 'income') {
                wallet.income += amount;
                wallet.balance += amount;
            } else {
                wallet.expenses += amount;
                wallet.balance -= amount;
            }
            await wallet.save();
        }

        // CHECK BUDGET LOGIC
        if (type === 'expense') {
            await checkBudgetAndNotify(req.user._id, category, amount, date || new Date());
        }

        // CREATE NOTIFICATION FOR SUCCESSFUL SYNC
        const Notification = require('../models/Notification');
        const syncNotif = new Notification({
            userId: req.user._id,
            title: 'Transaction Synced',
            message: `${type === 'income' ? 'Received' : 'Spent'} ₹${amount} (${category})`,
            type: type, // Uses 'income' or 'expense'
            category: category,
            read: false
        });
        await syncNotif.save().catch(e => console.log("Auto-notif failed", e));

        res.json({
            success: true,
            transaction: savedTransaction
        });
    } catch (err) {
        res.status(400).send(err);
    }
});

// Update a transaction
router.put('/:id', verify, async (req, res) => {
    try {
        const { type, amount, category, date, description } = req.body;

        const oldTransaction = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
        if (!oldTransaction) return res.status(404).json({ error: 'Transaction not found' });

        const updatedTransaction = await Transaction.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { type, amount, category, date, description },
            { new: true }
        );

        // UPDATE WALLET LOGIC
        const wallet = await Wallet.findOne({ userId: req.user._id });
        if (wallet && updatedTransaction) {
            // Revert old
            if (oldTransaction.type === 'income') {
                wallet.income -= oldTransaction.amount;
                wallet.balance -= oldTransaction.amount;
            } else {
                wallet.expenses -= oldTransaction.amount;
                wallet.balance += oldTransaction.amount;
            }
            // Apply new
            if (updatedTransaction.type === 'income') {
                wallet.income += updatedTransaction.amount;
                wallet.balance += updatedTransaction.amount;
            } else {
                wallet.expenses += updatedTransaction.amount;
                wallet.balance -= updatedTransaction.amount;
            }
            await wallet.save();
        }

        // Optional: Re-check budget if expense
        if (updatedTransaction && type === 'expense') {
            await checkBudgetAndNotify(req.user._id, category, 0, date || new Date());
        }

        res.json(updatedTransaction);
    } catch (err) {
        res.status(400).send(err);
    }
});

// Delete a transaction
router.delete('/:id', verify, async (req, res) => {
    try {
        const transactionToDelete = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
        if (!transactionToDelete) return res.status(404).json({ message: "Transaction not found" });

        const removedTransaction = await Transaction.deleteOne({ _id: req.params.id, userId: req.user._id });
        
        // UPDATE WALLET LOGIC
        const wallet = await Wallet.findOne({ userId: req.user._id });
        if (wallet) {
            if (transactionToDelete.type === 'income') {
                wallet.income -= transactionToDelete.amount;
                wallet.balance -= transactionToDelete.amount;
            } else {
                wallet.expenses -= transactionToDelete.amount;
                wallet.balance += transactionToDelete.amount;
            }
            await wallet.save();
        }

        res.json(removedTransaction);
    } catch (err) {
        res.status(400).send(err);
    }
});

module.exports = router;
