import React, { useContext, useEffect, useRef } from 'react';
import { DefaultTheme, DarkTheme, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Text } from '../components/Text';
import { View, ActivityIndicator, useWindowDimensions, Platform, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants/theme';

import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { SettingsContext } from '../context/SettingsContext';

// Screens
// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen'; // To be mapped as 'Home'
import StatementScreen from '../screens/StatementScreen'; // To be mapped as 'Wallet'
import AnalysisScreen from '../screens/AnalysisScreen';   // To be mapped as 'Transactions'
import SettingsScreen from '../screens/SettingsScreen';
import ProfileDetailsScreen from '../screens/ProfileDetailsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import GeneralSettingsScreen from '../screens/GeneralSettingsScreen';
import DataManagementScreen from '../screens/DataManagementScreen';
import SupportScreen from '../screens/SupportScreen';
import BudgetGoalsScreen from '../screens/BudgetGoalsScreen'; // To be mapped as 'Plan'

import ScanReceiptScreen from '../screens/ScanReceiptScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import EditTransactionScreen from '../screens/EditTransactionScreen';
import BackupPinScreen from '../screens/BackupPinScreen';
import LoadingScreen from '../screens/LoadingScreen';
import ChatbotScreen from '../screens/ChatbotScreen';

const Stack = createNativeStackNavigator();
const isWeb = Platform.OS === 'web';

export const AuthStack = () => {
    return (
        <Stack.Navigator screenOptions={{ 
            headerShown: false,
            animation: 'slide_from_right'
        }} initialRouteName="Login">
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
    );
};

export const AppStack = () => {
    const { theme } = useContext(ThemeContext);
    return (
        <Stack.Navigator screenOptions={{ 
            headerShown: false, 
            animation: 'default'
        }} initialRouteName="Home">
            <Stack.Screen name="Home" component={DashboardScreen} />
            <Stack.Screen name="Wallet" component={StatementScreen} />
            <Stack.Screen name="Transactions" component={AnalysisScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />

            <Stack.Screen name="Add" component={AddTransactionScreen} />
            <Stack.Screen name="Scanner" component={ScanReceiptScreen} />
            <Stack.Screen name="EditTransaction" component={EditTransactionScreen} />
            <Stack.Screen name="ProfileDetails" component={ProfileDetailsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="GeneralSettings" component={GeneralSettingsScreen} />
            <Stack.Screen name="DataManagement" component={DataManagementScreen} />
            <Stack.Screen name="Support" component={SupportScreen} />
            <Stack.Screen name="Plan" component={BudgetGoalsScreen} />
            <Stack.Screen name="Chatbot" component={ChatbotScreen} />
            <Stack.Screen name="BackupPin" component={BackupPinScreen} options={{ presentation: 'modal' }} />
        </Stack.Navigator>
    );
};

const styles = StyleSheet.create({
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default AppStack;
