import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { Text } from '../components/Text';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Animated, useWindowDimensions } from 'react-native';
import ResponsiveContainer from '../components/ResponsiveContainer';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { SettingsContext } from '../context/SettingsContext';
import { COLORS, SIZES, SHADOWS, RESPONSIVE } from '../constants/theme';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BudgetContext } from '../context/BudgetContext';
import axios from 'axios';
import { getCategoryIcon } from '../constants/icons';

const isWeb = Platform.OS === 'web';

const BudgetGoalsScreen = ({ navigation }) => {
    const { width } = useWindowDimensions();
    const isTablet = width > 768;

    const { BASE_URL, token } = useContext(AuthContext);
    const { theme, toggleSidebar } = useContext(ThemeContext);
    const { formatCurrency } = useContext(SettingsContext);
    const { budgets: budgetData, fetchBudgets, updateBudgetLimit } = useContext(BudgetContext);

    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Edit Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [newLimit, setNewLimit] = useState('');
    const [saving, setSaving] = useState(false);

    // Animation
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchBudgets();
        setRefreshing(false);
    };

    const openEditModal = (item) => {
        setSelectedCategory(item);
        setNewLimit(item.limit > 0 ? item.limit.toString() : '');
        setModalVisible(true);
    };

    const saveBudget = async () => {
        if (!newLimit || isNaN(newLimit) || Number(newLimit) < 0) {
            Alert.alert("Invalid Input", "Please enter a valid amount");
            return;
        }

        setSaving(true);
        await updateBudgetLimit(selectedCategory.category, newLimit);
        setSaving(false);
        setModalVisible(false);
        Alert.alert("Success", `Budget for ${selectedCategory.category} updated!`);
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
                <View style={{ marginLeft: 8 }}>
                    <Text style={styles.headerTitle}>Budget Goals</Text>
                    <Text style={styles.headerSubtitle}>Manage your spending limits</Text>
                </View>
                <View style={{ flex: 1 }} />
                <View style={styles.headerIconCircle}>
                    <Icon name="calculator" size={24} color={COLORS.white} />
                </View>
            </View>
        </LinearGradient>
    );

    const renderItem = ({ item }) => {
        const percentage = item.limit > 0 ? Math.min((item.spent / item.limit) * 100, 100) : 0;
        const isOverBudget = item.limit > 0 && item.spent > item.limit;
        const color = COLORS.categoryColors[item.category] || COLORS.primary;

        return (
            <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={() => openEditModal(item)}
                style={[styles.card, { backgroundColor: theme.colors.card }]}
            >
                <View style={styles.cardTop}>
                    <View style={styles.catInfo}>
                        <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                            {getCategoryIcon(item.category, 22, color)}
                        </View>
                        <View>
                            <Text style={[styles.catName, { color: theme.colors.text }]}>{item.category}</Text>
                            <Text style={[styles.spentSub, { color: theme.colors.subText }]}>
                                {item.limit > 0 ? `${percentage.toFixed(0)}% of limit used` : 'No limit set'}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.editCircle, { backgroundColor: theme.colors.cardAlt }]}>
                        <Icon name="pencil" size={14} color={theme.colors.subText} />
                    </View>
                </View>

                <View style={styles.amountArea}>
                    <View>
                        <Text style={[styles.amountLabel, { color: theme.colors.subText }]}>Current Spending</Text>
                        <Text style={[styles.amountValue, { color: isOverBudget ? COLORS.expense : theme.colors.text }]}>
                            {formatCurrency(item.spent)}
                        </Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.amountLabel, { color: theme.colors.subText }]}>Monthly Limit</Text>
                        <Text style={[styles.amountValue, { color: theme.colors.text }]}>
                            {item.limit > 0 ? formatCurrency(item.limit) : 'Set Limit'}
                        </Text>
                    </View>
                </View>

                {item.limit > 0 && (
                    <View style={styles.progressSection}>
                        <View style={[styles.progressTrack, { backgroundColor: theme.colors.cardAlt }]}>
                            <Animated.View 
                                style={[
                                    styles.progressFill, 
                                    { 
                                        width: `${percentage}%`, 
                                        backgroundColor: isOverBudget ? COLORS.expense : color 
                                    }
                                ]} 
                            />
                        </View>
                        {isOverBudget && (
                            <View style={styles.overBadge}>
                                <Icon name="warning" size={10} color={COLORS.white} />
                                <Text style={styles.overText}>Over Budget by {formatCurrency(item.spent - item.limit)}</Text>
                            </View>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <ResponsiveContainer style={{ backgroundColor: theme.colors.background }} useSafeArea={false}>
            {renderHeader()}

            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                {loading && !refreshing ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={[styles.loadingText, { color: theme.colors.subText }]}>Loading budgets...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={budgetData}
                        keyExtractor={item => item.category}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContainer}
                        onRefresh={handleRefresh}
                        refreshing={refreshing}
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={
                            <View style={styles.listHeader}>
                                <Icon name="information-circle-outline" size={16} color={theme.colors.subText} style={{ marginRight: 6 }} />
                                <Text style={{ color: theme.colors.subText,  fontWeight: '500' }}>
                                    Tap on a category to adjust its budget
                                </Text>
                            </View>
                        }
                        ListEmptyComponent={
                            <View style={styles.center}>
                                <Icon name="calendar-outline" size={48} color={theme.colors.subText} />
                                <Text style={{ color: theme.colors.subText, marginTop: 12 }}>No categories found.</Text>
                            </View>
                        }
                    />
                )}
            </Animated.View>

            {/* Premium Edit Modal */}
            <Modal animationType="fade" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalWrap}>
                        <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
                            <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.modalHeaderGradient}>
                                <View style={styles.modalIconBox}>
                                    {selectedCategory && getCategoryIcon(selectedCategory.category, 24, COLORS.white)}
                                </View>
                                <View>
                                    <Text style={styles.modalTitle}>Set Monthly Goal</Text>
                                    <Text style={styles.modalSubtitle}>{selectedCategory?.category} Expenses</Text>
                                </View>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                                    <Icon name="close" size={20} color={COLORS.white} />
                                </TouchableOpacity>
                            </LinearGradient>

                            <View style={styles.modalBody}>
                                <Text style={[styles.inputLabel, { color: theme.colors.subText }]}>New Limit Amount</Text>
                                <View style={[styles.inputBox, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]}>
                                    <Text style={[styles.currencySign, { color: theme.colors.text }]}>₹</Text>
                                    <TextInput
                                        style={[styles.modalInput, { color: theme.colors.text }]}
                                        value={newLimit}
                                        onChangeText={setNewLimit}
                                        placeholder="0.00"
                                        placeholderTextColor={theme.colors.subText}
                                        keyboardType="decimal-pad"
                                        autoFocus={!isWeb}
                                    />
                                </View>

                                <View style={styles.modalActions}>
                                    <TouchableOpacity 
                                        style={[styles.cancelBtn, { backgroundColor: theme.colors.cardAlt }]} 
                                        onPress={() => setModalVisible(false)}
                                    >
                                        <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.saveBtn} onPress={saveBudget} disabled={saving}>
                                        <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.saveBtnGradient}>
                                            {saving ? (
                                                <ActivityIndicator size="small" color={COLORS.white} />
                                            ) : (
                                                <Text style={{ color: COLORS.white, fontWeight: '700' }}>Update Limit</Text>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </ResponsiveContainer>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingTop: isWeb ? RESPONSIVE.hp(4) : RESPONSIVE.hp(7),
        paddingBottom: RESPONSIVE.hp(3),
        paddingHorizontal: RESPONSIVE.wp(5),
        overflow: 'hidden',
    },
    headerCircle1: {
        position: 'absolute', width: 200, height: 200, borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.06)', top: -70, right: -40,
    },
    headerCircle2: {
        position: 'absolute', width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.04)', bottom: -40, left: 20,
    },
    navBtn: {
        width: 38, height: 38, borderRadius: 12,
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

    listContainer: { padding: RESPONSIVE.wp(4), paddingBottom: 40, width: '100%', maxWidth: 1200, alignSelf: 'center' },
    listHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    
    card: {
        borderRadius: RESPONSIVE.moderateScale(20), padding: RESPONSIVE.moderateScale(18), marginBottom: RESPONSIVE.moderateScale(16),
        ...SHADOWS.card,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: RESPONSIVE.moderateScale(16) },
    catInfo: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: RESPONSIVE.moderateScale(44), height: RESPONSIVE.moderateScale(44), borderRadius: RESPONSIVE.moderateScale(14), justifyContent: 'center', alignItems: 'center', marginRight: RESPONSIVE.moderateScale(12) },
    catName: { fontSize: RESPONSIVE.moderateScale(16), fontWeight: '800', marginBottom: RESPONSIVE.moderateScale(2) },
    spentSub: { fontSize: RESPONSIVE.moderateScale(12), fontWeight: '500' },
    editCircle: { width: RESPONSIVE.moderateScale(28), height: RESPONSIVE.moderateScale(28), borderRadius: RESPONSIVE.moderateScale(14), justifyContent: 'center', alignItems: 'center' },

    amountArea: { flexDirection: 'row', paddingVertical: RESPONSIVE.moderateScale(8), alignItems: 'center' },
    amountLabel: { fontSize: RESPONSIVE.moderateScale(12), fontWeight: '600', marginBottom: RESPONSIVE.moderateScale(4) },
    amountValue: { fontSize: RESPONSIVE.moderateScale(18), fontWeight: '800' },
    divider: { width: RESPONSIVE.moderateScale(1), height: RESPONSIVE.moderateScale(32), backgroundColor: 'rgba(0,0,0,0.06)', marginHorizontal: RESPONSIVE.moderateScale(20) },

    progressSection: { marginTop: RESPONSIVE.moderateScale(12) },
    progressTrack: { height: RESPONSIVE.moderateScale(8), borderRadius: RESPONSIVE.moderateScale(4), overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: RESPONSIVE.moderateScale(4) },
    overBadge: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
        backgroundColor: COLORS.expense, paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 8, marginTop: 8, gap: 4,
    },
    overText: { color: COLORS.white,  fontWeight: '700' },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    loadingText: { marginTop: 12, },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalWrap: { width: '90%', maxWidth: 450 },
    modalCard: { borderRadius: 28, overflow: 'hidden', ...SHADOWS.large },
    modalHeaderGradient: { padding: 24, flexDirection: 'row', alignItems: 'center', gap: 16 },
    modalIconBox: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    modalTitle: { color: COLORS.white,  fontWeight: '800' },
    modalSubtitle: { color: 'rgba(255,255,255,0.7)',  fontWeight: '500' },
    modalCloseBtn: { marginLeft: 'auto', width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    
    modalBody: { padding: 24 },
    inputLabel: {  fontWeight: '600', marginBottom: 10 },
    inputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16 },
    currencySign: {  fontWeight: '700', marginRight: 10 },
    modalInput: { flex: 1, height: 56,  fontWeight: '700' },
    
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    cancelBtn: { flex: 1, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    saveBtn: { flex: 1.5, height: 52, borderRadius: 16, overflow: 'hidden' },
    saveBtnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default BudgetGoalsScreen;
