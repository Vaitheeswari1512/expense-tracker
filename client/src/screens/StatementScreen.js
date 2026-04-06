import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Text } from '../components/Text';
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, useWindowDimensions, Animated } from 'react-native';
import ResponsiveContainer from '../components/ResponsiveContainer';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { SettingsContext } from '../context/SettingsContext';
import { ThemeContext } from '../context/ThemeContext';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS, RESPONSIVE } from '../constants/theme';
import { getCategoryIcon } from '../constants/icons';
import { DUMMY_TRANSACTIONS } from '../constants/dummyData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import AddMenuModal from '../components/AddMenuModal';

const isWeb = Platform.OS === 'web';

// Animated Transaction Card
const TransactionCard = ({ item, formatCurrency, theme, onPress }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const isIncome = item.type === 'income';
    const pressIn = () => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 50 }).start();
    const pressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.colors.card }]}
                onPress={onPress}
                onPressIn={pressIn}
                onPressOut={pressOut}
                activeOpacity={0.92}
            >
                {/* Left accent bar */}
                <View style={[styles.accentBar, { backgroundColor: isIncome ? COLORS.income : COLORS.expense }]} />

                <View style={styles.cardContent}>
                    {/* Icon */}
                    <View style={[styles.iconCircle, {
                        backgroundColor: isIncome ? 'rgba(0,214,143,0.12)' : 'rgba(255,77,109,0.12)'
                    }]}>
                        {getCategoryIcon(item.category || 'Others', 20, isIncome ? COLORS.income : COLORS.expense)}
                    </View>

                    {/* Info */}
                    <View style={styles.cardInfo}>
                        <Text style={[styles.cardCategory, { color: theme.colors.text }]} numberOfLines={1}>
                            {item.category || 'Uncategorized'}
                        </Text>
                        <Text style={[styles.cardDesc, { color: theme.colors.subText }]} numberOfLines={1}>
                            {item.description || 'No description'}
                        </Text>
                        <View style={styles.cardMeta}>
                            <View style={[styles.typeBadge, {
                                backgroundColor: isIncome ? 'rgba(0,214,143,0.12)' : 'rgba(255,77,109,0.12)'
                            }]}>
                                <Icon
                                    name={isIncome ? 'arrow-down-circle' : 'arrow-up-circle'}
                                    size={11}
                                    color={isIncome ? COLORS.income : COLORS.expense}
                                    style={{ marginRight: 3 }}
                                />
                                <Text style={[styles.typeText, { color: isIncome ? COLORS.income : COLORS.expense }]}>
                                    {isIncome ? 'Income' : 'Expense'}
                                </Text>
                            </View>
                            <Text style={[styles.cardDate, { color: theme.colors.subText }]}>
                                {item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Date'}
                            </Text>
                        </View>
                    </View>

                    {/* Amount */}
                    <View style={styles.amountCol}>
                        <Text style={[styles.cardAmount, { color: isIncome ? COLORS.income : COLORS.expense }]}>
                            {isIncome ? '+' : '-'}{formatCurrency(item.amount || 0)}
                        </Text>
                        <Icon name="chevron-forward" size={16} color={theme.colors.subText} style={{ marginTop: 4 }} />
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const StatementScreen = ({ navigation }) => {
    const { width } = useWindowDimensions();
    const isTablet = width > 768;
    const isDesktop = width > 1024;

    const { BASE_URL, token, user } = useContext(AuthContext);
    const { formatCurrency } = useContext(SettingsContext);
    const { theme, toggleSidebar } = useContext(ThemeContext);

    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [totals, setTotals] = useState({ income: 0, expense: 0 });
    const [totalBalance, setTotalBalance] = useState(0);
    const [isAddMenuVisible, setAddMenuVisible] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        let inc = 0, exp = 0;
        if (Array.isArray(filteredTransactions)) {
            filteredTransactions.forEach(t => {
                const amount = Number(t.amount) || 0;
                if (t.type === 'income') inc += amount;
                else exp += amount;
            });
        }
        setTotals({ income: inc, expense: exp });
    }, [filteredTransactions]);

    const fetchTransactions = useCallback(async () => {
        if (!token || !user?._id) return;
        setIsLoading(true);
        setError(null);
        try {
            // 1. Fetch Wallet Balance
            const walletRes = await fetch(`${BASE_URL}/auth/dashboard/${user._id}`, {
                headers: { 'auth-token': token }
            });
            const walletData = await walletRes.json();
            if (walletRes.ok) setTotalBalance(walletData.balance || 0);

            // 2. Fetch Transactions from Backend
            const response = await fetch(`${BASE_URL}/transactions`, {
                headers: { 'auth-token': token }
            });
            const allData = await response.json();

            if (!response.ok) throw new Error(allData.error || 'Failed to fetch');

            if (!Array.isArray(allData)) {
                throw new Error('Invalid response format');
            }

            // 2. Filter by month/year (Local filter for display)
            const filtered = allData.filter(t => {
                if (!t.date) return false;
                const d = new Date(t.date);
                return (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear;
            });

            const sortedData = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            setTransactions(sortedData);
            setFilteredTransactions(sortedData);

            // 3. Cache to AsyncStorage (USER-SPECIFIC KEY)
            await AsyncStorage.setItem(`transactions_${user._id}`, JSON.stringify(allData));
        } catch (e) {
            console.error('Fetch Transactions Error:', e);
            // Fallback to local storage if offline (USER-SPECIFIC KEY)
            const stored = await AsyncStorage.getItem(`transactions_${user._id}`);
            if (stored) {
                const data = JSON.parse(stored).filter(t => {
                    if (!t.date) return false;
                    const d = new Date(t.date);
                    return (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear;
                });
                setFilteredTransactions(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
            } else {
                setError('Unable to load transactions. Check your connection.');
            }
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [BASE_URL, token, selectedMonth, selectedYear]);

    useEffect(() => {
        setTransactions([]);
        setFilteredTransactions([]);
        setTotals({ income: 0, expense: 0 });
        fetchTransactions();
    }, [selectedMonth, selectedYear, fetchTransactions]);

    useFocusEffect(useCallback(() => { fetchTransactions(); }, [fetchTransactions]));

    useEffect(() => {
        let result = transactions;
        if (filter !== 'all') result = result.filter(t => t.type === filter);
        if (search) result = result.filter(t =>
            (t.description || '').toLowerCase().includes(search.toLowerCase()) ||
            (t.category || '').toLowerCase().includes(search.toLowerCase())
        );
        setFilteredTransactions(result);
    }, [filter, search, transactions]);

    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    const prevMonth = () => {
        if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
        else setSelectedMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
        else setSelectedMonth(m => m + 1);
    };

    const handleAutoGenerate = async () => {
        setIsLoading(true);
        try {
            const mockData = [
                { _id: 'mock1_' + Date.now(), type: 'income', amount: 5000, category: 'Salary', description: 'Monthly Salary', date: new Date(selectedYear, selectedMonth - 1, 5).toISOString() },
                { _id: 'mock2_' + Date.now(), type: 'expense', amount: 1000, category: 'Food', description: 'Groceries', date: new Date(selectedYear, selectedMonth - 1, 10).toISOString() },
                { _id: 'mock3_' + Date.now(), type: 'expense', amount: 500, category: 'Entertainment', description: 'Dining Out', date: new Date(selectedYear, selectedMonth - 1, 15).toISOString() },
                { _id: 'mock4_' + Date.now(), type: 'expense', amount: 800, category: 'Shopping', description: 'Utilities', date: new Date(selectedYear, selectedMonth - 1, 20).toISOString() }
            ];
            const key = `transactions_${user._id}`;
            const existingData = await AsyncStorage.getItem(key);
            const existing = existingData ? JSON.parse(existingData) : [];
            await AsyncStorage.setItem(key, JSON.stringify([...mockData, ...existing]));
            fetchTransactions();
            const { Alert } = require('react-native');
            Alert.alert('Done', 'Sample transactions added!');
        } catch (e) { console.log(e); }
        finally { setIsLoading(false); }
    };

    const renderListHeader = () => (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, maxWidth: 1200, alignSelf: 'center', width: '100%' }}>
            {/* Global Balance Card */}
            <LinearGradient
                colors={['#6C63FF', '#A56EFF']}
                style={styles.globalBalanceCard}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={styles.globalBalanceLabel}>TOTAL BALANCE</Text>
                        <Text style={styles.globalBalanceValue}>{formatCurrency(totalBalance)}</Text>
                    </View>
                    <View style={styles.walletIconCircle}>
                        <Icon name="wallet" size={24} color="#fff" />
                    </View>
                </View>
            </LinearGradient>

            {/* Month Nav */}
            <View style={styles.monthNav}>
                <TouchableOpacity style={[styles.monthNavBtn, { backgroundColor: theme.colors.card }]} onPress={prevMonth}>
                    <Icon name="chevron-back" size={20} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={[styles.monthLabel, { color: theme.colors.heading }]}>{monthName}</Text>
                    <Text style={[styles.monthSubLabel, { color: theme.colors.subText }]}>
                        {filteredTransactions.length} transactions
                    </Text>
                </View>
                <TouchableOpacity style={[styles.monthNavBtn, { backgroundColor: theme.colors.card }]} onPress={nextMonth}>
                    <Icon name="chevron-forward" size={20} color={theme.colors.text} />
                </TouchableOpacity>
            </View>

            {/* Totals Row */}
            <View style={styles.totalsRow}>
                <LinearGradient colors={['#00D68F', '#00B4D8']} style={styles.totalCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <View style={styles.totalCardIcon}>
                        <Icon name="arrow-down-circle" size={18} color="rgba(255,255,255,0.8)" />
                    </View>
                    <Text style={styles.totalCardLabel}>Total Income</Text>
                    <Text style={styles.totalCardValue}>{formatCurrency(totals.income)}</Text>
                </LinearGradient>
                <LinearGradient colors={['#FF4D6D', '#FF8C42']} style={styles.totalCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <View style={[styles.totalCardIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <Icon name="arrow-up-circle" size={18} color="rgba(255,255,255,0.8)" />
                    </View>
                    <Text style={styles.totalCardLabel}>Total Expense</Text>
                    <Text style={styles.totalCardValue}>{formatCurrency(totals.expense)}</Text>
                </LinearGradient>
            </View>

            {/* Search */}
            <View style={[styles.searchBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Icon name="search" size={18} color={theme.colors.subText} />
                <TextInput
                    style={[styles.searchInput, { color: theme.colors.text }]}
                    placeholder="Search transactions..."
                    placeholderTextColor={theme.colors.subText}
                    value={search}
                    onChangeText={setSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Icon name="close-circle" size={18} color={theme.colors.subText} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter Pills */}
            <View style={styles.filterPills}>
                {['all', 'income', 'expense'].map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterPill, filter === f && styles.filterPillActive]}
                        onPress={() => setFilter(f)}
                    >
                        {filter === f ? (
                            <LinearGradient
                                colors={f === 'income' ? ['#00D68F', '#00B4D8'] : f === 'expense' ? ['#FF4D6D', '#FF8C42'] : [COLORS.primary, '#A56EFF']}
                                style={styles.filterPillGradient}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            >
                                <Text style={[styles.filterPillText, { color: COLORS.white }]}>
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </Text>
                            </LinearGradient>
                        ) : (
                            <Text style={[styles.filterPillText, { color: theme.colors.subText }]}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </Text>
                        )}
                    </TouchableOpacity>
                ))}
                <TouchableOpacity
                    style={[styles.filterPill, { marginLeft: 'auto', backgroundColor: theme.colors.cardAlt }]}
                    onPress={() => navigation.navigate('Plan')}
                >
                    <Text style={{ color: COLORS.primary,  fontWeight: '700' }}>Set Budget</Text>
                </TouchableOpacity>
            </View>

            {/* Section label */}
            {filteredTransactions.length > 0 && (
                <Text style={[styles.listLabel, { color: theme.colors.subText }]}>
                    Showing {filteredTransactions.length} {filter !== 'all' ? filter : ''} transactions
                </Text>
            )}
        </View>
    );

    return (
        <ResponsiveContainer style={{ backgroundColor: theme.colors.background }} useSafeArea={false}>
            {/* Premium Header */}
            <LinearGradient
                colors={[COLORS.gradientStart, '#A56EFF', COLORS.gradientEnd]}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Circles */}
                <View style={styles.headerCircle1} />
                <View style={styles.headerCircle2} />

                <View style={{ maxWidth: 1200, width: '100%', alignSelf: 'center', paddingHorizontal: 4 }}>
                    <View style={styles.headerTop}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.headerMenuBtn}>
                                <Icon name="menu" size={24} color={COLORS.white} />
                            </TouchableOpacity>
                            <View>
                                <Text style={styles.headerTitle}>Statement</Text>
                                <Text style={styles.headerSubtitle}>Track your transactions</Text>
                            </View>
                        </View>
                        <View style={[styles.headerIconWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                            <Icon name="wallet" size={20} color={COLORS.white} />
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {/* Content */}
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                {isLoading && !refreshing ? (
                    <View style={styles.centerState}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={[styles.centerStateText, { color: theme.colors.subText }]}>Loading transactions...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.centerState}>
                        <Icon name="alert-circle-outline" size={50} color={COLORS.expense} />
                        <Text style={[styles.centerStateText, { color: theme.colors.text }]}>{error}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={fetchTransactions}>
                            <Text style={{ color: COLORS.white, fontWeight: '700' }}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={filteredTransactions}
                        keyExtractor={(item, index) => item._id || index.toString()}
                        renderItem={({ item }) => (
                            <View style={{ paddingHorizontal: 16, maxWidth: 1200, alignSelf: 'center', width: '100%' }}>
                                <TransactionCard
                                    item={item}
                                    formatCurrency={formatCurrency}
                                    theme={theme}
                                    onPress={() => navigation.navigate('EditTransaction', { transaction: item })}
                                />
                            </View>
                        )}
                        ListHeaderComponent={renderListHeader()}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTransactions(); }} tintColor={COLORS.primary} colors={[COLORS.primary]} />
                        }
                        contentContainerStyle={{ paddingBottom: isWeb ? 40 : 100 }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <LinearGradient
                                    colors={[COLORS.primary + '20', COLORS.accent + '10']}
                                    style={styles.emptyIconWrap}
                                >
                                    <Icon name="document-text-outline" size={40} color={COLORS.primary} />
                                </LinearGradient>
                                <Text style={[styles.emptyTitle, { color: theme.colors.heading }]}>No transactions found</Text>
                                <Text style={[styles.emptySubtitle, { color: theme.colors.subText }]}>
                                    {filter !== 'all' ? `No ${filter} transactions for this month.` : 'No transactions for this month.'}
                                </Text>
                                <TouchableOpacity style={styles.generateBtn} onPress={handleAutoGenerate}>
                                    <LinearGradient
                                        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                                        style={styles.generateBtnGradient}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    >
                                        <Icon name="flash" size={16} color={COLORS.white} style={{ marginRight: 8 }} />
                                        <Text style={styles.generateBtnText}>Auto-Generate Sample Data</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                )}
            </Animated.View>

            {/* Add Menu Modal */}
            <AddMenuModal
                visible={isAddMenuVisible}
                onClose={() => setAddMenuVisible(false)}
                navigation={navigation}
                theme={theme}
            />

            {/* Floating Action Button */}
            {!isWeb && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => setAddMenuVisible(true)}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                        style={styles.fabGradient}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    >
                        <Icon name="add" size={30} color={COLORS.white} />
                    </LinearGradient>
                </TouchableOpacity>
            )}
        </ResponsiveContainer>
    );
};

