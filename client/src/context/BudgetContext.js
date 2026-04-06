import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendBudgetAlert } from '../utils/notificationService';
import { NotificationContext } from './NotificationContext';
import { COLORS } from '../constants/theme';

export const BudgetContext = createContext();

export const BudgetProvider = ({ children }) => {
    const { addNotification } = useContext(NotificationContext);
    const [budgets, setBudgets] = useState([]);

    const fetchBudgets = useCallback(async () => {
        try {
            const budgetData = await AsyncStorage.getItem('budgets');
            const storedBudgets = budgetData ? JSON.parse(budgetData) : [];
            
            const transactionData = await AsyncStorage.getItem('transactions');
            const transactions = transactionData ? JSON.parse(transactionData) : [];
            
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();

            const allCategories = Object.keys(COLORS.categoryColors);
            const merged = allCategories.map(cat => {
                const stored = storedBudgets.find(b => b.category === cat) || {};
                
                // Calculate spent for current month
                const spent = transactions
                    .filter(t => t.category === cat && t.type === 'expense')
                    .filter(t => {
                        const d = new Date(t.date);
                        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                    })
                    .reduce((sum, t) => sum + Number(t.amount), 0);
                
                return {
                    category: cat,
                    limit: stored.limit || 0,
                    spent: spent,
                    notified50: stored.notified50 || false,
                    notified80: stored.notified80 || false,
                    notified100: stored.notified100 || false
                };
            });

            setBudgets(merged);
            return merged;
        } catch (e) {
            console.error("Error fetching budgets:", e);
            return [];
        }
    }, [COLORS.categoryColors]);

    const updateBudgetLimit = async (category, limit) => {
        try {
            const data = await AsyncStorage.getItem('budgets');
            const stored = data ? JSON.parse(data) : [];
            const index = stored.findIndex(b => b.category === category);
            
            if (index > -1) {
                stored[index].limit = Number(limit);
            } else {
                stored.push({ 
                    category, 
                    limit: Number(limit), 
                    notified50: false, 
                    notified80: false, 
                    notified100: false 
                });
            }
            
            await AsyncStorage.setItem('budgets', JSON.stringify(stored));
            await fetchBudgets();
        } catch (e) {
            console.error("Error updating budget limit:", e);
        }
    };

    const checkBudgets = async () => {
        const latestBudgets = await fetchBudgets();
        
        const updated = latestBudgets.map(b => {
            if (b.limit === 0) return b;
            
            const percentage = (b.spent / b.limit) * 100;
            let n50 = b.notified50;
            let n80 = b.notified80;
            let n100 = b.notified100;

            // Check 100% Level
            if (percentage >= 100 && !b.notified100) {
                sendBudgetAlert(100, b.category, b.limit);
                addNotification("Budget Alert", "Your budget limit has been exceeded", "expense");
                n100 = true;
                n80 = true; // Mark lower levels as notified too if we jump straight to 100
                n50 = true;
            } 
            // Check 80% Level
            else if (percentage >= 80 && !b.notified80) {
                sendBudgetAlert(80, b.category, b.limit);
                addNotification("Budget Warning ⚠️", "You have used 80% of your budget", "expense");
                n80 = true;
                n50 = true;
            }
            // Check 50% Level
            else if (percentage >= 50 && !b.notified50) {
                sendBudgetAlert(50, b.category, b.limit);
                addNotification("Budget Usage Info", "You have used 50% of your budget", "expense");
                n50 = true;
            }
            
            return { ...b, notified50: n50, notified80: n80, notified100: n100 };
        });

        // Persist notification status
        const toStore = updated.map(({category, limit, notified50, notified80, notified100}) => ({
            category, limit, notified50, notified80, notified100
        }));
        await AsyncStorage.setItem('budgets', JSON.stringify(toStore));
        setBudgets(updated);
    };

    const resetBudgets = async () => {
        try {
            const data = await AsyncStorage.getItem('budgets');
            const stored = data ? JSON.parse(data) : [];
            const reset = stored.map(b => ({ 
                ...b, 
                notified50: false, 
                notified80: false, 
                notified100: false 
            }));
            await AsyncStorage.setItem('budgets', JSON.stringify(reset));
            await fetchBudgets();
        } catch (e) {
            console.error("Error resetting budgets:", e);
        }
    };

    useEffect(() => {
        const initBudgets = async () => {
            const lastReset = await AsyncStorage.getItem('last_budget_reset_month');
            const currentMonth = new Date().getMonth().toString();
            
            if (lastReset !== currentMonth) {
                await resetBudgets();
                await AsyncStorage.setItem('last_budget_reset_month', currentMonth);
            } else {
                await fetchBudgets();
            }
        };
        initBudgets();
    }, [fetchBudgets]);

    return (
        <BudgetContext.Provider value={{ budgets, fetchBudgets, updateBudgetLimit, checkBudgets, resetBudgets }}>
            {children}
        </BudgetContext.Provider>
    );
};
