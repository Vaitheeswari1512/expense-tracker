import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { Platform, Alert, NativeModules, NativeEventEmitter, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationContext } from './NotificationContext';
import { AuthContext } from './AuthContext';
import { processAutoTransaction } from '../utils/TransactionProcessor';
import AutoTrackerService from '../services/AutoTrackerService';

const { SmsNotificationModule } = NativeModules;
const eventEmitter = new NativeEventEmitter(SmsNotificationModule);

export const AutoTrackerContext = createContext();

export const AutoTrackerProvider = ({ children }) => {
    const [isSmsEnabled, setIsSmsEnabled] = useState(false);
    const [isUpiEnabled, setIsUpiEnabled] = useState(false);
    const [status, setStatus] = useState('ACTIVE');
    const [smsPermission, setSmsPermission] = useState(false);
    const [notificationPermission, setNotificationPermission] = useState(false);
    const [smsDebugInfo, setSmsDebugInfo] = useState(null);
    
    const { addNotification } = useContext(NotificationContext);
    const { token, BASE_URL } = useContext(AuthContext);

    // Track active processing to avoid race conditions
    const processingRef = useRef(new Set());

    // 1. INITIAL LOAD & SETTINGS SYNC
    useEffect(() => {
        const loadSettings = async () => {
            const smsSaved = await AsyncStorage.getItem('isSmsTrackerEnabled');
            const upiSaved = await AsyncStorage.getItem('isUpiTrackerEnabled');
            setIsSmsEnabled(smsSaved === 'true');
            setIsUpiEnabled(upiSaved === 'true');

            const currentStatus = await AutoTrackerService.getStatus();
            setStatus(currentStatus);

            const smsHasPermission = await AutoTrackerService.checkSmsPermission();
            setSmsPermission(smsHasPermission);

            const notificationAccess = await AutoTrackerService.checkPermission();
            setNotificationPermission(notificationAccess);
        };
        loadSettings();
    }, []);

    // 2. UNIFIED SUCCESS HANDLER
    const handleTransactionDetected = useCallback(async (data) => {
        if (!token) return;

        // Prevent rapid re-processing of the SAME internal ID
        if (processingRef.current.has(data.id)) return;
        processingRef.current.add(data.id);

        try {
            AutoTrackerService.log('CONTEXT', `Final processing for ${data.source}: ₹${data.amount}`);
            
            const success = await processAutoTransaction(data, token, BASE_URL, addNotification);
            
            if (success) {
                AutoTrackerService.showConfirmationToast(data);
                AutoTrackerService.log('CONTEXT', 'Transaction successfully saved and notified.');
            }
        } catch (error) {
            AutoTrackerService.log('ERROR', 'Processing failed', error);
        } finally {
            // Remove from processing lock after 10 seconds to allow legit future repeats
            setTimeout(() => processingRef.current.delete(data.id), 10000);
        }
    }, [token, BASE_URL, addNotification]);

    // 3. HARDENED LISTENERS
    useEffect(() => {
        if (Platform.OS !== 'android' || !token) return;

        let smsSub = null;
        let notifSub = null;

        const initializeListeners = async () => {
            if (isSmsEnabled) {
                const permissionGranted = await AutoTrackerService.checkSmsPermission();
                setSmsPermission(permissionGranted);

                if (!permissionGranted) {
                    const granted = await AutoTrackerService.requestSmsPermission();
                    setSmsPermission(granted);
                    if (!granted) {
                        Alert.alert(
                            'SMS Permission Required',
                            'Please allow SMS permission so the app can automatically read bank transaction messages.'
                        );
                        return;
                    }
                }

                smsSub = eventEmitter.addListener('onSmsReceived', async (event) => {
                    if (!isSmsEnabled) return;

                    const sender = event?.sender || 'Unknown Sender';
                    const content = event?.content || '';

                    AutoTrackerService.log('SMS_EVENT', `Received SMS from ${sender}`, content);
                    setSmsDebugInfo({ sender, content, status: 'RECEIVED', timestamp: new Date().toISOString() });

                    const result = AutoTrackerService.analyzeTransaction(content, 'sms');
                    if (result) {
                        setSmsDebugInfo({
                            sender,
                            content,
                            status: 'PARSED',
                            amount: result.amount,
                            type: result.type,
                            merchant: result.merchant,
                            category: result.category,
                            timestamp: new Date().toISOString()
                        });

                        Alert.alert(
                            'SMS Captured',
                            `From ${sender}\n₹${result.amount.toFixed(2)} ${result.type === 'income' ? 'credited' : 'debited'}\n${result.merchant}`
                        );

                        handleTransactionDetected({ ...result, merchant: sender, source: 'sms' });
                    } else {
                        setSmsDebugInfo({ sender, content, status: 'PARSE_FAILED', timestamp: new Date().toISOString() });
                        Alert.alert('SMS Received', `From ${sender}\nCould not parse transaction details.`);
                    }
                });
            }

            notifSub = eventEmitter.addListener('onNotificationReceived', async (event) => {
                if (!isUpiEnabled) {
                    AutoTrackerService.log('UPI', 'Notification ignored (isUpiEnabled=false)');
                    return;
                }

                const { app, content, amount, type, merchant } = event || {};
                if (!amount || !type || !merchant) {
                    AutoTrackerService.log('UPI', 'Incomplete notification payload', event);
                    Alert.alert('UPI Notification', 'Notification received but could not parse the transaction details.');
                    return;
                }

                Alert.alert(
                    'UPI Transaction Detected',
                    `App: ${app}\nMerchant: ${merchant}\n₹${amount} ${type === 'income' ? 'credited' : 'debited'}`
                );

                const transactionData = {
                    amount: Number(amount),
                    type,
                    category: 'UPI',
                    description: `Paid to ${merchant} via ${app}`,
                    date: new Date().toISOString(),
                    source: 'notification',
                    merchant,
                    isAuto: true,
                    id: AutoTrackerService.generateUniqueId(amount, merchant)
                };

                handleTransactionDetected(transactionData);
            });
        };

        initializeListeners();

        return () => {
            smsSub?.remove();
            notifSub?.remove();
        };
    }, [isSmsEnabled, isUpiEnabled, token, BASE_URL, handleTransactionDetected]);

    useEffect(() => {
        const onAppStateChange = async (nextState) => {
            if (nextState === 'active') {
                const notificationAccess = await AutoTrackerService.checkPermission();
                setNotificationPermission(notificationAccess);
                const smsHasPermission = await AutoTrackerService.checkSmsPermission();
                setSmsPermission(smsHasPermission);
            }
        };

        const subscription = AppState.addEventListener('change', onAppStateChange);
        return () => subscription.remove();
    }, []);

    // 4. PERSISTENCE & TOGGLES
    const toggleSmsTracker = async (val) => {
        if (val) {
            const granted = await AutoTrackerService.requestSmsPermission();
            setSmsPermission(granted);
            if (!granted) {
                Alert.alert(
                    'SMS Permission Required',
                    'Automatic SMS tracking requires both READ_SMS and RECEIVE_SMS permissions.'
                );
                return;
            }
        }

        setIsSmsEnabled(val);
        await AsyncStorage.setItem('isSmsTrackerEnabled', val ? 'true' : 'false');
    };

    const toggleUpiTracker = async (val) => {
        if (val) {
            const hasPermission = await AutoTrackerService.checkPermission();
            if (!hasPermission) {
                Alert.alert(
                    "Permission Required",
                    "To scan payment notifications, you need to enable 'Wallet App Notification Listener' in the settings page that opens.",
                    [
                        { text: 'Cancel', onPress: () => setIsUpiEnabled(false), style: 'cancel' },
                        { text: 'Enable Now', onPress: () => {
                            AutoTrackerService.requestPermission();
                            setIsUpiEnabled(true);
                            AsyncStorage.setItem('isUpiTrackerEnabled', 'true');
                            setStatus('ACTIVE');
                        }}
                    ]
                );
                return;
            }
            AutoTrackerService.requestBatteryExemption();
            setStatus('ACTIVE');
        } else {
            setStatus('DISABLED');
        }
        
        setIsUpiEnabled(val);
        await AsyncStorage.setItem('isUpiTrackerEnabled', val ? 'true' : 'false');
    };

    const requestSmsPermission = async () => {
        const granted = await AutoTrackerService.requestSmsPermission();
        setSmsPermission(granted);
        return granted;
    };

    const requestNotificationAccess = () => {
        AutoTrackerService.requestPermission();
    };

    return (
        <AutoTrackerContext.Provider value={{
            isSmsEnabled,
            isUpiEnabled,
            status,
            smsPermission,
            notificationPermission,
            smsDebugInfo,
            toggleSmsTracker,
            toggleUpiTracker,
            requestSmsPermission,
            requestNotificationAccess
        }}>
            {children}
        </AutoTrackerContext.Provider>
    );
};
