const router = require('express').Router();
const Transaction = require('../models/Transaction');
const verify = require('./verifyToken');
const mongoose = require('mongoose');

// Get spending by category (for Pie Chart)
// Get spending by category (filtered by month/year)
router.get('/category-spending', verify, async (req, res) => {
    try {
        const { year, month, type } = req.query; // Expects year (2024), month (1-12), type ('expense'/'income')

        if (!year || !month) {
            return res.status(400).send("Year and Month are required");
        }

        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
        const txnType = type || 'expense';

        // Use find() instead of aggregate() to ensure consistent casting and date handling
        const transactions = await Transaction.find({
            userId: req.user._id, // Mongoose auto-casts string to ObjectId
            type: txnType,
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const statsMap = {};
        transactions.forEach(t => {
            if (!statsMap[t.category]) {
                statsMap[t.category] = { total: 0, count: 0 };
            }
            statsMap[t.category].total += t.amount;
            statsMap[t.category].count += 1;
        });

        // Format for frontend
        const result = Object.keys(statsMap).map(category => ({
            category,
            total: statsMap[category].total,
            count: statsMap[category].count
        })).sort((a, b) => b.total - a.total); // Sort by highest spending first

        res.json(result);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Get monthly trends (for Line Chart)
router.get('/monthly-trends', verify, async (req, res) => {
    try {
        const stats = await Transaction.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(req.user._id),
                    type: 'expense'
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: '$date' },
                        year: { $year: '$date' }
                    },
                    total: { $sum: '$amount' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Format labels and data
        const labels = stats.map(s => `${s._id.month}/${s._id.year}`);
        const data = stats.map(s => s.total);

        res.json({ labels, datasets: [{ data }] });
    } catch (err) {
        res.status(400).send(err.message);
    }
});

function getRandomColor(seed) {
    // Simple hash to color or random
    // For consistency, let's just return a placeholder, frontend can handle colors better usually.
    // But for chart-kit, it expects color.
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

module.exports = router;
