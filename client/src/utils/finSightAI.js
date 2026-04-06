export const generateFinSightResponse = (userText, financialData) => {
    const { totalIncome, totalExpense, totalBalance, transactions, weeklyTrend, forecast, anomalies } = financialData;
    const lowerInput = userText.toLowerCase();

    const income = Number(totalIncome) || 0;
    const expense = Number(totalExpense) || 0;
    const balance = Number(totalBalance) || 0;
    const savingsRate = income > 0 ? (income - expense) / income : 0;
    const formatCurrencyStr = financialData.formatCurrency || ((amount) => `₹${Number(amount).toLocaleString()}`);

    // Intelligence: Anomaly Warning
    if (anomalies && anomalies.length > 0 && (lowerInput.includes('unusual') || lowerInput.includes('high') || lowerInput.includes('wrong'))) {
        return `⚠️ Anomaly Detected\nI found the following unusual transactions:\n${anomalies.join('\n')}\n\nSmart Advice\n• Check if these were authorized.\n• Review merchant names for unrecognized charges.`;
    }

    // Intelligence: Weekly Trend
    if (lowerInput.includes('trend') || lowerInput.includes('week') || lowerInput.includes('compare')) {
        const trendMsg = weeklyTrend > 1 ? `Spending is up ${((weeklyTrend - 1) * 100).toFixed(1)}% compared to last week.` : `Great job! Your spending is down ${((1 - weeklyTrend) * 100).toFixed(1)}% compared to last week.`;
        return `📊 Weekly Pattern\n${trendMsg}\n\nKey Insight\nMaintaining a stable weekly spend helps prevent month-end budget crunches.\n\nSmart Advice\n• Aim for a 5% reduction next week.`;
    }

    // Intelligence: Forecast
    if (lowerInput.includes('forecast') || lowerInput.includes('next month') || lowerInput.includes('future')) {
        return `🔮 Future Projection\nBased on your current habits, you are estimated to spend ${formatCurrencyStr(forecast)} next month.\n\nSmart Advice\n• Try to set a budget limit below ${formatCurrencyStr(forecast * 0.9)} to increase savings.`;
    }

    // Standard Rule Engine (Updated)
    const getTopCategories = () => {
        const expenseMap = {};
        (transactions || []).filter(t => t.type === 'expense').forEach(t => {
            expenseMap[t.category] = (expenseMap[t.category] || 0) + Number(t.amount);
        });
        const sorted = Object.keys(expenseMap).sort((a, b) => expenseMap[b] - expenseMap[a]);
        return {
            highest: sorted[0] ? { name: sorted[0], amount: expenseMap[sorted[0]], pct: expense > 0 ? ((expenseMap[sorted[0]] / expense) * 100).toFixed(1) : 0 } : null
        };
    };

    const topCat = getTopCategories();

    if (lowerInput.includes('expense') || lowerInput.includes('spend')) {
        const topMsg = topCat.highest ? `Your biggest spender is ${topCat.highest.name} (${topCat.highest.pct}% of total).` : "";
        return `💸 Spending Analysis\nTotal Expenses: ${formatCurrencyStr(expense)}.\n${topMsg}\n\nSmart Advice\n• Focus on reducing ${topCat.highest?.name || 'highest items'} first.`;
    }

    if (lowerInput.includes('save') || lowerInput.includes('budget')) {
        return `💡 Budget Tip\nTarget 20% savings. Currently: ${((savingsRate * 100)).toFixed(1)}%.\n\nSmart Advice\n• Use the 50-30-20 rule.\n• Avoid impulse purchases at ${topCat.highest?.name || 'expensive places'}.`;
    }

    return `👋 Hey! I'm Antigravity.\nI see you've spent ${formatCurrencyStr(expense)} this month. Your estimated spending for next month is ${formatCurrencyStr(forecast)}.\n\nKey Insight\n${weeklyTrend > 1 ? "Your spending is trending upwards." : "You're keeping a stable trend."}\n\nAsk me:\n• "Give me a forecast for next month"\n• "Is my spending unusual?"`;
};
