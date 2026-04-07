import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { Platform, Alert, NativeModules, NativeEventEmitter, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SmsListener from 'react-native-android-sms-listener';
import { NotificationContext } from './NotificationContext';
import { AuthContext } from './AuthContext';
import { processAutoTransaction } from '../utils/TransactionProcessor';
import AutoTrackerService from '../services/AutoTrackerService';

const { SmsNotificationModule } = NativeModules;
const notificationEventEmitter = SmsNotificationModule
    ? new NativeEventEmitter(SmsNotificationModule)
    : null;

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
    const processingRef = useRef(new Set());

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

    const handleTransactionDetected = useCallback(async (data) => {
        if (!token) return;

        if (processingRef.current.has(data.id)) return;
        processingRef.current.add(data.id);

        try {
            AutoTrackerService.log('CONTEXT', `Final processing for ${data.source}: Rs.${data.amount}`);
            const success = await processAutoTransaction(data, token, BASE_URL, addNotification);

            if (success) {
                AutoTrackerService.showConfirmationToast(data);
                AutoTrackerService.log('CONTEXT', 'Transaction successfully saved and notified.');
            }
        } catch (error) {
            AutoTrackerService.log('ERROR', 'Processing failed', error);
        } finally {
            setTimeout(() => processingRef.current.delete(data.id), 10000);
        }
    }, [token, BASE_URL, addNotification]);

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

                smsSub = SmsListener.addListener(async (event) => {
                    if (!isSmsEnabled) return;

                    const sender = event?.originatingAddress || event?.sender || 'Unknown Sender';
                    const content = event?.body || event?.content || '';

                    AutoTrackerService.log('SMS_EVENT', `Received SMS from ${sender}`, content);
                    setSmsDebugInfo({ sender, content, status: 'RECEIVED', timestamp: new Date().toISOString() });

                    const result = AutoTrackerService.analyzeTransaction(content, 'sms');
                    if (!result) {
                        setSmsDebugInfo({ sender, content, status: 'PARSE_FAILED', timestamp: new Date().toISOString() });
                        return;
                    }

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

                    handleTransactionDetected({
                        ...result,
                        source: 'sms',
                        description: `${sender}: ${result.description}`
                    });
                });
            }

            if (notificationEventEmitter) {
                notifSub = notificationEventEmitter.addListener('onNotificationReceived', async (event) => {
                    if (!isUpiEnabled) {
                        AutoTrackerService.log('UPI', 'Notification ignored (isUpiEnabled=false)');
                        return;
                    }

                    const { app, title, content, amount, type, merchant } = event || {};
                    const combinedText = `${title || ''} ${content || ''}`.trim();
                    const parsed = amount && type
                        ? {
                            amount: Number(amount),
                            type,
                            merchant: merchant || title || app || 'UPI',
                            category: 'UPI',
                            description: content || combinedText || `UPI activity from ${app}`,
                            source: 'notification',
                            isAuto: true
                        }
                        : AutoTrackerService.analyzeTransaction(combinedText, 'notification');

                    if (!parsed) {
                        AutoTrackerService.log('UPI', 'Could not parse notification', event);
                        return;
                    }

                    const resolvedMerchant = AutoTrackerService.cleanMerchantName(
                        merchant || parsed.merchant || title || app || 'UPI'
                    );

                    handleTransactionDetected({
                        ...parsed,
                        amount: Number(parsed.amount),
                        category: parsed.category || 'UPI',
                        merchant: resolvedMerchant,
                        source: 'notification',
                        description: content || parsed.description || `Paid to ${resolvedMerchant} via ${app}`,
                        date: new Date().toISOString(),
                        id: parsed.id || AutoTrackerService.generateUniqueId(parsed.amount, resolvedMerchant),
                        isAuto: true
                    });
                });
            } else if (isUpiEnabled) {
                AutoTrackerService.log('UPI', 'Notification listener native module unavailable');
            }
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
                    'Permission Required',
                    "To scan payment notifications, enable 'Wallet App Notification Listener' in the settings page that opens.",
                    [
                        { text: 'Cancel', onPress: () => setIsUpiEnabled(false), style: 'cancel' },
                        {
                            text: 'Enable Now',
                            onPress: () => {
                                AutoTrackerService.requestPermission();
                                setIsUpiEnabled(true);
                                AsyncStorage.setItem('isUpiTrackerEnabled', 'true');
                                setStatus('ACTIVE');
                            }
                        }
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
