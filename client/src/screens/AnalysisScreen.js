import React, { useContext, useState, useEffect, useCallback } from 'react';
import { Text } from '../components/Text';
import { View, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Modal, FlatList, Platform } from 'react-native';
import ResponsiveContainer from '../components/ResponsiveContainer';

const isWeb = Platform.OS === 'web';

import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { COLORS, SIZES, SHADOWS, RESPONSIVE } from '../constants/theme';
import { getCategoryIcon } from '../constants/icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SettingsContext } from '../context/SettingsContext';
import { ThemeContext } from '../context/ThemeContext';
import { Ionicons as Icon } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DUMMY_TRANSACTIONS, DUMMY_CATEGORY_STATS } from '../constants/dummyData';

const AnalysisScreen = ({ navigation }) => {
    const { width } = useWindowDimensions();
    const { BASE_URL, token, user } = useContext(AuthContext);
    const { formatCurrency } = useContext(SettingsContext);
    const { theme, toggleSidebar } = useContext(ThemeContext);
    const [transactions, setTransactions] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [totalAmount, setTotalAmount] = useState(0);
    const [viewMode, setViewMode] = useState('expense');
    const [error, setError] = useState(null);

    // Date State
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [compareMonth1, setCompareMonth1] = useState(new Date());
    const [compareMonth2, setCompareMonth2] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)));

    // Picker State
    const [modalVisible, setModalVisible] = useState(false);
    const [pickerMode, setPickerMode] = useState('main'); // 'main', 'comp1', 'comp2'
    const [monthsList, setMonthsList] = useState([]);

    useFocusEffect(
        useCallback(() => {
            fetchTransactions();
            fetchCategoryStats();
            generateMonths();
        }, [selectedMonth, viewMode, token, BASE_URL])
    );

    const generateMonths = () => {
        const months = [];
        const today = new Date();
        for (let i = 0; i < 24; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push(d);
        }
        setMonthsList(months);
    };

    const fetchTransactions = async () => {
        if (!token || !user?._id) return;
        try {
            const key = `transactions_${user._id}`;
            const stored = await AsyncStorage.getItem(key);
            const data = stored ? JSON.parse(stored) : [];
            setTransactions(data);
        } catch (e) {
            console.log(e);
            setError("Unable to load transactions.");
        }
    };

    const getRandomColor = () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    };

    const fetchCategoryStats = async () => {
        if (!token || !user?._id) return;
        setError(null);
        try {
            const key = `transactions_${user._id}`;
            const stored = await AsyncStorage.getItem(key);
            const data = stored ? JSON.parse(stored) : [];
            
            const currentYear = selectedMonth.getFullYear();
            const currentMonth = selectedMonth.getMonth();

            // Filter transactions for selected month/year and type
            const filtered = data.filter(t => {
                const d = new Date(t.date);
                return d.getFullYear() === currentYear && 
                       d.getMonth() === currentMonth && 
                       t.type === viewMode;
            });

            // Calculate totals per category
            const categories = {};
            filtered.forEach(t => {
                if (!categories[t.category]) {
                    categories[t.category] = 0;
                }
                categories[t.category] += Number(t.amount);
            });

            const total = filtered.reduce((sum, t) => sum + Number(t.amount), 0);
            setTotalAmount(total);

            // Format for Chart Kit
            const chart = Object.keys(categories).map((cat, index) => ({
                name: cat,
                amount: categories[cat],
                color: COLORS.categoryColors[cat] || getRandomColor(),
                legendFontColor: theme.colors.subText,
                legendFontSize: 12,
                percentage: total > 0 ? ((categories[cat] / total) * 100).toFixed(1) : '0.0'
            })).sort((a, b) => b.amount - a.amount);

            setChartData(chart);
        } catch (e) {
            console.log("Error fetching stats:", e);
            setError("Unable to load category stats.");
        }
    };

    // useEffect update triggers
    useEffect(() => {
        fetchCategoryStats();
    }, [viewMode, selectedMonth, transactions]);

    const handleMonthSelect = (date) => {
        if (pickerMode === 'main') setSelectedMonth(date);
        else if (pickerMode === 'comp1') setCompareMonth1(date);
        else if (pickerMode === 'comp2') setCompareMonth2(date);
        setModalVisible(false);
    };

    const renderMonthPicker = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Month</Text>
                    <FlatList
                        data={monthsList}
                        keyExtractor={(item) => item.toISOString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.monthItem} onPress={() => handleMonthSelect(item)}>
                                <Text style={[styles.monthText, { color: theme.colors.text }]}>
                                    {item.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </Text>
                            </TouchableOpacity>
                        )}
                        style={{ maxHeight: 300, width: '100%' }}
                    />
                    <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                        <Text style={styles.closeBtnText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    // Comparison Logic
    const getComparisonData = () => {
        const d1Str = compareMonth1.toISOString().slice(0, 7);
        const d2Str = compareMonth2.toISOString().slice(0, 7);

        const filterForMonth = (mStr) => transactions.filter(t => t.date && t.date.startsWith(mStr));

        const m1Trans = filterForMonth(d1Str);
        const m2Trans = filterForMonth(d2Str);

        const sumType = (list, type) => list.filter(t => t.type === type).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const m1Inc = sumType(m1Trans, 'income');
        const m1Exp = sumType(m1Trans, 'expense');
        const m2Inc = sumType(m2Trans, 'income');
        const m2Exp = sumType(m2Trans, 'expense');

        return {
            labels: [
                `${compareMonth1.toLocaleString('default', { month: 'short' })} Inc`,
                `${compareMonth1.toLocaleString('default', { month: 'short' })} Exp`,
                `${compareMonth2.toLocaleString('default', { month: 'short' })} Inc`,
                `${compareMonth2.toLocaleString('default', { month: 'short' })} Exp`
            ],
            datasets: [{
                data: [m1Inc, m1Exp, m2Inc, m2Exp]
            }]
        };
    };

    const chartConfig = {
        backgroundGradientFrom: theme.colors.card,
        backgroundGradientFromOpacity: 1,
        backgroundGradientTo: theme.colors.card,
        backgroundGradientToOpacity: 1,
        color: (opacity = 1) => theme.dark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
        labelColor: (opacity = 1) => theme.dark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
        strokeWidth: 2,
        barPercentage: 0.5,
    };

    const compData = getComparisonData();

    if (error) {
        return (
            <ResponsiveContainer style={{ backgroundColor: theme.colors.background }} useSafeArea={false}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Icon name="alert-circle-outline" size={60} color={COLORS.expense} />
                    <Text style={{ color: theme.colors.text, marginTop: 20, }}>{error}</Text>
                    <TouchableOpacity onPress={() => { fetchTransactions(); fetchCategoryStats(); }} style={{ marginTop: 20, padding: 10, backgroundColor: COLORS.primary, borderRadius: 10 }}>
                        <Text style={{ color: COLORS.white }}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </ResponsiveContainer>
        );
    }

    return (
        <ResponsiveContainer style={{ backgroundColor: theme.colors.background }} useSafeArea={false}>
            <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 30 }}>
                {renderMonthPicker()}

                <LinearGradient
                    colors={[COLORS.gradientStart, '#A56EFF', COLORS.gradientEnd]}
                    style={styles.header}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={{ maxWidth: 1200, width: '90%', alignSelf: 'center' }}>
                        <View style={styles.headerContent}>
                            <TouchableOpacity onPress={() => navigation.openDrawer()} style={{ marginRight: 15, padding: 5 }}>
                                <Icon name="menu" size={24} color={COLORS.white} />
                            </TouchableOpacity>
                            <Text style={[styles.headerTitle, { flex: 1 }]}>Analytics</Text>
                        </View>

                        {/* Main Month Selector */}
                        <TouchableOpacity
                            style={[styles.mainMonthSelector, { backgroundColor: theme.colors.card }]}
                            onPress={() => { setPickerMode('main'); setModalVisible(true); }}
                        >
                            <Icon name="calendar" size={20} color={theme.colors.subText} />
                            <Text style={[styles.mainMonthText, { color: theme.colors.text }]}>
                                {selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </Text>
                            <Icon name="chevron-down" size={16} color={theme.colors.subText} />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>


                {/* Comparison Section */}
                <View style={[styles.chartContainer, { backgroundColor: theme.colors.card, marginTop: 20 }]}>
                    <Text style={[styles.chartTitle, { color: theme.colors.text }]}>Monthly Comparison</Text>
                    <View style={styles.compSelectors}>
                        <TouchableOpacity style={[styles.compBtn, { borderColor: theme.colors.border }]} onPress={() => { setPickerMode('comp1'); setModalVisible(true); }}>
                            <Text style={{ color: theme.colors.text }}>{compareMonth1.toLocaleString('default', { month: 'short', year: '2-digit' })}</Text>
                            <Icon name="chevron-down" size={12} color={theme.colors.subText} />
                        </TouchableOpacity>
                        <Text style={{ color: theme.colors.subText, marginHorizontal: 5 }}>vs</Text>
                        <TouchableOpacity style={[styles.compBtn, { borderColor: theme.colors.border }]} onPress={() => { setPickerMode('comp2'); setModalVisible(true); }}>
                            <Text style={{ color: theme.colors.text }}>{compareMonth2.toLocaleString('default', { month: 'short', year: '2-digit' })}</Text>
                            <Icon name="chevron-down" size={12} color={theme.colors.subText} />
                        </TouchableOpacity>
                    </View>

                    <View style={{ alignItems: 'center', width: '100%', overflow: 'hidden' }}>
                        <BarChart
                            data={compData}
                            width={Math.min(width, 1200) - 60}
                            height={200}
                            yAxisLabel=""
                            yAxisSuffix=""
                            chartConfig={{
                                ...chartConfig,
                                color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
                                barPercentage: 0.6,
                                decimalPlaces: 0,
                            }}
                            verticalLabelRotation={0}
                            fromZero
                            showValuesOnTopOfBars
                            style={{ borderRadius: 16, marginTop: 10 }}
                        />
                    </View>
                </View>

                <View style={[styles.toggleContainer, { backgroundColor: theme.colors.card }]}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'expense' && styles.activeToggle]}
                        onPress={() => setViewMode('expense')}
                    >
                        <Text style={[styles.toggleText, viewMode === 'expense' && styles.activeToggleText, viewMode !== 'expense' && { color: theme.colors.subText }]}>Expense</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'income' && styles.activeToggle]}
                        onPress={() => setViewMode('income')}
                    >
                        <Text style={[styles.toggleText, viewMode === 'income' && styles.activeToggleText, viewMode !== 'income' && { color: theme.colors.subText }]}>Income</Text>
                    </TouchableOpacity>
                </View>

                <Animated.View
                    entering={FadeInDown.delay(200).duration(800)}
                    style={[
                        styles.chartContainer,
                        {
                            backgroundColor: theme.colors.card,
                            borderRadius: 20,
                            padding: 25,
                            width: 'auto',
                            maxWidth: 1200,
                            alignSelf: 'stretch',
                            marginHorizontal: 20,
                            shadowOpacity: 0.08,
                            shadowRadius: 15
                        }
                    ]}
                >
                    <Text style={[styles.chartTitle, { color: theme.colors.text, fontSize: 20 }]}>
                        {selectedMonth.toLocaleString('default', { month: 'long' })} Breakdown
                    </Text>

                    {chartData.length > 0 ? (
                        <>
                            <View style={styles.pieWrapper}>
                                <PieChart
                                    data={chartData}
                                    width={width > 400 ? 300 : 250}
                                    height={200}
                                    chartConfig={chartConfig}
                                    accessor={"amount"}
                                    backgroundColor={"transparent"}
                                    paddingLeft={width > 400 ? "40" : "20"}
                                    center={[width > 400 ? 35 : 20, 0]}
                                    absolute={false}
                                    hasLegend={false}
                                />
                            </View>
                            <View style={styles.customLegendContainer}>
                                {chartData.map((item, index) => (
                                    <View key={index} style={[styles.legendRow, index === chartData.length - 1 && { borderBottomWidth: 0 }]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                            <Text style={[styles.legendName, { color: theme.colors.text }]}>{item.name}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={[styles.legendPercent, { color: theme.colors.text }]}>{item.percentage}%</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </>
                    ) : (
                        <Text style={[styles.noDataText, { color: theme.colors.subText }]}>No records found for this period.</Text>
                    )}
                </Animated.View>


            </ScrollView>
        </ResponsiveContainer>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingTop: isWeb ? RESPONSIVE.hp(4) : RESPONSIVE.hp(7),
        paddingBottom: RESPONSIVE.hp(4),
        paddingHorizontal: RESPONSIVE.wp(5),
        overflow: 'hidden',
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 15
    },
    headerTitle: { color: COLORS.white, fontSize: RESPONSIVE.moderateScale(28), fontWeight: '800', letterSpacing: -0.3 },
    headerSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: RESPONSIVE.moderateScale(14), fontWeight: '500', marginTop: 2 },
    budgetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        ...SHADOWS.light
    },
    budgetBtnText: {
        color: COLORS.primary,
        fontWeight: 'bold',
        marginLeft: 5,
        fontSize: RESPONSIVE.moderateScale(14),
    },
    mainMonthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 12,
        alignSelf: 'center',
        width: '100%',
    },
    mainMonthText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    toggleContainer: {
        flexDirection: 'row',
        alignSelf: 'stretch',
        backgroundColor: COLORS.white,
        borderRadius: 20,
        marginTop: 20,
        marginHorizontal: 20,
        padding: 5,
        ...SHADOWS.light,
        width: 'auto',
        maxWidth: 1200,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 15,
        alignItems: 'center'
    },
    activeToggle: {
        backgroundColor: COLORS.primary
    },
    toggleText: {
        fontWeight: 'bold',
        color: COLORS.gray
    },
    activeToggleText: {
        color: COLORS.white
    },
    chartContainer: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: RESPONSIVE.wp(5),
        marginBottom: 20,
        ...SHADOWS.medium,
        width: 'auto',
        maxWidth: 1200,
        marginHorizontal: 20,
        alignSelf: 'stretch'
    },
    chartTitle: {
        fontSize: RESPONSIVE.moderateScale(18),
        fontWeight: 'bold',
        marginBottom: 10,
        alignSelf: 'flex-start'
    },
    compSelectors: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        width: '100%'
    },
    compBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'transparent',
        marginHorizontal: 10
    },
    noDataText: {
        marginTop: 50,
        marginBottom: 50,
        fontSize: 16,
        color: COLORS.gray,
        textAlign: 'center',
        width: '100%'
    },
    listContainer: {
        marginTop: 20,
        width: '90%',
        alignSelf: 'center'
    },
    catRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: 15,
        marginBottom: 10,
        borderRadius: 15,
        ...SHADOWS.light
    },
    colorDot: {
        width: 15,
        height: 15,
        borderRadius: 8,
        marginRight: 10
    },
    catName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.black
    },
    catAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.black,
        textAlign: 'right'
    },
    catPercent: {
        fontSize: 12,
        color: COLORS.gray,
        textAlign: 'right'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalContent: {
        width: '80%',
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        maxWidth: 400
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20
    },
    monthItem: {
        paddingVertical: 15,
        width: '100%',
        alignItems: 'center',
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.lightGray
    },
    monthText: {
        fontSize: 16,
    },
    closeBtn: {
        marginTop: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
        backgroundColor: COLORS.primary
    },
    closeBtnText: {
        color: COLORS.white,
        fontWeight: 'bold'
    },
    pieWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: RESPONSIVE.hp(28),
        marginVertical: 15,
    },
    customLegendContainer: {
        width: '100%',
        marginTop: 10,
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 12,
    },
    legendName: {
        fontSize: RESPONSIVE.moderateScale(14),
        fontWeight: '500',
    },
    legendPercent: {
        fontSize: RESPONSIVE.moderateScale(14),
        fontWeight: 'bold',
    },
});

export default AnalysisScreen;
