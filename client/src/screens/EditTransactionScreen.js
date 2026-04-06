import React, { useState, useContext } from 'react';
import { Text } from '../components/Text';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Platform } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS, RESPONSIVE } from '../constants/theme';
import { getCategoryIcon } from '../constants/icons';
import { Ionicons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EditTransactionScreen = ({ route, navigation }) => {
    const { transaction } = route.params;
    const { BASE_URL, token } = useContext(AuthContext);
    const { theme } = useContext(ThemeContext);

    const [amount, setAmount] = useState(transaction.amount.toString());
    const [category, setCategory] = useState(transaction.category);
    const [description, setDescription] = useState(transaction.description || '');
    const [type, setType] = useState(transaction.type);

    const handleUpdate = async () => {
        if (!amount || !category) {
            Alert.alert('Error', 'Please fill in Amount and Category');
            return;
        }

        try {
            // 1. Update Backend
            const response = await fetch(`${BASE_URL}/transactions/${transaction._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token
                },
                body: JSON.stringify({
                    amount: Number(amount),
                    category,
                    description,
                    type,
                    date: transaction.date // Keep same date or use existing
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to update transaction');

            // 2. Update Local Storage
            const existingData = await AsyncStorage.getItem('transactions');
            let transactions = existingData ? JSON.parse(existingData) : [];
            
            const updatedIndex = transactions.findIndex(t => t._id === transaction._id);
            if (updatedIndex !== -1) {
                transactions[updatedIndex] = result;
                await AsyncStorage.setItem('transactions', JSON.stringify(transactions));
            }

            if (Platform.OS === 'web') {
                alert('Transaction Updated');
            } else {
                Alert.alert('Success', 'Transaction Updated');
            }
            
            navigation.reset({
                index: 0,
                routes: [{ name: 'Wallet' }],
            });
        } catch (e) {
            console.log("Update Error:", e);
            Alert.alert('Error', `Could not update: ${e.message}`);
        }
    };

    const handleDelete = async () => {
        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to delete this transaction?")) {
                await performDelete();
            }
        } else {
            Alert.alert(
                "Delete Transaction",
                "Are you sure you want to delete this?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: performDelete
                    }
                ]
            );
        }
    };

    const performDelete = async () => {
        try {
            // 1. Delete from Backend
            const response = await fetch(`${BASE_URL}/transactions/${transaction._id}`, {
                method: 'DELETE',
                headers: {
                    'auth-token': token
                }
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || 'Failed to delete transaction');
            }

            // 2. Delete from Local Storage
            const existingData = await AsyncStorage.getItem('transactions');
            let transactions = existingData ? JSON.parse(existingData) : [];
            const updated = transactions.filter(item => item._id !== transaction._id);
            await AsyncStorage.setItem('transactions', JSON.stringify(updated));

            if (Platform.OS !== 'web') {
                Alert.alert('Success', 'Transaction Removed');
            } else {
                alert('Transaction Removed');
            }
            navigation.reset({
                index: 0,
                routes: [{ name: 'Wallet' }],
            });
        } catch (e) {
            console.log("Delete Request Failed:", e);
            const msg = `Could not delete: ${e.message}`;
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
        }
    };

    return (
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={{ maxWidth: 1200, width: '90%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center' }}>
                    
                    <TouchableOpacity onPress={() => navigation.openDrawer()} style={{ marginRight: 15, padding: 5 }}>
                        <Icon name="menu" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Transaction</Text>
                </View>
            </LinearGradient>

            <View style={styles.formContainer}>
                <View style={[styles.typeContainer, { backgroundColor: theme.colors.card }]}>
                    <TouchableOpacity
                        style={[styles.typeButton, type === 'expense' && styles.activeTypeExpense]}
                        onPress={() => setType('expense')}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Icon name="arrow-up-circle-outline" size={20} color={type === 'expense' ? COLORS.white : COLORS.expense} style={{ marginRight: 5 }} />
                            <Text style={[styles.typeText, type === 'expense' && styles.activeTypeText, type !== 'expense' && { color: theme.colors.subText }]}>Expense</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.typeButton, type === 'income' && styles.activeTypeIncome]}
                        onPress={() => setType('income')}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Icon name="arrow-down-circle-outline" size={20} color={type === 'income' ? COLORS.white : COLORS.income} style={{ marginRight: 5 }} />
                            <Text style={[styles.typeText, type === 'income' && styles.activeTypeText, type !== 'income' && { color: theme.colors.subText }]}>Income</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.subText }]}>Amount</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text }]}
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

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.subText }]}>Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 5 }}>
                        {Object.keys(COLORS.categoryColors).map((cat) => {
                            if (cat === 'Others') return null;
                            const isSelected = category === cat;
                            return (
                                <TouchableOpacity
                                    key={cat}
                                    onPress={() => setCategory(cat)}
                                    style={{ alignItems: 'center', marginRight: 20 }}
                                >
                                    <View style={[
                                        styles.categoryCircle,
                                        isSelected ?
                                            { backgroundColor: COLORS.categoryColors[cat], ...SHADOWS.medium, shadowColor: COLORS.categoryColors[cat] } :
                                            { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }
                                    ]}>
                                        {getCategoryIcon(cat, 24, isSelected ? COLORS.white : COLORS.categoryColors[cat])}
                                    </View>
                                    <Text style={[
                                        styles.categoryLabel,
                                        { color: isSelected ? theme.colors.text : theme.colors.subText, fontWeight: isSelected ? 'bold' : 'normal' }
                                    ]}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.subText }]}>Description</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text }]}
                        placeholder="Description"
                        placeholderTextColor={theme.colors.subText}
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
                    <LinearGradient
                        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                        style={styles.gradientBtn}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.ButtonText}>Update</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={[styles.ButtonText, { color: COLORS.white }]}>Delete</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: COLORS.background
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? RESPONSIVE.hp(7) : RESPONSIVE.hp(5),
        paddingBottom: RESPONSIVE.hp(3),
        paddingHorizontal: RESPONSIVE.wp(5),
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTitle: {
        fontSize: RESPONSIVE.moderateScale(24),
        fontWeight: 'bold',
        color: COLORS.white,
        textAlign: 'center'
    },
    formContainer: {
        padding: 20,
        marginTop: -20
    },
    typeContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        justifyContent: 'space-between',
        backgroundColor: COLORS.white,
        padding: 5,
        borderRadius: SIZES.radius,
        ...SHADOWS.light
    },
    typeButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 15,
        alignItems: 'center',
    },
    activeTypeExpense: {
        backgroundColor: COLORS.expense,
    },
    activeTypeIncome: {
        backgroundColor: COLORS.income,
    },
    typeText: {
        
        color: COLORS.gray,
        fontWeight: 'bold'
    },
    activeTypeText: {
        color: COLORS.white,
    },
    inputGroup: {
        marginBottom: 20
    },
    label: {
        
        color: COLORS.gray,
        marginBottom: 8,
        marginLeft: 5
    },
    input: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: 15,
        
        ...SHADOWS.light,
        color: COLORS.black
    },
    updateButton: {
        marginTop: 20,
        borderRadius: SIZES.radius,
        overflow: 'hidden',
        ...SHADOWS.medium
    },
    gradientBtn: {
        padding: 18,
        alignItems: 'center',
        justifyContent: 'center'
    },
    deleteButton: {
        backgroundColor: COLORS.danger,
        padding: 18,
        borderRadius: SIZES.radius,
        alignItems: 'center',
        marginTop: 15,
        ...SHADOWS.medium
    },
    ButtonText: {
        color: COLORS.white,
        
        fontWeight: 'bold'
    },
    categoryCircle: {
        width: RESPONSIVE.moderateScale(60),
        height: RESPONSIVE.moderateScale(60),
        borderRadius: RESPONSIVE.moderateScale(30),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8
    },
    categoryLabel: {
        fontSize: RESPONSIVE.moderateScale(12),
        textAlign: 'center'
    }
});

export default EditTransactionScreen;
