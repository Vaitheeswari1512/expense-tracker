import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';

// Configure how notifications behave when the app is in foreground
// Guard against web where expo-notifications is not supported
if (Platform.OS !== 'web') {
    try {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            }),
        });

        // Create channels for Android
        if (Platform.OS === 'android') {
            // Default channel for expense/income notifications
            Notifications.setNotificationChannelAsync('default', {
                name: 'Transactions',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#6C63FF',
            });

            // High-priority channel for budget alerts
            Notifications.setNotificationChannelAsync('budget-alerts', {
                name: 'Budget Alerts',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 300, 200, 300],
                lightColor: '#FF4444',
                sound: 'default',
            });
        }
    } catch (e) {
        console.warn('Notifications setup failed in notificationService:', e);
    }
}

export const requestPermissions = async () => {
    if (Platform.OS === 'web') return false;
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            // Check if we are in a dev environment where this might be expected
            console.log('Notification permissions not granted');
            return false;
        }
        return true;
    } catch (error) {
        console.log("Error requesting notification permissions:", error);
        // Fallback for Expo Go or other environments where this might fail
        return false;
    }
};


// 1. Register for Push Notifications (FCM / Expo Token)
export const registerForPushNotificationsAsync = async () => {
    if (Platform.OS === 'web') return;
    
    const hasPermission = await requestPermissions();
    if (!hasPermission) return null;

    try {
        // Get the Expo Push Token
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: '10a64b5d-ee9c-474b-8526-cc6839950dff' // From app.json
        });
        
        console.log("Expo Push Token:", tokenData.data);
        // In a real production app, you would send this to your backend
        await AsyncStorage.setItem('expo_push_token', tokenData.data);
        return tokenData.data;
    } catch (e) {
        console.log("Error getting push token:", e);
        return null;
    }
};

export const sendTransactionNotification = async (type, amount, category, customTitle, customBody) => {
    if (Platform.OS === 'web') return;
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
        console.log("Notification: Permission denied");
        return;
    }

    const title = customTitle || "Transaction Added";
    const body = customBody || (type === 'income'
        ? `Income of ₹${amount} added successfully`
        : `Expense of ₹${amount} added successfully`);

    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: true,
                priority: 'high',
                ...(Platform.OS === 'android' && { channelId: 'default' }),
            },
            trigger: null,
        });
    } catch (error) {
        console.log("Notification Error:", error);
    }
};

export const sendBudgetAlert = async (level, category, limit) => {
    if (Platform.OS === 'web') return;
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    let title = "Budget Alert";
    let message = "Your budget limit has been exceeded";

    if (level === 50) {
        title = "Budget Usage Info";
        message = "You have used 50% of your budget";
    } else if (level === 80) {
        title = "Budget Warning ⚠️";
        message = "You have used 80% of your budget";
    } else if (level === 100) {
        title = "Budget Exceeded 🚫";
        message = "Your budget limit has been exceeded";
    }

    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body: message,
                sound: true,
                priority: 'max',
                ...(Platform.OS === 'android' && { channelId: 'budget-alerts' }),
            },
            trigger: null,
        });
    } catch (error) {
        console.log("Budget Notification Error:", error);
    }
};

export const testNotification = async () => {
    if (Platform.OS === 'web') return;
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
        Alert.alert("Permission", "Permission denied");
        return;
    }
    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Test Notification 🔔",
            body: "This is a test notification!",
        },
        trigger: null, // Immediate
    });
};
