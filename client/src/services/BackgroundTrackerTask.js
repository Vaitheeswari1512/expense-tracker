import AsyncStorage from '@react-native-async-storage/async-storage';
import { processAutoTransaction } from '../utils/TransactionProcessor';

export const backgroundTrackerTask = async (taskData) => {
    try {
        console.log("[Headless JS] Received Background Task:", taskData);

        // 1. Get current token/IP from storage (since we aren't in Context)
        const token = await AsyncStorage.getItem('token');
        const user = await AsyncStorage.getItem('user');
        
        const BASE_URL = 'https://expennse-tracker-server.onrender.com/api';

        if (taskData) {
            await processAutoTransaction(
                taskData,
                token,
                BASE_URL,
                null // No addNotification in background (could use native)
            );
        }
        
        return Promise.resolve();
    } catch (e) {
        console.error("[Headless JS] Task error:", e);
        return Promise.reject(e);
    }
};
