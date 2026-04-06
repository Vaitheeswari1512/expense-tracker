import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { Text } from '../components/Text';
import { View, StyleSheet, Switch, TouchableOpacity, ScrollView, Platform, Alert, FlatList, RefreshControl, ActivityIndicator, Animated, useWindowDimensions } from 'react-native';
import ResponsiveContainer from '../components/ResponsiveContainer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SIZES, SHADOWS, RESPONSIVE } from '../constants/theme';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NotificationContext } from '../context/NotificationContext';
import { LinearGradient } from 'expo-linear-gradient';

const isWeb = Platform.OS === 'web';

const NotificationsScreen = ({ navigation }) => {
    const { width } = useWindowDimensions();
    const isTablet = width > 768;

    const { theme, toggleSidebar } = useContext(ThemeContext);
    const { BASE_URL, token } = useContext(AuthContext);

    // Consume Context
    const { 
        notifications, 
        fetchNotifications, 
        markAllAsRead, 
        markAsRead: contextMarkAsRead, 
        deleteNotification,
        deleteAllNotifications,
        loading 
    } = useContext(NotificationContext);

    // Settings State
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [filterType, setFilterType] = useState('transaction'); // 'transaction' or 'spending'

    // Data State
    const [refreshing, setRefreshing] = useState(false);

    // Animation
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadSettings();
    }, []);

    useFocusEffect(
        useCallback(() => {
            const loadAndMark = async () => {
                await fetchNotifications();
                markAllAsRead();
            };
            loadAndMark();
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
        }, [fetchNotifications, markAllAsRead])
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchNotifications();
        setRefreshing(false);
    };

    const handleMarkSingleRead = async (item) => {
        if (!item.read) {
            await contextMarkAsRead(item._id);
        }
    };

    const handleDelete = async (id) => {
        try {
            console.log("Single Delete Requested for:", id);
            await deleteNotification(id);
        } catch (e) {
            console.error("Delete failed", e);
        }
    };

    const handleDeleteAll = async () => {
        try {
            if (notifications.length === 0) return;
            console.log("Delete All Requested");
            await deleteAllNotifications();
        } catch (e) {
            console.error("Delete all failed", e);
        }
    };

    const loadSettings = async () => {
        try {
            const savedNotifs = await AsyncStorage.getItem('notificationsEnabled');
            if (savedNotifs !== null) setNotificationsEnabled(JSON.parse(savedNotifs));
        } catch (e) {
            console.log('Failed to load notification settings', e);
        }
    };

    const toggleNotifications = async (value) => {
        setNotificationsEnabled(value);
        await AsyncStorage.setItem('notificationsEnabled', JSON.stringify(value));
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
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>In-App Notifications</Text>
                    <Text style={styles.headerSubtitle}>Recent alerts and reminders</Text>
                </View>
                <TouchableOpacity 
                    onPress={() => setShowSettings(!showSettings)} 
                    style={[styles.headerIconCircle, showSettings && { backgroundColor: 'rgba(255,255,255,0.3)' }]}
                >
                    <Icon name="cog" size={24} color={COLORS.white} />
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );

    const renderNotificationItem = ({ item }) => {
        const type = item.type || 'info';
        const iconName = type === 'expense' ? 'arrow-down-circle' : type === 'income' ? 'arrow-up-circle' : 'notifications';
        const iconColor = type === 'expense' ? COLORS.expense : type === 'income' ? COLORS.income : COLORS.primary;

        return (
            <View style={[styles.notifCard, { backgroundColor: theme.colors.card }]}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleMarkSingleRead(item)}
                    style={styles.notifMainArea}
                >
                    <View style={[styles.notifIconBox, { backgroundColor: iconColor + '10' }]}>
                        <Icon name={iconName} size={22} color={iconColor} />
                    </View>
                    <View style={styles.notifContent}>
                        <View style={styles.notifRow}>
                            <Text style={[styles.notifTitle, { color: theme.colors.text }]}>{item.title}</Text>
                            {!item.read && <View style={styles.unreadDot} />}
                        </View>
                        {!!item.message && <Text style={[styles.notifMessage, { color: theme.colors.subText }]}>{item.message}</Text>}
                        <View style={styles.notifFooter}>
                            <Icon name="time-outline" size={12} color={theme.colors.subText} style={{ marginRight: 4 }} />
                            <Text style={[styles.notifTime, { color: theme.colors.subText }]}>
                                {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item._id)}
                    activeOpacity={0.6}
                >
                    <Icon name="trash-outline" size={20} color={COLORS.expense} />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <ResponsiveContainer style={{ backgroundColor: theme.colors.background }} useSafeArea={false}>
            {renderHeader()}

            <Animated.ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={{ flex: 1, opacity: fadeAnim }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
            >
                <View style={{ width: '100%', maxWidth: 750, alignSelf: 'center' }}>
                    {/* Settings Panel */}
                    {(showSettings || notifications.length === 0) && (
                        <View style={[styles.settingsCard, { backgroundColor: theme.colors.card }]}>
                            <View style={styles.settingsHeader}>
                                <Text style={[styles.settingsTitle, { color: theme.colors.text }]}>Settings</Text>
                            </View>
                            <View style={styles.row}>
                                <View style={styles.rowInfo}>
                                    <Icon name="notifications-outline" size={20} color={COLORS.primary} style={styles.rowIcon} />
                                    <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Allow Notifications</Text>
                                </View>
                                <Switch
                                    value={notificationsEnabled}
                                    onValueChange={toggleNotifications}
                                    trackColor={{ false: theme.colors.cardAlt, true: COLORS.primary }}
                                    thumbColor={COLORS.white}
                                />
                            </View>
                        </View>
                    )}

                    {/* Notifications List */}
                    <View style={styles.listSection}>
                        <View style={styles.listHeader}>
                            <Text style={[styles.listTitle, { color: theme.colors.text }]}>Notification History</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {notifications.length > 0 && (
                                    <TouchableOpacity onPress={handleDeleteAll}>
                                        <Text style={{ color: COLORS.expense, fontWeight: 'bold' }}>Delete All</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* Filter Tabs */}
                        <View style={[styles.filterContainer, { backgroundColor: theme.colors.cardAlt || theme.colors.border + '20' }]}>
                            <TouchableOpacity 
                                style={[styles.filterTab, filterType === 'transaction' && { backgroundColor: theme.colors.card, ...SHADOWS.small }]}
                                onPress={() => setFilterType('transaction')}
                                activeOpacity={0.8}
                            >
                                <Icon 
                                    name="receipt-outline" 
                                    size={18} 
                                    color={filterType === 'transaction' ? COLORS.primary : theme.colors.subText} 
                                    style={{ marginRight: 8 }}
                                />
                                <Text style={[styles.filterText, { color: filterType === 'transaction' ? theme.colors.text : theme.colors.subText }]}>
                                    Transactions
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.filterTab, filterType === 'spending' && { backgroundColor: theme.colors.card, ...SHADOWS.small }]}
                                onPress={() => setFilterType('spending')}
                                activeOpacity={0.8}
                            >
                                <Icon 
                                    name="pie-chart-outline" 
                                    size={18} 
                                    color={filterType === 'spending' ? COLORS.primary : theme.colors.subText} 
                                    style={{ marginRight: 8 }}
                                />
                                <Text style={[styles.filterText, { color: filterType === 'spending' ? theme.colors.text : theme.colors.subText }]}>
                                    Spending
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <View style={styles.emptyContainer}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
                            </View>
                        ) : (
                            (() => {
                                const list = notifications.filter(item => 
                                    filterType === 'transaction' 
                                        ? item.title === 'Transaction Added' 
                                        : item.title === 'Transaction Synced'
                                );

                                if (list.length === 0) {
                                    return (
                                        <View style={[styles.emptyCard, { backgroundColor: theme.colors.card }]}>
                                            <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.cardAlt }]}>
                                                <Icon 
                                                    name={filterType === 'transaction' ? "file-tray-outline" : "bar-chart-outline"} 
                                                    size={48} 
                                                    color={theme.colors.subText} 
                                                />
                                            </View>
                                            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                                                No {filterType === 'transaction' ? 'Transactions' : 'Spending'} Alerts
                                            </Text>
                                            <Text style={[styles.emptySubtitle, { color: theme.colors.subText }]}>
                                                Notifications related to {filterType === 'transaction' ? 'your manual entries' : 'automatic syncing'} will appear here.
                                            </Text>
                                        </View>
                                    );
                                }

                                return list.map((item) => (
                                    <View key={item._id}>
                                        {renderNotificationItem({ item })}
                                    </View>
                                ));
                            })()
                        )}
                    </View>
                </View>
            </Animated.ScrollView>
        </ResponsiveContainer>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingTop: isWeb ? 40 : 60,
        paddingBottom: 24,
        paddingHorizontal: 20,
        overflow: 'hidden',
    },
    headerCircle1: {
        position: 'absolute', width: 220, height: 220, borderRadius: 110,
        backgroundColor: 'rgba(255,255,255,0.06)', top: -100, right: -40,
    },
    headerCircle2: {
        position: 'absolute', width: 140, height: 140, borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.04)', bottom: -60, left: 10,
    },
    navBtn: {
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    headerTitle: { color: COLORS.white,  fontWeight: '800', letterSpacing: -0.3 },
    headerSubtitle: { color: 'rgba(255,255,255,0.6)',  fontWeight: '500', marginTop: 1 },
    headerIconCircle: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
    },

    scrollContent: { padding: 20, paddingBottom: 40 },
    
    settingsCard: { borderRadius: 24, padding: 20, marginBottom: 24, ...SHADOWS.card },
    settingsHeader: { marginBottom: 16 },
    settingsTitle: {  fontWeight: '800' },
    
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    rowInfo: { flexDirection: 'row', alignItems: 'center' },
    rowIcon: { marginRight: 12 },
    rowTitle: {  fontWeight: '600' },
    
    timePickerRow: { 
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
        padding: 14, borderRadius: 16, marginTop: 4 
    },
    timeLabel: {  fontWeight: '500' },
    timeValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    timeText: {  fontWeight: '700' },

    listSection: { marginTop: 8 },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, paddingHorizontal: 4 },
    listTitle: {  fontWeight: '800' },

    notifCard: {
        flexDirection: 'row', borderRadius: 20, marginBottom: 12,
        ...SHADOWS.card, alignItems: 'center', overflow: 'hidden'
    },
    notifMainArea: { flex: 1, flexDirection: 'row', padding: 16, alignItems: 'center' },
    deleteBtn: { padding: 16, borderLeftWidth: 1, borderLeftColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
    notifIconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    notifContent: { flex: 1 },
    notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    notifTitle: { fontSize: RESPONSIVE.moderateScale(16), fontWeight: 'bold', marginBottom: 4 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 4, marginLeft: 8 },
    notifBody: { fontSize: RESPONSIVE.moderateScale(13), lineHeight: 18, marginBottom: 8 },
    notifTime: { fontSize: RESPONSIVE.moderateScale(11), fontWeight: '600' },

    filterContainer: {
        flexDirection: 'row',
        padding: 6,
        borderRadius: 18,
        marginBottom: 20,
        marginHorizontal: 4,
        alignItems: 'center',
    },
    filterTab: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 14,
    },
    filterText: {
        fontWeight: '700',
        fontSize: RESPONSIVE.moderateScale(14),
    },
    emptyCard: { borderRadius: 24, padding: 40, alignItems: 'center' },
    emptyIconCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: RESPONSIVE.moderateScale(18), fontWeight: 'bold', marginBottom: 5 },
    emptySubtitle: { fontSize: RESPONSIVE.moderateScale(14), textAlign: 'center', lineHeight: 20 },
    emptyContainer: { paddingVertical: 100, alignItems: 'center' },
});

export default NotificationsScreen;
