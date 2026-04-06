import React, { useState, useContext, useRef, useEffect } from 'react';
import { Text } from '../components/Text';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Platform, Animated, useWindowDimensions, Dimensions } from 'react-native';
import ResponsiveContainer from '../components/ResponsiveContainer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { SettingsContext } from '../context/SettingsContext';
import { ThemeContext } from '../context/ThemeContext';
import { NotificationContext } from '../context/NotificationContext';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS, RESPONSIVE } from '../constants/theme';
import { getCategoryIcon } from '../constants/icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BudgetContext } from '../context/BudgetContext';
import * as Notifications from 'expo-notifications';
import { sendTransactionNotification } from '../utils/notificationService';

const isWeb = Platform.OS === 'web';

const AddTransactionScreen = ({ navigation, route }) => {
    const { width } = useWindowDimensions();
    const isTablet = width > 768;

    const { theme, toggleSidebar } = useContext(ThemeContext);
    const { addNotification } = useContext(NotificationContext);
    const { checkBudgets } = useContext(BudgetContext);
    const { BASE_URL, token } = useContext(AuthContext);

    // Get initial type from route params or default to 'expense'
    const initialType = route.params?.type || 'expense';

    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState(initialType);
    const [topAlertMsg, setTopAlertMsg] = useState('');

    const [loading, setLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    // Fade-in animation
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, []);

    // Reset isSaved when any input changes
    useEffect(() => {
        if (isSaved) setIsSaved(false);
    }, [amount, category, description, type]);

    const handleAdd = async () => {
        if (loading || isSaved) return;

        if (!amount || !category) {
            Alert.alert('Error', 'Please fill in Amount and Category');
            return;
        }

        setLoading(true);

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
                    category,
                    description,
                    type,
                    date: new Date().toISOString()
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || result.message || 'Failed to save transaction');
            }

            // 2. Save to Local Storage (Optional sync for offline reference)
            const existingData = await AsyncStorage.getItem('transactions');
            const transactions = existingData ? JSON.parse(existingData) : [];
            // Use the transaction from backend as it has the real MongoDB _id
            transactions.push(result.transaction);
            await AsyncStorage.setItem('transactions', JSON.stringify(transactions));

            if (type === 'expense') {
                checkBudgets();
            }

            setLoading(false);
            setIsSaved(true);

            setAmount('');
            setCategory('');
            setDescription('');

            const notifTitle = "Transaction Added";
            const notifBody = type === 'income'
                ? `Income of ₹${Number(amount).toLocaleString('en-IN')} added successfully`
                : `Expense of ₹${Number(amount).toLocaleString('en-IN')} added successfully`;

            // 1. In-app notification (bell icon + notification list)
            addNotification(notifTitle, notifBody, type);

            // 2. System-level push notification (mobile top tray)
            sendTransactionNotification(type, Number(amount).toLocaleString('en-IN'), category, notifTitle, notifBody);

            setTopAlertMsg(notifTitle);

            // Wait briefly to show notification, then navigate
            setTimeout(() => {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Wallet' }],
                });
            }, 1200);

        } catch (e) {
            setLoading(false);
            console.error('Save Transaction Error:', e);
            Alert.alert('Error', `Could not save: ${e.message}`);
        }
    };

    const renderHeader = () => (
        <LinearGradient
            colors={[COLORS.gradientStart, '#A56EFF', COLORS.gradientEnd]}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            {/* Decorative elements */}
            <View style={styles.headerCircle1} />
            <View style={styles.headerCircle2} />

            <View style={{ maxWidth: 1200, width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.headerBtn}>
                        <Icon name="menu" size={22} color={COLORS.white} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Add New</Text>
                        <Text style={styles.headerSubtitle}>{type.charAt(0).toUpperCase() + type.slice(1)} Record</Text>
                    </View>
                </View>
                <View style={styles.headerIconCircle}>
                    <Icon name={type === 'income' ? 'arrow-down-circle' : 'arrow-up-circle'} size={22} color={COLORS.white} />
                </View>
            </View>
        </LinearGradient>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <ResponsiveContainer style={{ backgroundColor: theme.colors.background }} useSafeArea={false}>
                {!!topAlertMsg && (
                    <Animated.View style={[styles.topAlert, { borderLeftColor: type === 'income' ? COLORS.income : COLORS.expense }]}>
                        <Icon name="checkmark-circle" size={20} color={type === 'income' ? COLORS.income : COLORS.expense} style={{ marginRight: 8 }} />
                        <Text style={styles.topAlertText}>{topAlertMsg}</Text>
                    </Animated.View>
                )}

                {renderHeader()}

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
                        {/* Type Toggle */}
                        <View style={[styles.toggleWrap, { backgroundColor: theme.colors.card }]}>
                            <TouchableOpacity
                                style={[styles.toggleBtn, type === 'expense' && { backgroundColor: COLORS.expense }]}
                                onPress={() => setType('expense')}
                                activeOpacity={0.9}
                            >
                                <Icon name="trending-down" size={18} color={type === 'expense' ? COLORS.white : COLORS.expense} />
                                <Text style={[styles.toggleText, { color: type === 'expense' ? COLORS.white : theme.colors.subText }]}>Expense</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleBtn, type === 'income' && { backgroundColor: COLORS.income }]}
                                onPress={() => setType('income')}
                                activeOpacity={0.9}
                            >
                                <Icon name="trending-up" size={18} color={type === 'income' ? COLORS.white : COLORS.income} />
                                <Text style={[styles.toggleText, { color: type === 'income' ? COLORS.white : theme.colors.subText }]}>Income</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Amount Input */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.subText }]}>How much?</Text>
                            <View style={[styles.amountContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                                <Text style={[styles.currencyPrefix, { color: theme.colors.text }]}>₹</Text>
                                <TextInput
                                    style={[styles.amountInput, { color: theme.colors.text }]}
                                    placeholder="0.00"
                                    value={amount}
                                    placeholderTextColor={theme.colors.subText}
                                    keyboardType="numeric"
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
                                    editable={true}
                                    selectTextOnFocus={true}
                                />
                            </View>
                        </View>

                        {/* Category List */}
                        <View style={styles.inputGroup}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Text style={[styles.label, { color: theme.colors.subText, marginBottom: 0 }]}>Select Category</Text>
                                {category ? <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: RESPONSIVE.moderateScale(12) }}>{category}</Text> : null}
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 5 }}>
                                {Object.keys(COLORS.categoryColors).map((cat) => {
                                    const isSelected = category === cat;
                                    const catColor = COLORS.categoryColors[cat];
                                    return (
                                        <TouchableOpacity
                                            key={cat}
                                            onPress={() => setCategory(cat)}
                                            style={styles.catItem}
                                            activeOpacity={0.8}
                                        >
                                            <View style={[
                                                styles.catIconWrap,
                                                { backgroundColor: isSelected ? catColor : theme.colors.card, borderColor: isSelected ? catColor : theme.colors.border },
                                                isSelected && SHADOWS.medium
                                            ]}>
                                                {getCategoryIcon(cat, 22, isSelected ? COLORS.white : catColor)}
                                            </View>
                                            <Text style={[
                                                styles.catLabel,
                                                { color: isSelected ? theme.colors.text : theme.colors.subText, fontWeight: isSelected ? '700' : '500' }
                                            ]}>
                                                {cat}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* Description Input */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.subText }]}>Description (Optional)</Text>
                            <View style={[styles.descWrap, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                                <Icon name="document-text-outline" size={18} color={theme.colors.subText} style={{ marginRight: 10 }} />
                                <TextInput
                                    style={[styles.descInput, { color: theme.colors.text }]}
                                    placeholder="Add a note..."
                                    value={description}
                                    placeholderTextColor={theme.colors.subText}
                                    onChangeText={setDescription}
                                    multiline
                                />
                            </View>
                        </View>

                        {/* Action Button */}
                        <TouchableOpacity
                            style={[styles.saveBtn, (loading || isSaved) && { opacity: 0.6 }]}
                            onPress={handleAdd}
                            disabled={loading || isSaved}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                                style={styles.saveBtnGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color={COLORS.white} />
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Icon name="checkmark-circle" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                                        <Text style={styles.saveBtnText}>Save Transaction</Text>
                                    </View>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </ResponsiveContainer>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingTop: isWeb ? RESPONSIVE.hp(2.5) : RESPONSIVE.hp(4.5),
        paddingBottom: RESPONSIVE.hp(1.5),
        paddingHorizontal: RESPONSIVE.wp(5),
        overflow: 'hidden',
    },
    headerCircle1: {
        position: 'absolute', width: 180, height: 180, borderRadius: 90,
        backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -30,
    },
    headerCircle2: {
        position: 'absolute', width: 100, height: 100, borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.04)', bottom: -20, left: 20,
    },
    headerBtn: {
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

    scrollContent: { flexGrow: 1, padding: 0, paddingBottom: 20 },
    formContainer: {
        paddingHorizontal: RESPONSIVE.wp(5),
        paddingTop: 12,
        maxWidth: 700,
        width: '100%',
        alignSelf: 'center',
    },

    // Type Toggle
    toggleWrap: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: 12,
        marginBottom: 12,
        ...SHADOWS.card,
    },
    toggleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 10,
        gap: 6,
    },
    toggleText: { fontWeight: '700' },

    // Input Groups
    inputGroup: { marginBottom: 12 },
    label: { fontWeight: '600', marginBottom: 4, marginLeft: 4, fontSize: RESPONSIVE.moderateScale(12.5) },

    // Amount Input
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: RESPONSIVE.verticalScale(8),
        borderWidth: 1.5,
        ...SHADOWS.card,
    },
    currencyPrefix: { fontSize: RESPONSIVE.moderateScale(22), fontWeight: '700', marginRight: 6 },
    amountInput: {
        flex: 1, fontSize: RESPONSIVE.moderateScale(26), fontWeight: '800',
        letterSpacing: -1, padding: 0,
    },

    // Categories
    catItem: { alignItems: 'center', marginRight: RESPONSIVE.moderateScale(12) },
    catIconWrap: {
        width: RESPONSIVE.moderateScale(44), height: RESPONSIVE.moderateScale(44), borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, marginBottom: 5,
    },
    catLabel: { fontSize: RESPONSIVE.moderateScale(10.5), textAlign: 'center' },

    // Description
    descWrap: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1.5,
        width: '100%',
        marginBottom: 6,
        ...SHADOWS.card,
    },
    descInput: {
        flex: 1, fontWeight: '500',
        lineHeight: 18, padding: 0, minHeight: 36,
    },

    // Save Button
    saveBtn: {
        marginTop: 4,
        borderRadius: 14,
        overflow: 'hidden',
        ...SHADOWS.large,
    },
    saveBtnGradient: {
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnText: { color: COLORS.white, fontWeight: '800', fontSize: RESPONSIVE.moderateScale(15) },

    // Top Alert
    topAlert: {
        position: 'absolute',
        top: 20, left: 20, right: 20,
        backgroundColor: COLORS.white,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 2000,
        ...SHADOWS.large,
        borderLeftWidth: 4,
    },
    topAlertText: { fontWeight: '700', color: COLORS.black },
});

export default AddTransactionScreen;
