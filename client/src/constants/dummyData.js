export const DUMMY_TRANSACTIONS = [
    {
        _id: 't1',
        category: 'Food',
        amount: 450.50,
        type: 'expense',
        description: 'Dinner at Italian Place',
        date: new Date().toISOString()
    },
    {
        _id: 't2',
        category: 'Salary',
        amount: 50000.00,
        type: 'income',
        description: 'Monthly Salary',
        date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString()
    },
    {
        _id: 't3',
        category: 'Transport',
        amount: 25.00,
        type: 'expense',
        description: 'Uber to work',
        date: new Date().toISOString()
    },
    {
        _id: 't4',
        category: 'Entertainment',
        amount: 120.00,
        type: 'expense',
        description: 'Movie night',
        date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString()
    },
    {
        _id: 't5',
        category: 'Shopping',
        amount: 1500.00,
        type: 'expense',
        description: 'New shoes',
        date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString()
    }
];

export const DUMMY_CATEGORY_STATS = [
    { name: 'Food', amount: 3500, color: '#FF7675' },
    { name: 'Rent', amount: 15000, color: '#74B9FF' },
    { name: 'Transport', amount: 1200, color: '#55E6C1' },
    { name: 'Entertainment', amount: 800, color: '#A29BFE' },
    { name: 'Utilities', amount: 2100, color: '#FDCB6E' }
];

export const DUMMY_GOALS = [
    {
        _id: 'g1',
        title: 'New Laptop',
        targetAmount: 85000,
        currentAmount: 25000,
        category: 'Gadgets',
        deadline: '2026-06-30'
    },
    {
        _id: 'g2',
        title: 'Vacation',
        targetAmount: 50000,
        currentAmount: 15000,
        category: 'Travel',
        deadline: '2026-12-15'
    }
];
