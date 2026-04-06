import AsyncStorage from '@react-native-async-storage/async-storage';
import { processAutoTransaction } from '../utils/TransactionProcessor';

export const backgroundTrackerTask = async (taskData) => {
    try {
        console.log("[Headless JS] Received Background Task:", taskData);

        // 1. Get current token/IP from storage (since we aren't in Context)
        const token = await AsyncStorage.getItem('token');
        const user = await AsyncStorage.getItem('user');
        
        // We might also need the BASE_URL
        // The default fallback check in context:
        const BASE_URL = 'http://10.155.41.99:5000/api'; 

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
