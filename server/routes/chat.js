const express = require('express');
const router = express.Router();
const verifyToken = require('./verifyToken');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const mongoose = require('mongoose');
const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// ── HELPERS & INTENT DETECTION ──────────────────────────────────────────────

const detectIntent = (text) => {
    const msg = text.toLowerCase();
    if (msg.includes('today') || msg.includes('இன்று')) return 'daily_expense';
    if (msg.includes('month') || msg.includes('மாதம்')) return 'monthly_expense';
    if (msg.includes('budget') || msg.includes('பட்ஜெட்')) return 'budget_status';
    if (msg.includes('recent') || msg.includes('கடைசி') || msg.includes('transaction')) return 'recent_transactions';
    if (msg.includes('forecast') || msg.includes('next month') || msg.includes('prediction')) return 'forecast_analysis';
    if (msg.includes('trend') || msg.includes('comparing') || msg.includes('weekly')) return 'weekly_trend';
    if (msg.includes('unusual') || msg.includes('high') || msg.includes('anomaly')) return 'anomaly_check';
    if (msg.includes('tip') || msg.includes('advice') || msg.includes('யோசனை')) return 'savings_tips';
    if (msg.includes('analysis') || msg.includes('chart') || msg.includes('பகுப்பாய்வு')) return 'category_analysis';
    if (msg.includes('add') || msg.includes('செலவு')) return 'add_expense'; 
    return 'general_query';
};

const fetchUserSummary = async (userId) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const todayData = await Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'expense', date: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    // 2. Weekly Comparison (This Week vs Previous Week)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    
    const thisWeekData = await Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'expense', date: { $gte: oneWeekAgo } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const lastWeekData = await Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'expense', date: { $gte: twoWeeksAgo, $lt: oneWeekAgo } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    // 3. Monthly Total & Forecast
    const monthData = await Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'expense', date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const monthlyTotal = monthData[0]?.total || 0;
    const forecastNextMonth = (monthlyTotal / dayOfMonth) * daysInMonth;

    // 4. Top Categories
    const topCatData = await Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'expense', date: { $gte: startOfMonth } } },
        { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 3 }
    ]);
    const topCategories = topCatData.map(c => `${c._id} (₹${c.total})`).join(', ') || "None";

    // 5. Anomaly Detection (Transactions > 3x the average of that category)
    const recentTxData = await Transaction.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({ date: -1 }).limit(10);
    const anomalies = [];
    for (let tx of recentTxData) {
        const catAvg = await Transaction.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), category: tx.category, type: 'expense' } },
            { $group: { _id: null, avg: { $avg: "$amount" } } }
        ]);
        const avg = catAvg[0]?.avg || 0;
        if (tx.amount > avg * 3 && avg > 0) {
            anomalies.push(`High spending of ₹${tx.amount} on ${tx.category}`);
        }
    }

    const user = await User.findById(userId);
    const budgetsData = user?.budgets?.map(b => `${b.category}: Limit ₹${b.limit}`).join(', ') || "No budgets set";

    return {
        todayTotal: todayData[0]?.total || 0,
        thisWeekTotal: thisWeekData[0]?.total || 0,
        lastWeekTotal: lastWeekData[0]?.total || 0,
        monthTotal: monthlyTotal,
        forecast: forecastNextMonth.toFixed(2),
        topCategories: topCategories,
        anomalies: anomalies.length > 0 ? anomalies.join('; ') : "No unusual activity detected",
        budgetsData: budgetsData,
        username: user?.name || "User"
    };
};

/**
 * Parsing for adding expenses (Legacy feature preservation)
 */
const extractDetails = (text) => {
    const amountRegex = /(?:add|செலவு|செலவு செய்|spend|spent|செலவிட்டேன்)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)\s*(?:on|to|for|இல்|க்கு)?\s*([a-zA-Z]+|[\u0B80-\u0BFF]+)/i;
    const match = text.match(amountRegex);
    return match ? { amount: parseFloat(match[1]), category: match[2].trim() } : null;
};

// ── CHAT ENDPOINT ──────────────────────────────────────────────────────────

router.post('/', verifyToken, async (req, res) => {
    const { message } = req.body;
    const userId = req.user.id;

    if (!message) return res.status(400).json({ success: false, reply: "Message is required." });

    try {
        const intent = detectIntent(message);
        const summary = await fetchUserSummary(userId);
        
        // --- 1. RULE-BASED RESPONSES (Low Latency) ---
        
        if (intent === 'add_expense') {
            const details = extractDetails(message);
            if (details) {
                const newTx = new Transaction({ 
                    userId, 
                    amount: details.amount, 
                    category: details.category, 
                    type: 'expense', 
                    description: 'AI Quick Add' 
                });
                await newTx.save();

                // UPDATE WALLET LOGIC FOR AI ADDED TRANSACTION
                const Wallet = require('../models/Wallet');
                const wallet = await Wallet.findOne({ userId });
                if (wallet) {
                    wallet.expenses += details.amount;
                    wallet.balance -= details.amount;
                    await wallet.save();
                }

                return res.json({ success: true, reply: `✅ Added ₹${details.amount} for ${details.category}. Your balance has been updated.` });
            }
        }



        // --- 2. AI-POWERED RESPONSES (Polished Advice) ---
        
        const systemPrompt = `
### IDENTITY
You are "Antigravity," the Intelligent Financial Assistant for this Expense Tracker. You are an expert in accounting, personal budgeting, and Indian financial systems (GST, SIP, etc.).

### DATA CONTEXT (STRICTLY USE THESE NUMBERS)
1. Today's Spending: ₹${summary.todayTotal}
2. This Week Total: ₹${summary.thisWeekTotal}
3. Last Week Total: ₹${summary.lastWeekTotal}
4. Monthly Total: ₹${summary.monthTotal}
5. Next Month Forecast: ₹${summary.forecast}
6. Top Spending (This Month): ${summary.topCategories}
7. User's Budgets: ${summary.budgetsData}
8. Detected Anomalies: ${summary.anomalies}

### OPERATIONAL RULES
1. TONE: Witty, proactive, and data-driven. Reference the week-over-week trends.
2. ANOMALY DETECTION: If anomalies exist, warn the user politely.
3. FORECASTING: When asked "how much will I spend next month?", mention the ₹${summary.forecast} estimate.
4. TREND ANALYSIS: Mention if this week's ₹${summary.thisWeekTotal} is higher or lower than last week's ₹${summary.lastWeekTotal}.
5. ACTIONABILITY: Always end with one specific tip to save money based on their top category.
        `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            max_tokens: 150
        });

        res.json({ success: true, reply: completion.choices[0].message.content });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ success: false, reply: "I can't see your wallet right now. Please check if your cloud database is connected!" });
    }
});

module.exports = router;


module.exports = router;
