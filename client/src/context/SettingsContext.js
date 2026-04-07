import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import { en } from '../constants/translations';
import { AuthContext } from './AuthContext';
import axios from 'axios';
import { Platform, Alert } from 'react-native';
import CryptoJS from 'crypto-js';

let FileSystem = null;
let Sharing = null;
let DocumentPicker = null;
let SecureStore = null;

if (Platform.OS !== 'web') {
    try { FileSystem = require('expo-file-system'); } catch (e) { console.warn('expo-file-system not available', e); }
    try { Sharing = require('expo-sharing'); } catch (e) { console.warn('expo-sharing not available', e); }
    try { DocumentPicker = require('expo-document-picker'); } catch (e) { console.warn('expo-document-picker not available', e); }
    try { SecureStore = require('expo-secure-store'); } catch (e) { console.warn('expo-secure-store not available', e); }
}

export const SettingsContext = createContext();

const i18n = new I18n({ en });
i18n.enableFallback = true;

i18n.locale = 'en';

export const SettingsProvider = ({ children }) => {
    const { token, user, BASE_URL } = useContext(AuthContext);

    const [currency, setCurrency] = useState('USD');
    const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
    const [backupPin, setBackupPinState] = useState(null);
    const [initialBalance, setInitialBalance] = useState(0);
    const [isAppLocked, setIsAppLocked] = useState(false);
    const [lastBackupDate, setLastBackupDate] = useState(null);

    useEffect(() => {
        loadSettings();
    }, []);

    // Reset settings when user logs out or changes
    useEffect(() => {
        if (!token) {
            setCurrency('USD');
            setInitialBalance(0);
            setIsBiometricEnabled(false);
            setBackupPinState(null);
            setIsAppLocked(false);
            setLastBackupDate(null);
        } else {
            loadSettings();
        }
    }, [token]);




    const loadSettings = async () => {
        try {
            const savedCurrency = await AsyncStorage.getItem('currency');
            let savedBiometric = null;
            if (Platform.OS !== 'web' && SecureStore) {
                try {
                    savedBiometric = await SecureStore.getItemAsync('isBiometricEnabled');
                } catch (cryptoErr) {
                    console.log('SecureStore unavailable', cryptoErr);
                }
            }
            if (!savedBiometric) {
                savedBiometric = await AsyncStorage.getItem('isBiometricFallback');
            }
            const savedPin = await AsyncStorage.getItem('backupPin');

            if (savedCurrency) setCurrency(savedCurrency);
            if (savedBiometric) {
                const isEnabled = JSON.parse(savedBiometric);
                setIsBiometricEnabled(isEnabled);
                if (isEnabled && Platform.OS !== 'web') {
                    setIsAppLocked(true);
                }
            }

            if (savedPin) setBackupPinState(savedPin);

            const savedBalance = await AsyncStorage.getItem('initialBalance');
            if (savedBalance) setInitialBalance(Number(savedBalance));
            
            const savedBackupDate = await AsyncStorage.getItem('lastBackupDate');
            if (savedBackupDate) setLastBackupDate(savedBackupDate);
        } catch (e) {
            console.log('Failed to load settings', e);
        }
    };

    const updateInitialBalance = async (amount) => {
        try {
            setInitialBalance(Number(amount));
            await AsyncStorage.setItem('initialBalance', String(amount));

            // Sync with backend if user is logged in
            if (token && user?._id) {
                await fetch(`${BASE_URL}/auth/wallet/${user._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': token
                    },
                    body: JSON.stringify({ balance: Number(amount) })
                });
            }
        } catch (e) {
            console.error('Failed to update initial balance on server:', e);
        }
    };


    const updateCurrency = async (curr) => {
        setCurrency(curr);
        await AsyncStorage.setItem('currency', curr);
    };

    const toggleBiometric = async (value) => {
        if (value) {
            if (Platform.OS !== 'web' && SecureStore) {
                try {
                    await SecureStore.setItemAsync('isBiometricEnabled', JSON.stringify(value));
                } catch (err) {
                    console.log('SecureStore failed, fallback to AsyncStorage', err);
                    await AsyncStorage.setItem('isBiometricFallback', JSON.stringify(value));
                }
            } else {
                await AsyncStorage.setItem('isBiometricFallback', JSON.stringify(value));
            }
        } else {
            if (Platform.OS !== 'web' && SecureStore) {
                try {
                    await SecureStore.deleteItemAsync('isBiometricEnabled');
                } catch (err) { }
            }
            await AsyncStorage.removeItem('isBiometricFallback');
        }
        // Set state only if no exception occurred above
        setIsBiometricEnabled(value);
    };

    const saveBackupPin = async (pin) => {
        setBackupPinState(pin);
        await AsyncStorage.setItem('backupPin', pin);
    };



    const t = (key) => {
        return i18n.t(key);
    };

    const formatCurrency = (amount) => {
        // Simple formatter
        const symbol = currency === 'USD' ? '$' : currency === 'INR' ? '₹' : '€';
        return `${symbol} ${Number(amount).toFixed(2)}`;
    };

    const getEncryptionKey = async () => {
        if (Platform.OS === 'web' || !SecureStore) {
            let key = await AsyncStorage.getItem('backup_encryption_key_web');
            if (!key) {
                key = CryptoJS.lib.WordArray.random(256 / 8).toString();
                await AsyncStorage.setItem('backup_encryption_key_web', key);
            }
            return key;
        }

        let key = await SecureStore.getItemAsync('backup_encryption_key');
        if (!key) {
            key = CryptoJS.lib.WordArray.random(256 / 8).toString();
            await SecureStore.setItemAsync('backup_encryption_key', key);
        }
        return key;
    };

    const backupData = async () => {
        if (!token) return;
        if (Platform.OS === 'web') {
            Alert.alert('Not Available', 'Backup is only available on the mobile app.');
            return;
        }
        try {
            const transactionsRes = await axios.get(`${BASE_URL}/transactions`, { headers: { 'auth-token': token } });

            const fullData = {
                transactions: transactionsRes.data,
                exportedAt: new Date().toISOString(),
                version: '1.0'
            };

            const jsonString = JSON.stringify(fullData);
            const secretKey = await getEncryptionKey();
            const encryptedData = CryptoJS.AES.encrypt(jsonString, secretKey).toString();

            if (FileSystem && Sharing) {
                const fileUri = FileSystem.documentDirectory + 'expense_backup_secure.enc';
                await FileSystem.writeAsStringAsync(fileUri, encryptedData);

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(fileUri);
                } else {
                    Alert.alert('Backup Saved', 'File saved to ' + fileUri);
                }
                
                const backupTime = new Date().toISOString();
                setLastBackupDate(backupTime);
                await AsyncStorage.setItem('lastBackupDate', backupTime);
            }
        } catch (e) {
            console.log(e);
            Alert.alert('Backup Failed', e.message);
        }
    };

    const restoreData = async () => {
        if (Platform.OS === 'web') {
            Alert.alert('Not Available', 'Restore is only available on the mobile app.');
            return;
        }
        try {
            if (!DocumentPicker || !FileSystem) {
                Alert.alert('Not Available', 'File access is not available in this environment.');
                return;
            }
            const result = await DocumentPicker.getDocumentAsync({});
            if (result.canceled) return;

            const fileUri = result.assets[0].uri;
            const encryptedContent = await FileSystem.readAsStringAsync(fileUri);
            const secretKey = await getEncryptionKey();

            const bytes = CryptoJS.AES.decrypt(encryptedContent, secretKey);
            const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

            if (!decryptedString) {
                throw new Error("Decryption failed. Invalid file or key mismatch.");
            }

            const data = JSON.parse(decryptedString);
            
            if (data.transactions) {
                // Restore to local storage
                await AsyncStorage.setItem('transactions', JSON.stringify(data.transactions));
                
                // If backend exists, we could sync it here. 
                // For now, updating local state is enough as screens will refresh on focus.
                
                Alert.alert(t('restore_success'), `Found ${data.transactions.length} transactions. Your data has been restored successfully!`);
            }
        } catch (e) {
            console.log(e);
            Alert.alert(t('restore_failure'), 'Invalid or corrupted backup file');
        }
    };

    const clearAllData = async () => {
        Alert.alert(
            t('clear_data'),
            t('clear_data_confirm'),
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete Everything', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await AsyncStorage.removeItem('transactions');
                            await AsyncStorage.removeItem('initialBalance');
                            setInitialBalance(0);
                            Alert.alert('Success', 'All transaction data has been cleared.');
                        } catch (e) {
                            Alert.alert('Error', 'Failed to clear some data.');
                        }
                    }
                }
            ]
        );
    };

    const fullAppReset = async () => {
        Alert.alert(
            '⚠️ FULL APP RESET',
            'This will delete EVERYTHING (Transactions, Settings, and Profile) and log you out. This is permanent. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'RESET EVERYTHING', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Clear all data from AsyncStorage
                            await AsyncStorage.clear();
                            // If SecureStore exists, clear it too
                            if (Platform.OS !== 'web' && SecureStore) {
                                await SecureStore.deleteItemAsync('isBiometricEnabled');
                                await SecureStore.deleteItemAsync('backup_encryption_key');
                                await SecureStore.deleteItemAsync('backupPin');
                            }
                            
                            Alert.alert('App Reset Successfully', 'The app has been reset to its original state.');
                            
                            // Logout the user (AuthContext will pick up the missing token)
                            if (Platform.OS !== 'web') {
                                // Simple way to force restart/logout is to redirect to Auth
                                // But since we are in context, we can just trigger a state change or wait for AuthContext
                            }
                        } catch (e) {
                            Alert.alert('Reset Failed', 'Something went wrong during the reset.');
                        }
                    }
                }
            ]
        );
    };

    const unlockApp = () => {
        setIsAppLocked(false);
    };

    return (
        <SettingsContext.Provider value={{
            currency,
            isBiometricEnabled,
            backupPin,
            initialBalance,
            isAppLocked,
            unlockApp,
            updateInitialBalance,
            updateCurrency,
            toggleBiometric,
            saveBackupPin,
            t,
            formatCurrency,
            backupData,
            restoreData,
            clearAllData,
            fullAppReset,
            lastBackupDate
        }}>
            {children}
        </SettingsContext.Provider>
    );
};
