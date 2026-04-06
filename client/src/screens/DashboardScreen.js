import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Text } from '../components/Text';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ScrollView, useWindowDimensions, Modal, TextInput, Platform, Animated } from 'react-native';
import ResponsiveContainer from '../components/ResponsiveContainer';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { SettingsContext } from '../context/SettingsContext';
import { NotificationContext } from '../context/NotificationContext';
import { BudgetContext } from '../context/BudgetContext';
import { AutoTrackerContext } from '../context/AutoTrackerContext';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { typography } from '../theme/typography';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS, RESPONSIVE } from '../constants/theme';
import { getCategoryIcon } from '../constants/icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AddMenuModal from '../components/AddMenuModal';
import { DUMMY_TRANSACTIONS } from '../constants/dummyData';

const isWeb = Platform.OS === 'web';

// ── Animated Summary Card ──────────────────────────────────────────────────────
const SummaryCard = ({ label, value, icon, gradientColors, trend, trendLabel, onPress }) => {
    const { width } = useWindowDimensions();
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const press = () => { if (onPress) onPress(); };
    const pressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
    const pressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

    return (
        <Animated.View style={[{ transform: [{ scale: scaleAnim }], width: width < 420 ? '100%' : '48%' }, styles.summaryCardWrap]}>
            <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={press} 
                onPressIn={pressIn} 
                onPressOut={pressOut}
                style={{ width: '100%' }}
            >
                <LinearGradient
                    colors={gradientColors}
                    style={[styles.summaryCard, { width: '100%' }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.summaryCardTop}>
                        <View style={styles.summaryIconWrap}>
                            <Icon name={icon} size={22} color="rgba(255,255,255,0.9)" />
                        </View>
                        {trend !== undefined && (
                            <View style={[styles.trendBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                <Icon name={trend >= 0 ? 'trending-up' : 'trending-down'} size={12} color="rgba(255,255,255,0.95)" />
                                <Text style={styles.trendBadgeText}>{Math.abs(trend).toFixed(0)}%</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.summaryLabel, typography.subHeading]} numberOfLines={1}>{label}</Text>
                    <Text style={[styles.summaryValue, typography.heading, { fontSize: 20 }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
                    {trendLabel ? <Text style={[styles.summarySubLabel, typography.caption]} numberOfLines={1}>{trendLabel}</Text> : null}
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

// ── Transaction Row ────────────────────────────────────────────────────────────
const TransactionRow = ({ item, formatCurrency, theme }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const isIncome = item.type === 'income';
    const pressIn = () => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 50 }).start();
    const pressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={[styles.transRow, { backgroundColor: theme.colors.card }]}
                onPressIn={pressIn}
                onPressOut={pressOut}
                activeOpacity={0.9}
            >
                <View style={[styles.transIconCircle, {
                    backgroundColor: isIncome ? 'rgba(0, 214, 143, 0.12)' : 'rgba(255, 77, 109, 0.12)'
                }]}>
                    {getCategoryIcon(item.category, 20, isIncome ? COLORS.income : COLORS.expense)}
                </View>
                <View style={styles.transInfo}>
                    <Text style={[styles.transCat, { color: theme.colors.text }]} numberOfLines={1}>{item.category}</Text>
                    <Text style={[styles.transDesc, { color: theme.colors.subText }]} numberOfLines={1}>
                        {item.description || 'No description'}
                    </Text>
                </View>
                <View style={styles.transRight}>
                    <View style={[styles.amountBadge, {
                        backgroundColor: isIncome ? 'rgba(0, 214, 143, 0.1)' : 'rgba(255, 77, 109, 0.1)'
                    }]}>
                        <Text style={[styles.transAmount, { color: isIncome ? COLORS.income : COLORS.expense }]}>
                            {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
                        </Text>
                    </View>
                    <Text style={[styles.transDate, { color: theme.colors.subText }]}>
                        {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// ── Main Dashboard Screen ──────────────────────────────────────────────────────
const DashboardScreen = ({ navigation }) => {
    const { width } = useWindowDimensions();
    const isTablet = width > 768;
    const isDesktop = width > 1024;

    const { BASE_URL: apiBaseUrl, token, user } = useContext(AuthContext) || {};
    const { formatCurrency, initialBalance, updateInitialBalance } = useContext(SettingsContext);
    const { unreadCount, fetchNotifications: fetchNotifs } = useContext(NotificationContext);
    const { theme, toggleSidebar, isDarkMode } = useContext(ThemeContext);
    const { isEnabled: isAutoTrackerEnabled } = useContext(AutoTrackerContext);

    const [transactions, setTransactions] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState('expense');

    // Balance modal
    const [isBalanceModalVisible, setBalanceModalVisible] = useState(false);
    const [tempBalance, setTempBalance] = useState('');

    // AI Chat

    // Stats
    const [totalBalance, setTotalBalance] = useState(0);
    const [totalIncome, setTotalIncome] = useState(0);
    const [totalExpense, setTotalExpense] = useState(0);
    const [todayExpense, setTodayExpense] = useState(0);
    const [categoryStats, setCategoryStats] = useState([]);
    const [isAddMenuVisible, setAddMenuVisible] = useState(false);

    // Fade-in animation
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    const fetchTransactions = useCallback(async () => {
        if (!token || !user?._id) return;
        setRefreshing(true);
        try {
            // 1. Fetch Summary Data (Income, Expenses, Balance)
            const dashboardRes = await fetch(`${apiBaseUrl}/auth/dashboard/${user._id}`, {
                headers: { 'auth-token': token }
            });
            const dashboardData = await dashboardRes.json();
            
            if (dashboardRes.ok) {
                setTotalIncome(dashboardData.income || 0);
                setTotalExpense(dashboardData.expenses || 0);
                setTotalBalance(dashboardData.balance || 0);
            }

            // 2. Fetch Recent Transactions
            const transRes = await fetch(`${apiBaseUrl}/transactions?limit=20`, {
                headers: { 'auth-token': token }
            });
            const transData = await transRes.json();

            if (transRes.ok) {
                setTransactions(transData);
                // Also update local storage for offline view (USER-SPECIFIC KEY)
                await AsyncStorage.setItem(`transactions_${user._id}`, JSON.stringify(transData));
            }
        } catch (e) {
            console.log('Dashboard Fetch Error:', e);
            // Fallback to local storage (USER-SPECIFIC KEY)
            const localData = await AsyncStorage.getItem(`transactions_${user._id}`);
            if (localData) {
                const parsed = JSON.parse(localData);
                setTransactions(parsed);
            }
        } finally {
            setRefreshing(false);
        }
    }, [token, user, apiBaseUrl]);

    useFocusEffect(
        useCallback(() => {
            fetchTransactions();
            if (fetchNotifs) fetchNotifs();
        }, [fetchTransactions, fetchNotifs])
    );

    const calculateStats = (data) => {
        let currentTodayExp = 0;
        const today = new Date();
        const todayStr = today.toDateString();

        data.forEach(t => {
            const date = new Date(t.date);
            const val = Number(t.amount) || 0;
            if (t.type === 'expense') {
                if (date.toDateString() === todayStr) currentTodayExp += val;
            }
        });

        setTodayExpense(currentTodayExp);
    };

    useEffect(() => {
        const catMap = {};
        const today = new Date();
        transactions.forEach(t => {
            const date = new Date(t.date);
            if (t.type === viewMode && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
                catMap[t.category] = (catMap[t.category] || 0) + (Number(t.amount) || 0);
            }
        });
        const sortedCats = Object.keys(catMap).map(key => ({
            name: key,
            amount: catMap[key],
            color: COLORS.categoryColors[key] || '#78909C'
        })).sort((a, b) => b.amount - a.amount).slice(0, 5);
        setCategoryStats(sortedCats);
    }, [viewMode, transactions]);

    useEffect(() => { 
        if (transactions.length > 0) calculateStats(transactions); 
    }, [transactions]);

    const handleSaveBalance = async () => {
        if (!isNaN(tempBalance)) {
            await updateInitialBalance(tempBalance);
            fetchTransactions();
        }
        setBalanceModalVisible(false);
    };

    const onRefresh = () => { setRefreshing(true); fetchTransactions(); };
    // 🔥 4. Get user from Context: const { user } = useAuth();
    const userName = user?.name ? user.name.charAt(0).toUpperCase() + user.name.slice(1).toLowerCase() : 'User';
    const incomePercent = (totalIncome + totalExpense) > 0 ? (totalIncome / (totalIncome + totalExpense)) * 100 : 0;
    const expensePercent = (totalIncome + totalExpense) > 0 ? (totalExpense / (totalIncome + totalExpense)) * 100 : 0;

    // ── Render Header ────────────────────────────────────────────────────────
    const renderTopNav = () => (
        <View style={styles.topNav}>
            <View style={styles.topNavLeft}>
                <TouchableOpacity 
                    style={[styles.menuBtn, { backgroundColor: theme.colors.card }]} 
                    onPress={() => navigation.openDrawer()}
                >
                    <Icon name="menu" size={22} color={theme.colors.text} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.greetSmall, { color: theme.colors.subText }]}>Good {getTimeOfDay()} 👋</Text>
                    <Text style={[styles.greetName, { color: theme.colors.heading }]}>{userName}</Text>
                </View>
            </View>
            <View style={styles.topNavRight}>
                <TouchableOpacity
                    style={[styles.navIconBtn, { backgroundColor: theme.colors.card }]}
                    onPress={() => navigation.navigate('Notifications')}
                >
                    <Icon name="notifications-outline" size={20} color={theme.colors.text} />
                    {unreadCount > 0 && (
                        <View style={styles.notifBadge}>
                            <Text style={styles.notifBadgeText}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.avatarBtn, { backgroundColor: COLORS.primary + '20' }]}
                    onPress={() => navigation.navigate('ProfileDetails')}
                >
                    <Text style={[styles.avatarText, { color: COLORS.primary }]}>
                        {userName.charAt(0).toUpperCase()}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.navIconBtn, { backgroundColor: COLORS.primary, marginLeft: 2 }]}
                    onPress={() => setAddMenuVisible(true)}
                >
                    <Icon name="add" size={24} color={COLORS.white} />
                </TouchableOpacity>
            </View>
        </View>
    );

    // ── Hero Balance Card ────────────────────────────────────────────────────
    const renderHeroCard = () => (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => { setTempBalance(String(totalBalance)); setBalanceModalVisible(true); }}
        >
            <LinearGradient
                colors={[COLORS.gradientStart, '#A56EFF', COLORS.gradientEnd]}
                style={styles.heroCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Decorative circles */}
                <View style={styles.heroCircle1} />
                <View style={styles.heroCircle2} />

                <View style={styles.heroTop}>
                    <View>
                        <Text style={[styles.heroLabel, typography.subHeading]}>Total Balance</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                            <Icon name="pencil" size={11} color="rgba(255,255,255,0.6)" style={{ marginRight: 4 }} />
                            <Text style={{ color: 'rgba(255,255,255,0.6)', }}>Tap to edit</Text>
                        </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <View style={[styles.heroTrendBadge, { backgroundColor: totalBalance >= 0 ? 'rgba(0,214,143,0.25)' : 'rgba(255,77,109,0.25)' }]}>
                            <Icon name={totalBalance >= 0 ? 'trending-up' : 'trending-down'} size={14} color={totalBalance >= 0 ? '#00D68F' : '#FF4D6D'} />
                            <Text style={{ color: totalBalance >= 0 ? '#00D68F' : '#FF4D6D',  fontWeight: '700', marginLeft: 4 }}>
                                {totalBalance >= 0 ? 'Positive' : 'Negative'}
                            </Text>
                        </View>
                        {isAutoTrackerEnabled && (
                            <View style={styles.syncBadge}>
                                <View style={styles.syncDot} />
                                <Text style={styles.syncText}>Smart Sync Active</Text>
                            </View>
                        )}
                    </View>
                </View>

                <Text style={[styles.heroAmount, typography.heading, { fontSize: 32 }]} numberOfLines={1} adjustsFontSizeToFit>
                    {formatCurrency(totalBalance)}
                </Text>

                <View style={styles.heroBottomRow}>
                    <View style={styles.heroStatItem}>
                        <View style={styles.heroStatIcon}>
                            <Icon name="arrow-down" size={14} color="#00D68F" />
                        </View>
                        <View>
                            <Text style={[styles.heroStatLabel, typography.body]}>Income</Text>
                            <Text style={[styles.heroStatValue, typography.subHeading]}>{formatCurrency(totalIncome)}</Text>
                        </View>
                    </View>
                    <View style={styles.heroStatItem}>
                        <View style={[styles.heroStatIcon, { backgroundColor: 'rgba(255,77,109,0.25)' }]}>
                            <Icon name="arrow-up" size={14} color="#FF4D6D" />
                        </View>
                        <View>
                            <Text style={[styles.heroStatLabel, typography.body]}>Expenses</Text>
                            <Text style={[styles.heroStatValue, typography.subHeading]}>{formatCurrency(totalExpense)}</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );

    // ── Summary Cards Row ────────────────────────────────────────────────────
    const renderSummaryRow = () => (
        <View style={[styles.summaryRow, { flexDirection: width < 420 ? 'column' : 'row' }]}>
            <SummaryCard
                label="Today's Spend"
                value={formatCurrency(todayExpense)}
                icon="today-outline"
                gradientColors={['#FF4D6D', '#FF8C42']}
                trend={0}
                trendLabel="today"
            />
            <SummaryCard
                label="Monthly Income"
                value={formatCurrency(totalIncome)}
                icon="trending-up-outline"
                gradientColors={['#00D68F', '#00B4D8']}
                trend={0}
                trendLabel="this month"
            />
            <SummaryCard
                label="Monthly Spend"
                value={formatCurrency(totalExpense)}
                icon="cart-outline"
                gradientColors={['#A56EFF', '#6C63FF']}
                trend={0}
                trendLabel={`${expensePercent.toFixed(0)}% of income`}
            />
        </View>
    );

    // ── Progress Bar ─────────────────────────────────────────────────────────
    const renderProgressSection = () => (
        <View style={[styles.progressCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionHeading, { color: theme.colors.heading }]}>Monthly Overview</Text>
            <View style={{ marginTop: 16 }}>
                <View style={styles.progressLabelRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.dot, { backgroundColor: COLORS.income }]} />
                        <Text style={[styles.progressLabel, { color: theme.colors.subText }]}>Income</Text>
                    </View>
                    <Text style={[styles.progressValue, { color: theme.colors.text }]}>{formatCurrency(totalIncome)}</Text>
                </View>
                <View style={styles.trackBg}>
                    <LinearGradient
                        colors={['#00D68F', '#00B4D8']}
                        style={[styles.trackFill, { width: `${Math.min(incomePercent, 100)}%` }]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    />
                </View>
            </View>
            <View style={{ marginTop: 12 }}>
                <View style={styles.progressLabelRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.dot, { backgroundColor: COLORS.expense }]} />
                        <Text style={[styles.progressLabel, { color: theme.colors.subText }]}>Expenses</Text>
                    </View>
                    <Text style={[styles.progressValue, { color: theme.colors.text }]}>{formatCurrency(totalExpense)}</Text>
                </View>
                <View style={styles.trackBg}>
                    <LinearGradient
                        colors={['#FF4D6D', '#FF8C42']}
                        style={[styles.trackFill, { width: `${Math.min(expensePercent, 100)}%` }]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    />
                </View>
            </View>
        </View>
    );

    // ── Category Toggle + List ───────────────────────────────────────────────
    const renderCategorySection = () => {
        const numColumns = isDesktop ? 5 : isTablet ? 4 : 3;
        const itemWidth = (Math.min(width > 768 ? width - 264 : width, 1200) - 60) / numColumns;

        return (
            <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionHeading, { color: theme.colors.heading }]}>
                        Top {viewMode === 'income' ? 'Sources' : 'Categories'}
                    </Text>
                    <View style={[styles.togglePill, { backgroundColor: theme.colors.cardAlt }]}>
                        <TouchableOpacity
                            style={[styles.pillBtn, viewMode === 'expense' && styles.pillBtnActive]}
                            onPress={() => setViewMode('expense')}
                        >
                            <Text style={[styles.pillText, { color: viewMode === 'expense' ? COLORS.white : theme.colors.subText }]}>Expenses</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.pillBtn, viewMode === 'income' && styles.pillBtnActive]}
                            onPress={() => setViewMode('income')}
                        >
                            <Text style={[styles.pillText, { color: viewMode === 'income' ? COLORS.white : theme.colors.subText }]}>Income</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                    {categoryStats.map((item, index) => (
                        <View key={index} style={[styles.catCard, { backgroundColor: theme.colors.card, width: itemWidth - 5 }]}>
                            <View style={[styles.catIconCircle, { backgroundColor: item.color + '20' }]}>
                                {getCategoryIcon(item.name, 18, item.color)}
                            </View>
                            <Text style={[styles.catCardName, { color: theme.colors.text }]} numberOfLines={1}>{item.name}</Text>
                            <Text style={[styles.catCardAmount, { color: item.color }]} numberOfLines={1}>{formatCurrency(item.amount)}</Text>
                        </View>
                    ))}
                    {categoryStats.length === 0 && (
                        <Text style={{ color: theme.colors.subText, padding: 16 }}>No data for this period.</Text>
                    )}
                </View>
            </View>
        );
    };


    // ── Render item wrapper ──────────────────────────────────────────────────
    const renderTransactionItem = ({ item }) => (
        <TransactionRow item={item} formatCurrency={formatCurrency} theme={theme} />
    );

    return (
        <ResponsiveContainer style={{ backgroundColor: theme.colors.background }} useSafeArea={true}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} translucent />
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <FlatList
                    data={transactions.slice(0, 6)}
                    ListHeaderComponent={
                        <View style={{ maxWidth: 1200, width: '100%', alignSelf: 'center', paddingBottom: isWeb ? 20 : 90 }}>
                            {/* Top Nav */}
                            {renderTopNav()}

                            {/* Hero Balance Card */}
                            <View style={styles.heroPad}>
                                {renderHeroCard()}
                            </View>

                            {/* Summary Cards */}
                            {renderSummaryRow()}

                            {/* Progress Section */}
                            <View style={styles.padHoriz}>
                                {renderProgressSection()}
                            </View>

                            {/* Category Section */}
                            <View style={styles.padHoriz}>
                                {renderCategorySection()}
                            </View>


                            {/* Recent Transactions Header */}
                            <View style={[styles.sectionHeaderRow, styles.padHoriz, { marginTop: 24 }]}>
                                <Text style={[styles.sectionHeading, { color: theme.colors.heading }]}>Recent Transactions</Text>
                                <TouchableOpacity
                                    style={[styles.seeAllBtn, { backgroundColor: COLORS.primary + '15' }]}
                                    onPress={() => navigation.navigate('Statement')}
                                >
                                    <Text style={{ color: COLORS.primary, fontWeight: '700', }}>See All</Text>
                                    <Icon name="chevron-forward" size={14} color={COLORS.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={[styles.padHoriz, { maxWidth: 1200, alignSelf: 'center', width: '100%' }]}>
                            {renderTransactionItem({ item })}
                        </View>
                    )}
                    keyExtractor={item => item._id}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 }}>
                            <Icon name="receipt-outline" size={48} color={theme.colors.subText} />
                            <Text style={{ color: theme.colors.subText, marginTop: 12, }}>No transactions yet</Text>
                        </View>
                    }
                />
            </Animated.View>

            {/* Balance Edit Modal */}
            <Modal transparent visible={isBalanceModalVisible} animationType="fade" onRequestClose={() => setBalanceModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
                        <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.modalHeader}>
                            <Icon name="wallet" size={24} color={COLORS.white} />
                            <Text style={styles.modalHeaderTitle}>Set Balance Amount</Text>
                        </LinearGradient>
                        <View style={{ padding: 24 }}>
                            <Text style={[styles.modalLabel, { color: theme.colors.subText }]}>Enter your new balance</Text>
                            <TextInput
                                style={[styles.modalInput, { color: theme.colors.text, backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]}
                                value={tempBalance}
                                onChangeText={(text) => {
                                    // Remove all non-numeric characters except for the decimal point and minus sign
                                    let cleaned = text.replace(/[^0-9.-]/g, '');
                                    
                                    // Make sure '-' is only at the beginning
                                    if (cleaned.lastIndexOf('-') > 0) {
                                        cleaned = cleaned.replace(/(?!^)-/g, '');
                                    }
                                    
                                    // Remove leading zero if there is a number after it (e.g. 05 -> 5)
                                    // But keep '0' if it's '0.' or '-0.'
                                    if (cleaned.length > 1 && cleaned[0] === '0' && cleaned[1] !== '.') {
                                        cleaned = cleaned.substring(1);
                                    } else if (cleaned.length > 2 && cleaned[0] === '-' && cleaned[1] === '0' && cleaned[2] !== '.') {
                                        cleaned = '-' + cleaned.substring(2);
                                    }
                                    
                                    const parts = cleaned.split('.');
                                    const final = parts.length > 2 
                                        ? parts[0] + '.' + parts.slice(1).join('') 
                                        : cleaned;
                                    setTempBalance(final);
                                }}
                                onFocus={() => {
                                    if (tempBalance === '0' || tempBalance === '0.00' || tempBalance === '-0') {
                                        setTempBalance('');
                                    }
                                }}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor={theme.colors.subText}
                                editable={true}
                                selectTextOnFocus={true}
                            />
                            <View style={styles.modalBtns}>
                                <TouchableOpacity style={[styles.modalCancelBtn, { backgroundColor: theme.colors.cardAlt }]} onPress={() => setBalanceModalVisible(false)}>
                                    <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveBalance}>
                                    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.modalSaveGradient}>
                                        <Text style={{ color: COLORS.white, fontWeight: '700' }}>Save</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>



            {/* Add Menu Modal */}
            <AddMenuModal
                visible={isAddMenuVisible}
                onClose={() => setAddMenuVisible(false)}
                navigation={navigation}
                theme={theme}
            />
        </ResponsiveContainer>
    );
};

