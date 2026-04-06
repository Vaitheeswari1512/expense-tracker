import React, { useState, useContext, useEffect, useRef } from 'react';
import { Text } from '../components/Text';
import { View, StyleSheet, TouchableOpacity, Image, Alert, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Animated, useWindowDimensions } from 'react-native';
import ResponsiveContainer from '../components/ResponsiveContainer';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS, RESPONSIVE } from '../constants/theme';
import { getCategoryIcon } from '../constants/icons';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { SettingsContext } from '../context/SettingsContext';
import { BudgetContext } from '../context/BudgetContext';
import { NotificationContext } from '../context/NotificationContext';
import { processReceiptImage } from '../utils/ocrService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendTransactionNotification } from '../utils/notificationService';

const isWeb = Platform.OS === 'web';

const ScanReceiptScreen = ({ navigation }) => {
    const { width } = useWindowDimensions();
    const isTablet = width > 768;

    const { theme, toggleSidebar } = useContext(ThemeContext);
    const { formatCurrency } = useContext(SettingsContext);
    const { addNotification } = useContext(NotificationContext);
    const { checkBudgets } = useContext(BudgetContext);
    const { token, BASE_URL } = useContext(AuthContext);

    const [image, setImage] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [scannedData, setScannedData] = useState(null);

    // Extracted Fields state
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('Scanner');
    const [description, setDescription] = useState('Scanned Receipt');
    const [type, setType] = useState('expense');
    const [saving, setSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scrollRef = useRef(null);

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

    const pickImage = async (useCamera = false) => {
        // Request permissions
        if (useCamera) {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera permission is needed to scan receipts.');
                return;
            }
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Gallery permission is needed to upload receipts.');
                return;
            }
        }

        let result;
        try {
            if (useCamera) {
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    quality: 1,
                });
            } else {
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    quality: 1,
                });
            }

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setImage(result.assets[0].uri);
                setScannedData(null);
                processReceipt(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
            console.log(error);
        }
    };

    const processReceipt = async (uri) => {
        setProcessing(true);

        try {
            let detectedCategory = 'Others';
            let extractedAmount = '';

            // Enhanced Check for Secure Context on Web (Self-Fix for Mobile HTTPS requirement)
            if (Platform.OS === 'web' && !window.isSecureContext) {
                console.warn('Camera access may be blocked since this is not an HTTPS connection or localhost on this device.');
            }

            // Try the robust backend OCR service first
            if (BASE_URL && token) {
                try {
                    const formData = new FormData();
                    formData.append('receipt', {
                        uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
                        name: 'receipt.jpg',
                        type: 'image/jpeg',
                    });

                    const response = await fetch(`${BASE_URL}/ocr`, {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'auth-token': token
                        },
                        body: formData
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                            extractedAmount = data.detectedAmount || '';
                            detectedCategory = data.detectedCategory || 'Others';
                        }
                    } else {
                        console.log('Backend OCR error status:', response.status);
                    }
                } catch (netErr) {
                    console.log('Network error connecting to backend OCR:', netErr.message);
                }
            }

            // Fallback to local client OCR if backend missed or if offline/web
            if (!extractedAmount) {
                const { amount, category: localCat } = await processReceiptImage(uri);
                extractedAmount = amount;
                detectedCategory = localCat;
            }

            setIsSaved(false); // Reset saved flag for new scan

            if (extractedAmount && parseFloat(extractedAmount) > 0) {
                const numericAmount = extractedAmount;
                
                // AUTO-UPDATE STATE (Automatic step requested)
                setAmount(numericAmount.toString());
                setDate(new Date().toISOString().split('T')[0]);
                setCategory(detectedCategory); 
                setDescription('Receipt (' + detectedCategory + ') - ' + new Date().toLocaleDateString());
                setType('expense');
                setScannedData(true);
                setProcessing(false);

                // AUTO-EXECUTE SAVE & REDIRECT (Automatic process requested)
                handleAutoSave(numericAmount, detectedCategory);

            } else {
                // If amount is not found, we still show the form so the user can see what was detected
                setAmount('');
                setDate(new Date().toISOString().split('T')[0]);
                setCategory(detectedCategory || 'Others');
                setScannedData(true);
                setProcessing(false);

                if (Platform.OS !== 'web') {
                    Alert.alert(
                        "Scan Results",
                        "No amount detected automatically. You can enter it manually."
                    );
                }
            }
        } catch (e) {
            console.warn('Scan process failed:', e);
            setProcessing(false);
            setScannedData(true);
        }

        setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        }, 500);
    };

    const handleAutoSave = async (amt, cat) => {
        if (isSaved) return; // Prevent duplicate save
        if (!amt || isNaN(amt) || Number(amt) <= 0 || !cat) return;
        
        setSaving(true);
        try {
            // 1. Save to Backend
            const response = await fetch(`${BASE_URL}/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token
                },
                body: JSON.stringify({
                    amount: Number(amt),
                    category: cat,
                    description: 'Auto-saved from Receipt Scanner',
                    type: 'expense',
                    date: new Date().toISOString()
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to auto-save');

            // 2. Save to Local Storage
            const existingData = await AsyncStorage.getItem('transactions');
            const transactions = existingData ? JSON.parse(existingData) : [];
            transactions.push(result.transaction);
            await AsyncStorage.setItem('transactions', JSON.stringify(transactions));

            setIsSaved(true); // Mark as saved
            checkBudgets();

            const notifTitle = "Receipt Saved Automatically";
            const notifBody = `Expense of ₹${Number(amt).toLocaleString('en-IN')} added to ${cat}`;
            
            addNotification(notifTitle, notifBody, 'expense');
            sendTransactionNotification('expense', Number(amt).toLocaleString('en-IN'), cat, notifTitle, notifBody);

            setSaving(false);
            
            setTimeout(() => {
                navigation.navigate('Home');
                setTimeout(() => {
                    navigation.navigate('Statement'); 
                }, 1800);
            }, 500);
        } catch (error) {
            setSaving(false);
            console.error('Auto-save error:', error);
        }
    };

    const handleSave = async () => {
        if (!amount || isNaN(amount) || Number(amount) <= 0) {
            Alert.alert("Invalid Input", "Please enter a valid amount.");
            return;
        }

        setSaving(true);
        try {
            // 1. Save to Backend
            const response = await fetch(`${BASE_URL}/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token
                },
                body: JSON.stringify({
                    amount: Number(amount),
                    category: category,
                    description: description || 'Scanned Receipt',
                    type: 'expense',
                    date: new Date(date).toISOString()
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to save transaction');

            // 2. Save to Local Storage
            const existingData = await AsyncStorage.getItem('transactions');
            const transactions = existingData ? JSON.parse(existingData) : [];
            transactions.push(result.transaction);
            await AsyncStorage.setItem('transactions', JSON.stringify(transactions));

            checkBudgets();

            const notifTitle = "Transaction Saved";
            const notifBody = `Expense of ₹${Number(amount).toLocaleString('en-IN')} added successfully`;
            
            addNotification(notifTitle, notifBody, 'expense');
            sendTransactionNotification('expense', Number(amount).toLocaleString('en-IN'), category, notifTitle, notifBody);

            setSaving(false);
            Alert.alert("Success", "Transaction saved from receipt!");
            navigation.navigate('Wallet');
        } catch (error) {
            setSaving(false);
            Alert.alert("Error", `Failed to save: ${error.message}`);
            console.error(error);
        }
    };

    const renderHeader = () => (
        <LinearGradient
            colors={[COLORS.gradientStart, '#A56EFF', COLORS.gradientEnd]}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <View style={styles.headerCircle1} />
            <View style={styles.headerCircle2} />

            <View style={{ maxWidth: 1200, width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center' }}>
                
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.navBtn}>
                    <Icon name="menu" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Scan Receipt</Text>
                </View>
                <View style={{ flex: 1 }} />
                <View style={styles.headerIconCircle}>
                    <Icon name="scan" size={24} color={COLORS.white} />
                </View>
            </View>
        </LinearGradient>
    );

    return (
        <ResponsiveContainer style={{ backgroundColor: theme.colors.background }} useSafeArea={false}>
            {renderHeader()}

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView 
                    ref={scrollRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim }]}>
                        {/* Receipt Preview */}
                        <View style={[styles.previewCard, { backgroundColor: theme.colors.card }]}>
                            {image ? (
                                <Image source={{ uri: image }} style={styles.receiptImage} />
                            ) : (
                                <View style={styles.receiptPlaceholder}>
                                    <View style={styles.placeholderIconBox}>
                                        <Icon name="receipt" size={60} color={COLORS.primary} />
                                    </View>
                                    <Text style={[styles.placeholderTitle, { color: theme.colors.text }]}>No Receipt Selected</Text>
                                    <Text style={[styles.placeholderSubtitle, { color: theme.colors.subText }]}>Upload or take a photo of your bill to extract transaction data automatically.</Text>
                                </View>
                            )}

                            <View style={styles.actionRow}>
                                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.cardAlt }]} onPress={() => pickImage(true)}>
                                    <Icon name="camera" size={22} color={COLORS.primary} />
                                    <Text style={[styles.actionBtnText, { color: theme.colors.text }]}>Camera</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.cardAlt }]} onPress={() => pickImage(false)}>
                                    <Icon name="images" size={22} color={COLORS.primary} />
                                    <Text style={[styles.actionBtnText, { color: theme.colors.text }]}>Gallery</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Processing Loader */}
                        {processing && (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
                                <Text style={[styles.loadingText, { color: theme.colors.text }]}>Analyzing receipt details...</Text>
                                <Text style={[styles.loadingSubText, { color: theme.colors.subText }]}>Our AI is extracting amount, date, and category</Text>
                            </View>
                        )}

                        {/* Confimation Form */}
                        {scannedData && !processing && (
                            <View style={[styles.formCard, { backgroundColor: theme.colors.card }]}>
                                <View style={styles.formHeader}>
                                    <Icon name="checkmark-done-circle" size={24} color={COLORS.income} />
                                    <Text style={[styles.formTitle, { color: theme.colors.text }]}>Confirm Details</Text>
                                </View>

                                {/* Amount Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: theme.colors.subText }]}>Grand Total</Text>
                                    <View style={[styles.inputContainer, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border }]}>
                                        <Text style={[styles.currencySign, { color: theme.colors.text }]}>₹</Text>
                                        <TextInput
                                            style={[styles.amountInput, { color: theme.colors.text }]}
                                            value={amount}
                                            placeholder="0.00"
                                            placeholderTextColor={theme.colors.subText}
                                            onChangeText={(text) => {
                                                let cleaned = text.replace(/[^0-9.]/g, '');
                                                if (cleaned.length > 1 && cleaned[0] === '0' && cleaned[1] !== '.') {
                                                    cleaned = cleaned.substring(1);
                                                }
                                                const parts = cleaned.split('.');
                                                const final = parts.length > 2 
                                                    ? parts[0] + '.' + parts.slice(1).join('') 
                                                    : cleaned;
                                                setAmount(final);
                                            }}
                                            onFocus={() => {
                                                if (amount === '0') setAmount('');
                                            }}
                                            keyboardType="numeric"
                                            editable={true}
                                            selectTextOnFocus={true}
                                        />
                                    </View>
                                </View>

                                {/* Date Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: theme.colors.subText }]}>Date (YYYY-MM-DD)</Text>
                                    <View style={[styles.inputContainer, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border }]}>
                                        <Icon name="calendar-outline" size={18} color={theme.colors.subText} style={{ marginRight: 10 }} />
                                        <TextInput
                                            style={[styles.textInput, { color: theme.colors.text }]}
                                            value={date}
                                            onChangeText={setDate}
                                            placeholder="YYYY-MM-DD"
                                        />
                                    </View>
                                </View>

                                {/* Category Section */}
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: theme.colors.subText }]}>Detected Category</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                                        {Object.keys(COLORS.categoryColors).map((cat) => {
                                            const isSelected = category === cat;
                                            const catColor = COLORS.categoryColors[cat];
                                            return (
                                                <TouchableOpacity
                                                    key={cat}
                                                    onPress={() => setCategory(cat)}
                                                    style={styles.catItem}
                                                >
                                                    <View style={[
                                                        styles.catIconWrap, 
                                                        { backgroundColor: isSelected ? catColor : theme.colors.cardAlt, borderColor: isSelected ? catColor : theme.colors.border },
                                                        isSelected && SHADOWS.medium
                                                    ]}>
                                                        {getCategoryIcon(cat, 20, isSelected ? COLORS.white : catColor)}
                                                    </View>
                                                    <Text style={[styles.catLabel, { color: isSelected ? theme.colors.text : theme.colors.subText, fontWeight: isSelected ? '700' : '500' }]}>{cat}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>

                                {/* Description */}
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: theme.colors.subText }]}>Description</Text>
                                    <View style={[styles.inputContainer, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border, alignItems: 'flex-start', paddingVertical: 12 }]}>
                                        <TextInput
                                            style={[styles.textInput, { color: theme.colors.text, minHeight: 40 }]}
                                            value={description}
                                            onChangeText={setDescription}
                                            multiline
                                        />
                                    </View>
                                </View>

                                {/* Confirm Button */}
                                <TouchableOpacity 
                                    style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
                                    onPress={handleSave}
                                    disabled={saving}
                                >
                                    <LinearGradient
                                        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                                        style={styles.saveBtnGradient}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    >
                                        {saving ? (
                                            <ActivityIndicator size="small" color={COLORS.white} />
                                        ) : (
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Icon name="save" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                                                <Text style={styles.saveBtnText}>Save Transaction</Text>
                                            </View>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ResponsiveContainer>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingTop: isWeb ? RESPONSIVE.hp(4) : RESPONSIVE.hp(6),
        paddingBottom: RESPONSIVE.hp(3),
        paddingHorizontal: RESPONSIVE.wp(5),
        overflow: 'hidden',
    },
    headerCircle1: {
        position: 'absolute', width: RESPONSIVE.moderateScale(200), height: RESPONSIVE.moderateScale(200), borderRadius: RESPONSIVE.moderateScale(100),
        backgroundColor: 'rgba(255,255,255,0.06)', top: -70, right: -40,
    },
    headerCircle2: {
        position: 'absolute', width: RESPONSIVE.moderateScale(120), height: RESPONSIVE.moderateScale(120), borderRadius: RESPONSIVE.moderateScale(60),
        backgroundColor: 'rgba(255,255,255,0.04)', bottom: -40, left: 20,
    },
    navBtn: {
        width: RESPONSIVE.moderateScale(38), height: RESPONSIVE.moderateScale(38), borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    headerTitle: { color: COLORS.white, fontSize: RESPONSIVE.moderateScale(24), fontWeight: '800', letterSpacing: -0.3 },
    headerSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: RESPONSIVE.moderateScale(14), fontWeight: '500', marginTop: 1 },
    headerIconCircle: {
        width: RESPONSIVE.moderateScale(44), height: RESPONSIVE.moderateScale(44), borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
    },

    scrollContent: { flexGrow: 1, paddingBottom: 40 },
    contentWrapper: { padding: 20, width: '100%', maxWidth: 750, alignSelf: 'center' },

    previewCard: {
        borderRadius: 24, padding: 16, overflow: 'hidden',
        ...SHADOWS.card, marginBottom: 20,
    },
    receiptImage: { width: '100%', height: 300, borderRadius: 16, resizeMode: 'cover' },
    receiptPlaceholder: {
        height: 250, justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 30, textAlign: 'center',
    },
    placeholderIconBox: { width: 100, height: 100, borderRadius: 30, backgroundColor: COLORS.primary + '10', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    placeholderTitle: {  fontWeight: '800', marginBottom: 8 },
    placeholderSubtitle: {  textAlign: 'center', lineHeight: 20 },

    actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 54, borderRadius: 16, gap: 10 },
    actionBtnText: { fontWeight: '700', },

    loadingContainer: { alignItems: 'center', paddingVertical: 40 },
    loadingText: {  fontWeight: '800', marginTop: 16, marginBottom: 6 },
    loadingSubText: {  fontWeight: '500' },

    formCard: {
        borderRadius: 24, padding: 20,
        ...SHADOWS.large, marginBottom: 20,
    },
    formHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    formTitle: {  fontWeight: '800' },

    inputGroup: { marginBottom: 20 },
    label: {  fontWeight: '600', marginBottom: 10, marginLeft: 4 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, height: 56 },
    currencySign: {  fontWeight: '700', marginRight: 10 },
    amountInput: { flex: 1,  fontWeight: '800' },
    textInput: { flex: 1,  fontWeight: '600' },

    catScroll: { paddingVertical: 5 },
    catItem: { alignItems: 'center', marginRight: RESPONSIVE.wp(4) },
    catIconWrap: { width: RESPONSIVE.moderateScale(50), height: RESPONSIVE.moderateScale(50), borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, marginBottom: 6 },
    catLabel: { fontSize: RESPONSIVE.moderateScale(11) },

    saveBtn: { marginTop: 10, borderRadius: 18, overflow: 'hidden', ...SHADOWS.medium },
    saveBtnGradient: { height: RESPONSIVE.verticalScale(58), justifyContent: 'center', alignItems: 'center' },
    saveBtnText: { color: COLORS.white, fontSize: RESPONSIVE.moderateScale(18), fontWeight: '800' },
});

export default ScanReceiptScreen;
