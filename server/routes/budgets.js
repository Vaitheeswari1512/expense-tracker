const router = require('express').Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const verify = require('./verifyToken');
const mongoose = require('mongoose');
const { checkBudgetAndNotify } = require('../services/budgetService');

// Get budgets with spending for the current month
router.get('/', verify, async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).send('User not found');

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        endOfMonth.setHours(23, 59, 59, 999);

        // Aggregate spending for current month
        const spending = await Transaction.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    type: 'expense',
                    date: { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' }
                }
            }
        ]);

        // Convert spending array to map for easier lookup
        const spendingMap = {};
        spending.forEach(item => {
            spendingMap[item._id] = item.total;
        });

        // Current user budgets
        const userBudgets = user.budgets || [];

        // We want to return a list that includes all budgets the user has set, 
        // AND potentially categories where they have spent money even if no budget set (optional, but good for visibility)
        // For this requirement: "Users must be able to set a custom monthly budget limit ... for specific categories"
        // Let's return the merged list. 

        // Use a set of all categories (from budgets and spending) to ensure coverage
        const allCategories = new Set([
            ...userBudgets.map(b => b.category),
            ...Object.keys(spendingMap)
        ]);

        const result = Array.from(allCategories).map(cat => {
            const budget = userBudgets.find(b => b.category === cat);
            return {
                category: cat,
                limit: budget ? budget.limit : 0,
                spent: spendingMap[cat] || 0
            };
        });

        res.json(result);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Update budgets
router.post('/', verify, async (req, res) => {
    try {
        const { budgets } = req.body; // Expect array of { category, limit }
        const userId = req.user._id;

        if (!Array.isArray(budgets)) {
            return res.status(400).send('Invalid data format');
        }

        // We replace the budgets array or merge? 
        // "Users must be able to set a custom monthly budget limit"
        // If they send a full list, we can replace. If partial, merge.
        // Let's assume the frontend sends the critical ones. A simple replace is easier but risky if not all sent.
        // Let's merge: Update existing, add new.

        const user = await User.findById(userId);
        if (!user) return res.status(404).send('User not found');

        // Create a map of existing budgets
        let currentBudgets = user.budgets || [];

        budgets.forEach(newBudget => {
            const index = currentBudgets.findIndex(b => b.category === newBudget.category);
            if (index > -1) {
                currentBudgets[index].limit = Number(newBudget.limit);
            } else {
                currentBudgets.push({
                    category: newBudget.category,
                    limit: Number(newBudget.limit)
                });
            }
        });

        // Filter out any with 0 limit if desired? No, 0 limit is valid (no budget/alert).
        user.budgets = currentBudgets;
        await user.save();

        // Check if any new/updated budget is ALREADY exceeded
        // We only check the ones that were just updated to avoid spamming old ones
        // But for simplicity/robustness, we can check all or just the updated ones.
        // Let's check the ones in the payload.
        for (const budget of budgets) {
            // Pass 0 as amountChanged to verify current status against new limit
            await checkBudgetAndNotify(userId, budget.category, 0);
        }

        res.json({ message: 'Budgets updated', budgets: user.budgets });

    } catch (err) {
        res.status(500).send(err.message);
    }
});

module.exports = router;
