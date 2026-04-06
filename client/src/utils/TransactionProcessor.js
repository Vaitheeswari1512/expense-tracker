import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const processAutoTransaction = async (data, token, BASE_URL, addNotification) => {
    try {
        console.log("[BackgroundProcessor] Transaction Detected:", data);

        // 1. Check for duplicates
        const stored = await AsyncStorage.getItem('transactions');
        let transactions = stored ? JSON.parse(stored) : [];
        
        const isDuplicate = transactions.some(t => 
            t.amount === data.amount && 
            t.description === data.description &&
            Math.abs(new Date(t.date) - new Date(data.date)) < 60000 // Within 1 minute
        );

        if (isDuplicate) {
            console.log("[BackgroundProcessor] Duplicate ignored");
            return false;
        }

        // 2. Local Save
        const newTransaction = {
            _id: 'auto_' + Date.now(),
            amount: data.amount,
            type: data.type,
            category: data.category,
            description: data.description + " (Auto)",
            date: data.date,
            isAuto: true,
            source: data.source
        };

        const updated = [newTransaction, ...transactions];
        await AsyncStorage.setItem('transactions', JSON.stringify(updated));

        // 3. Backend Sync
        if (token && BASE_URL) {
            try {
                await fetch(`${BASE_URL}/transactions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': token
                    },
                    body: JSON.stringify(newTransaction)
                });
            } catch (apiErr) {
                console.log("[BackgroundProcessor] Backend sync failed", apiErr);
            }
        }

        // 4. In-App Notification (only if provided)
        if (addNotification) {
            addNotification(
                "Transaction Detected",
                `${data.type === 'income' ? 'Received' : 'Paid'} ₹${data.amount} via ${data.source}`,
                data.type === 'income' ? 'income' : 'expense'
            );
        }
        
        return true;
    } catch (e) {
        console.error("[BackgroundProcessor] Error:", e);
        return false;
    }
};
