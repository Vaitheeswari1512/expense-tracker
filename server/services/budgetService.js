const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// Service to check budget limits and trigger notifications
const checkBudgetAndNotify = async (userId, category, amountChanged = 0, dateStr = new Date()) => {
    try {
        const user = await User.findById(userId);
        if (!user || !user.budgets) return;

        const budget = user.budgets.find(b => b.category === category);
        // If no budget set, or limit is invalid, skip
        if (!budget || typeof budget.limit !== 'number' || budget.limit <= 0) return;

        const limit = budget.limit;
        const date = new Date(dateStr);

        // Determine Start/End of Month for the transaction date
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

        // Aggregate total expenses for this category in this month
        const stats = await Transaction.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    category: category,
                    type: 'expense',
                    date: { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);

        // Round to 2 decimal places to avoid floating point issues
        const rawTotal = stats.length > 0 ? stats[0].total : 0;
        const currentTotal = Math.round(rawTotal * 100) / 100;

        // previousTotal logic:
        // If amountChanged > 0 (New Transaction): currentTotal includes it, so subtract to get previous state.
        // If amountChanged == 0 (Budget Update): currentTotal is valid, previous effectively same as current for threshold purpose, 
        // but we treat it as a static check.
        const previousTotal = currentTotal - amountChanged;

        let notifTitle = '';
        let notifMessage = '';
        let notifType = 'info';

        // Check Logic
        let shouldNotify = false;

        if (currentTotal >= limit) {
            notifTitle = 'Budget Exceeded';
            notifMessage = `You have exceeded your ${category} budget of ₹${limit}. Current spending: ₹${currentTotal}.`;
            notifType = 'alert';
            shouldNotify = true;
        } else if (currentTotal === limit) {
            notifTitle = 'Budget Reached';
            notifMessage = `Your ${category} budget of ₹${limit} has been reached. Drive carefully!`;
            notifType = 'warning';
            shouldNotify = true;
        } else if (currentTotal >= (limit * 0.5) && previousTotal < (limit * 0.5)) {
            notifTitle = 'Budget Warning (50%)';
            notifMessage = `You have used 50% of your ${category} budget (₹${currentTotal} of ₹${limit}).`;
            notifType = 'info';
            shouldNotify = true;
        }

        if (shouldNotify && notifTitle) {
            // DUPLICATE PREVENTION
            // Check if a similar notification already exists for this month/category/limit/type
            // We search for notifications created this month for this category and specific type ('warning' or 'alert')
            // To be even more robust, we check if one exists for the specific LIMIT too, to allow notifying if limit changes.

            // Define time range for duplicate check (e.g. current month)
            // If I exceeded budget in Jan, and I'm viewing in Feb, I don't care about Jan notification duplicate check.
            // But notifications are usually relevant to the *current* budget cycle.
            // Let's check for notifications created *since start of this month*.

            const existing = await Notification.findOne({
                userId: userId,
                category: category,
                type: notifType,
                // Optional: Check limit to allow new notification if limit changed? 
                // User said "Prevent duplicate notifications for the same limit".
                // So if limit is same, don't notify.
                limit: limit,
                createdAt: { $gte: startOfMonth }
            });

            if (!existing) {
                const notification = new Notification({
                    userId,
                    category,
                    limit, // Save limit to help with future duplicate checks
                    title: notifTitle,
                    message: notifMessage,
                    type: notifType,
                    read: false
                });
                await notification.save();
                // console.log(`Notification created: ${notifTitle}`);
            } else {
                // console.log('Duplicate notification prevented.');
            }
        }

    } catch (err) {
        console.error('Budget check error:', err);
    }
};

module.exports = { checkBudgetAndNotify };