const styles = StyleSheet.create({
    // Header
    header: {
        paddingTop: isWeb ? RESPONSIVE.hp(4) : RESPONSIVE.hp(7),
        paddingBottom: RESPONSIVE.hp(4),
        paddingHorizontal: RESPONSIVE.wp(5),
        position: 'relative', overflow: 'hidden',
    },
    headerCircle1: {
        position: 'absolute', width: 200, height: 200, borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.06)', top: -70, right: -50,
    },
    headerCircle2: {
        position: 'absolute', width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.04)', bottom: -30, left: 30,
    },
    headerTop: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerMenuBtn: {
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    headerTitle: { color: COLORS.white,  fontWeight: '800', letterSpacing: -0.3 },
    headerSubtitle: { color: 'rgba(255,255,255,0.6)',  fontWeight: '500', marginTop: 2 },
    headerIconWrap: {
        width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    },
    // Global Balance Card
    globalBalanceCard: {
        borderRadius: 20, padding: 22, marginTop: 10,
        ...SHADOWS.medium,
    },
    globalBalanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
    globalBalanceValue: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 4 },
    walletIconCircle: {
        width: 48, height: 48, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
    },

    // Month Nav
    monthNav: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginTop: 16, marginBottom: 16,
    },
    monthNavBtn: {
        width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
        ...SHADOWS.card,
    },
    monthLabel: {  fontWeight: '800', letterSpacing: -0.3 },
    monthSubLabel: {  fontWeight: '500', marginTop: 2 },

    // Totals
    totalsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    totalCard: {
        flex: 1, borderRadius: 18, padding: RESPONSIVE.moderateScale(16), overflow: 'hidden',
        ...SHADOWS.medium,
    },
    totalCardIcon: {
        width: RESPONSIVE.moderateScale(34), height: RESPONSIVE.moderateScale(34), borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    },
    totalCardLabel: { color: 'rgba(255,255,255,0.75)', fontSize: RESPONSIVE.moderateScale(12), fontWeight: '600', marginBottom: 4 },
    totalCardValue: { color: COLORS.white, fontSize: RESPONSIVE.moderateScale(20), fontWeight: '800' },

    // Search
    searchBox: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 16, paddingHorizontal: 14, height: 48,
        borderWidth: 1.5, marginBottom: 12,
        ...SHADOWS.card,
    },
    searchInput: { flex: 1, marginLeft: 10,  fontWeight: '500' },

    // Filter Pills
    filterPills: {
        flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap',
    },
    filterPill: {
        borderRadius: 20, overflow: 'hidden',
        paddingHorizontal: 14, paddingVertical: 8,
        backgroundColor: 'transparent',
    },
    filterPillActive: {},
    filterPillGradient: {
        paddingHorizontal: 2, paddingVertical: 2, borderRadius: 20,
    },
    filterPillText: {  fontWeight: '700' },
    listLabel: {  fontWeight: '500', marginBottom: 8 },

    // Card
    card: {
        borderRadius: 18, marginBottom: 10,
        overflow: 'hidden', ...SHADOWS.card,
    },
    accentBar: { width: 4, position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 2 },
    cardContent: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingLeft: 18 },
    iconCircle: {
        width: 44, height: 44, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
    },
    cardInfo: { flex: 1, marginLeft: 12 },
    cardCategory: {  fontWeight: '700', marginBottom: 2 },
    cardDesc: {  marginBottom: 6 },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    typeText: {  fontWeight: '700' },
    cardDate: { },
    amountCol: { alignItems: 'flex-end' },
    cardAmount: {  fontWeight: '800' },

    // States
    centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
    centerStateText: { marginTop: 12, fontSize: RESPONSIVE.moderateScale(16), textAlign: 'center' },
    retryBtn: {
        marginTop: 20, backgroundColor: COLORS.primary,
        paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14,
    },
    emptyState: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 30 },
    emptyIconWrap: {
        width: RESPONSIVE.moderateScale(80), height: RESPONSIVE.moderateScale(80), borderRadius: 24,
        justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    emptyTitle: { fontSize: RESPONSIVE.moderateScale(20), fontWeight: '800', marginBottom: 8 },
    emptySubtitle: { fontSize: RESPONSIVE.moderateScale(14), textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    generateBtn: { borderRadius: 14, overflow: 'hidden', ...SHADOWS.light },
    generateBtnGradient: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 13,
    },
    generateBtnText: { color: COLORS.white, fontWeight: '700', },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        ...SHADOWS.large,
        elevation: 8,
    },
    fabGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 30,
    },
});

export default StatementScreen;