// Helper
function getTimeOfDay() {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
}

const styles = StyleSheet.create({
    // Top Navbar
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: RESPONSIVE.wp(4),
        paddingVertical: RESPONSIVE.hp(1.5),
        marginTop: Platform.OS === 'web' ? 20 : 0,
    },
    topNavLeft: { flexDirection: 'row', alignItems: 'center' },
    topNavRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    menuBtn: {
        width: 40, height: 40, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    greetSmall: {  fontWeight: '500', marginBottom: 2 },
    greetName: {  fontWeight: '800', letterSpacing: -0.3 },
    navIconBtn: {
        width: 40, height: 40, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        ...SHADOWS.light,
    },
    notifBadge: {
        position: 'absolute', top: -4, right: -4,
        backgroundColor: COLORS.expense, borderRadius: 8,
        minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
    },
    notifBadgeText: { color: COLORS.white,  fontWeight: 'bold' },
    avatarBtn: {
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center',
    },
    avatarText: {  fontWeight: '800' },

    // Hero Card
    heroPad: { paddingHorizontal: RESPONSIVE.wp(4), marginBottom: RESPONSIVE.hp(2) },
    heroCard: {
        borderRadius: 24, padding: RESPONSIVE.wp(6), overflow: 'hidden',
        minHeight: RESPONSIVE.hp(25), justifyContent: 'space-between',
        ...SHADOWS.large,
    },
    heroCircle1: {
        position: 'absolute', width: 200, height: 200, borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -40,
    },
    heroCircle2: {
        position: 'absolute', width: 140, height: 140, borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.04)', bottom: -30, left: -20,
    },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    heroLabel: { color: 'rgba(255,255,255,0.75)',  fontWeight: '600' },
    heroTrendBadge: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    },
    syncBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 8,
    },
    syncDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#00D68F',
        marginRight: 6,
    },
    syncText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    heroAmount: {
        color: COLORS.white,  fontWeight: '800',
        letterSpacing: -0.5, marginVertical: 8,
    },
    heroBottomRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 16,
        paddingHorizontal: 16, paddingVertical: 12,
        flexWrap: 'wrap', gap: 8,
    },
    heroStatItem: { flexDirection: 'row', alignItems: 'center', minWidth: 100 },
    heroStatIcon: {
        width: 30, height: 30, borderRadius: 10,
        backgroundColor: 'rgba(0,214,143,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 10,
    },
    heroStatLabel: { color: 'rgba(255,255,255,0.65)',  fontWeight: '500' },
    heroStatValue: { color: COLORS.white,  fontWeight: '700', marginTop: 1 },
    heroDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 16 },

    // Summary Cards
    summaryRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: RESPONSIVE.wp(4), marginBottom: 8, gap: 10 },
    summaryCardWrap: { marginBottom: 12 },
    summaryCard: {
        borderRadius: 20, padding: RESPONSIVE.wp(4), minHeight: 120,
        justifyContent: 'space-between', overflow: 'hidden',
        ...SHADOWS.medium,
    },
    summaryCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    summaryIconWrap: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
    },
    trendBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
    trendBadgeText: { color: 'rgba(255,255,255,0.95)',  fontWeight: '700', marginLeft: 3 },
    summaryLabel: { color: 'rgba(255,255,255,0.75)',  fontWeight: '600' },
    summaryValue: { color: COLORS.white,  fontWeight: '800', marginTop: 4 },
    summarySubLabel: { color: 'rgba(255,255,255,0.55)',  marginTop: 3 },

    // Progress Card
    progressCard: {
        borderRadius: 20, padding: RESPONSIVE.wp(5),
        marginBottom: 0, ...SHADOWS.card,
    },
    progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    progressLabel: {  fontWeight: '500', marginLeft: 8 },
    progressValue: {  fontWeight: '700' },
    dot: { width: 8, height: 8, borderRadius: 4 },
    trackBg: {
        height: 8, backgroundColor: 'rgba(0,0,0,0.07)',
        borderRadius: 4, overflow: 'hidden', width: '100%',
    },
    trackFill: { height: '100%', borderRadius: 4, minWidth: 4 },

    // Sections
    padHoriz: { paddingHorizontal: RESPONSIVE.wp(4) },
    section: { marginTop: 20 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionHeading: {  fontWeight: '800', letterSpacing: -0.2 },
    seeAllBtn: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 2,
    },

    // Toggle pill
    togglePill: { flexDirection: 'row', borderRadius: 20, padding: 3 },
    pillBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18 },
    pillBtnActive: { backgroundColor: COLORS.primary },
    pillText: {  fontWeight: '700' },

    // Category Cards
    catCard: {
        alignItems: 'center', padding: 14, borderRadius: 18,
        ...SHADOWS.card, marginBottom: 4,
    },
    catIconCircle: {
        width: 42, height: 42, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    },
    catCardName: {  fontWeight: '600', textAlign: 'center', marginBottom: 2 },
    catCardAmount: {  fontWeight: '700', textAlign: 'center' },

    // AI Card
    aiCard: {
        borderRadius: 22, overflow: 'hidden', padding: 20,
        ...SHADOWS.large,
    },
    aiGlow1: {
        position: 'absolute', width: 180, height: 180, borderRadius: 90,
        backgroundColor: 'rgba(108, 99, 255, 0.25)', top: -60, right: -40,
    },
    aiGlow2: {
        position: 'absolute', width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(72, 202, 228, 0.15)', bottom: -30, left: 10,
    },
    aiCardInner: { flexDirection: 'row', alignItems: 'center' },
    aiIconBig: { position: 'relative' },
    aiIconGradient: {
        width: 52, height: 52, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
    },
    aiCardTitle: { color: COLORS.white,  fontWeight: '800', marginBottom: 4 },
    aiCardSubtitle: { color: 'rgba(255,255,255,0.6)',  lineHeight: 18 },
    aiChevron: {
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
    },
    aiTagsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 8, flexWrap: 'wrap' },
    aiTag: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    aiTagText: { color: 'rgba(255,255,255,0.7)',  fontWeight: '600' },
    askBtn: {
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
        marginLeft: 'auto',
    },
    askBtnText: { color: COLORS.white,  fontWeight: '700' },

    // Transaction Row
    transRow: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 18, padding: RESPONSIVE.wp(3.5), marginBottom: 10,
        ...SHADOWS.card,
    },
    transIconCircle: {
        width: 44, height: 44, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
    },
    transInfo: { flex: 1, marginLeft: 12 },
    transCat: {  fontWeight: '700', marginBottom: 2 },
    transDesc: {  fontWeight: '400' },
    transRight: { alignItems: 'flex-end' },
    amountBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 4 },
    transAmount: {  fontWeight: '800' },
    transDate: { },

    // Modal
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center', alignItems: 'center',
    },
    modalCard: {
        width: '88%', maxWidth: 400, borderRadius: 24,
        overflow: 'hidden', ...SHADOWS.large,
    },
    modalHeader: {
        flexDirection: 'row', alignItems: 'center',
        padding: 20, gap: 12,
    },
    modalHeaderTitle: { color: COLORS.white,  fontWeight: '700' },
    modalLabel: {  marginBottom: 12 },
    modalInput: {
        borderWidth: 1.5, borderRadius: 14,
        padding: 16,  fontWeight: '600', marginBottom: 20,
    },
    modalBtns: { flexDirection: 'row', gap: 12 },
    modalCancelBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 14,
        alignItems: 'center',
    },
    modalSaveBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
    modalSaveGradient: { paddingVertical: 14, alignItems: 'center' },

    // FAB
    fab: {
        position: 'absolute', bottom: 92, right: 20,
        width: 56, height: 56, borderRadius: 28,
        ...SHADOWS.large, zIndex: 999,
    },
    fabGradient: {
        flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 28,
    },
});

export default DashboardScreen;
