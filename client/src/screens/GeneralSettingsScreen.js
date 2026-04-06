import React, { useContext, useState } from 'react';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Text } from '../components/Text';
import { View, StyleSheet, TouchableOpacity, ScrollView, Switch, Modal, FlatList, Alert, Platform, SafeAreaView } from 'react-native';
import { COLORS, SIZES, SHADOWS, RESPONSIVE } from '../constants/theme';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { SettingsContext } from '../context/SettingsContext';
import * as LocalAuthentication from 'expo-local-authentication';
import { AutoTrackerContext } from '../context/AutoTrackerContext';
import ResponsiveContainer from '../components/ResponsiveContainer';

const GeneralSettingsScreen = () => {
    const navigation = useNavigation();
    const { theme } = useContext(ThemeContext);
    const { logout } = useContext(AuthContext);
    const {
        t,
        currency, updateCurrency,
        isBiometricEnabled, toggleBiometric
    } = useContext(SettingsContext);

    const { 
        isSmsEnabled, 
        isUpiEnabled, 
        smsPermission,
        notificationPermission,
        smsDebugInfo,
        toggleSmsTracker, 
        toggleUpiTracker, 
        requestSmsPermission,
        requestNotificationAccess,
        status 
    } = useContext(AutoTrackerContext);

    const [modalVisible, setModalVisible] = useState(null); 

    const handleLogout = () => {
        Alert.alert(
            t('logout') || 'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', onPress: logout, style: 'destructive' }
            ]
        );
    };

    const currencies = [
        { code: 'USD', label: 'US Dollar ($)' },
        { code: 'INR', label: 'Indian Rupee (₹)' },
        { code: 'EUR', label: 'Euro (€)' }
    ];

    const handleBiometricToggle = async (value) => {
        if (value) {
            try {
                const hasHardware = await LocalAuthentication.hasHardwareAsync();
                const isEnrolled = await LocalAuthentication.isEnrolledAsync();

                if (!hasHardware || !isEnrolled) {
                    Alert.alert('Notice', 'Biometrics not set up. Please set a backup PIN.');
                    navigation.navigate('BackupPin');
                    return;
                }

                const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: 'Authenticate to enable Security Lock',
                    fallbackLabel: 'Use Passcode',
                });

                if (result.success) {
                    await toggleBiometric(true);
                } else {
                    navigation.navigate('BackupPin');
                }
            } catch (error) {
                navigation.navigate('BackupPin');
            }
        } else {
            toggleBiometric(false);
        }
    };

    const renderSettingRow = ({ icon, color, title, subtitle, value, onValueChange, onPress, isSwitch, showChevron }) => (
        <TouchableOpacity 
            style={[styles.row, { borderBottomColor: theme.colors.border }]} 
            onPress={onPress}
            disabled={isSwitch}
            activeOpacity={0.7}
        >
            <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                    <Icon name={icon} size={20} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{title}</Text>
                    {subtitle ? <Text style={[styles.rowSubtitle, { color: theme.colors.subText }]}>{subtitle}</Text> : null}
                </View>
            </View>
            {isSwitch ? (
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: "#E0E0E0", true: COLORS.primary }}
                    thumbColor={COLORS.white}
                />
            ) : (
                <View style={styles.rowRight}>
                    {value ? <Text style={styles.rowValue}>{value}</Text> : null}
                    {showChevron && <Icon name="chevron-forward" size={18} color={theme.colors.subText} />}
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <ResponsiveContainer useSafeArea={false} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.backBtn}>
                        <Icon name="menu" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Settings</Text>
                </View>

                <ScrollView 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Preferences Section */}
                    <Text style={[styles.sectionHeader, { color: theme.colors.subText }]}>PREFERENCES</Text>
                    <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                        {renderSettingRow({
                            icon: 'cash-outline',
                            color: COLORS.primary,
                            title: t('currency') || 'Currency',
                            value: currency,
                            onPress: () => setModalVisible('currency'),
                            showChevron: true
                        })}
                    </View>

                    {/* Automation & Tracking */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: RESPONSIVE.wp(6) }}>
                        <Text style={[styles.sectionHeader, { color: theme.colors.subText }]}>AUTOMATION</Text>
                        <Text style={{ fontSize: 10, fontWeight: '900', color: status === 'ACTIVE' ? COLORS.income : COLORS.danger, marginTop: 14 }}>
                            {status}
                        </Text>
                    </View>
                    <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                        {renderSettingRow({
                            icon: 'chatbubble-ellipses-outline',
                            color: '#2196F3',
                            title: 'SMS Tracker',
                            subtitle: 'Auto-detect bank transactions',
                            isSwitch: true,
                            value: isSmsEnabled,
                            onValueChange: toggleSmsTracker
                        })}
                        {renderSettingRow({
                            icon: 'shield-checkmark-outline',
                            color: '#8E24AA',
                            title: 'SMS Permission',
                            subtitle: smsPermission ? 'Granted for SMS tracking' : 'Required to read messages',
                            onPress: async () => {
                                if (!smsPermission) {
                                    const granted = await requestSmsPermission();
                                    if (!granted) {
                                        Alert.alert('Permission denied', 'Please grant SMS permission in the app settings to enable auto-tracking.');
                                    }
                                }
                            },
                            showChevron: !smsPermission
                        })}
                        {renderSettingRow({
                            icon: 'flash-outline',
                            color: '#FBC02D',
                            title: 'Auto-UPI Tracker',
                            subtitle: 'Track PhonePe, GPay, Paytm etc.',
                            isSwitch: true,
                            value: isUpiEnabled,
                            onValueChange: toggleUpiTracker
                        })}
                        {renderSettingRow({
                            icon: 'notifications-outline',
                            color: '#FFB300',
                            title: 'Notification Access',
                            subtitle: notificationPermission ? 'Enabled for UPI tracking' : 'Required to read UPI notifications',
                            onPress: () => {
                                Alert.alert(
                                    'Notification Access',
                                    'To automatically track UPI payments, please enable "Wallet App Notification Listener" in the settings page that opens.',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Enable Now', onPress: () => requestNotificationAccess() }
                                    ]
                                );
                            },
                            showChevron: true
                        })}
                    </View>

                    {smsDebugInfo ? (
                        <View style={[styles.debugPanel, { backgroundColor: theme.colors.card }]}> 
                            <Text style={[styles.debugTitle, { color: theme.colors.text }]}>SMS Debug Info</Text>
                            <Text style={[styles.debugText, { color: theme.colors.text }]}>Sender: {smsDebugInfo.sender}</Text>
                            <Text style={[styles.debugText, { color: theme.colors.text }]}>Status: {smsDebugInfo.status}</Text>
                            <Text style={[styles.debugText, { color: theme.colors.text }]}>Content: {smsDebugInfo.content}</Text>
                            {smsDebugInfo.amount ? <Text style={[styles.debugText, { color: theme.colors.text }]}>Amount: ₹{smsDebugInfo.amount}</Text> : null}
                            {smsDebugInfo.type ? <Text style={[styles.debugText, { color: theme.colors.text }]}>Type: {smsDebugInfo.type}</Text> : null}
                        </View>
                    ) : null}

                    {/* Security */}
                    <Text style={[styles.sectionHeader, { color: theme.colors.subText }]}>SECURITY</Text>
                    <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                        {renderSettingRow({
                            icon: 'finger-print-outline',
                            color: '#00D68F',
                            title: 'Biometric Lock',
                            subtitle: 'Secure your financial data',
                            isSwitch: true,
                            value: isBiometricEnabled,
                            onValueChange: handleBiometricToggle
                        })}
                    </View>

                    {/* Removed Data Management section at user request */}

                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Icon name="log-out-outline" size={20} color={COLORS.danger} />
                        <Text style={styles.logoutText}>Logout Session</Text>
                    </TouchableOpacity>
                </ScrollView>

                <Modal transparent visible={!!modalVisible} animationType="fade" onRequestClose={() => setModalVisible(null)}>
                    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(null)}>
                        <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Choose Currency</Text>
                                <TouchableOpacity onPress={() => setModalVisible(null)}>
                                    <Icon name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={currencies}
                                keyExtractor={item => item.code}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.modalItem, currency === item.code && { backgroundColor: COLORS.primary + '10' }]}
                                        onPress={() => { updateCurrency(item.code); setModalVisible(null); }}
                                    >
                                        <Text style={[styles.modalItemText, { color: theme.colors.text }, currency === item.code && { color: COLORS.primary, fontWeight: '700' }]}>{item.label}</Text>
                                        {currency === item.code && <Icon name="checkmark-circle" size={20} color={COLORS.primary} />}
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </TouchableOpacity>
                </Modal>
            </ResponsiveContainer>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: RESPONSIVE.wp(5),
        paddingTop: Platform.OS === 'android' ? 50 : RESPONSIVE.hp(2),
        paddingBottom: RESPONSIVE.hp(2),
    },
    backBtn: {
        padding: 8,
        borderRadius: 12,
        marginRight: 10,
    },
    headerTitle: {
        fontSize: RESPONSIVE.moderateScale(20),
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    sectionHeader: {
        fontSize: RESPONSIVE.moderateScale(12),
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 8,
        marginTop: 24,
        paddingHorizontal: RESPONSIVE.wp(6),
    },
    section: {
        borderRadius: 20,
        marginHorizontal: RESPONSIVE.wp(4),
        overflow: 'hidden',
        ...SHADOWS.card,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: RESPONSIVE.hp(2),
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    iconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    rowTitle: {
        fontSize: RESPONSIVE.moderateScale(16),
        fontWeight: '600',
    },
    rowSubtitle: {
        fontSize: RESPONSIVE.moderateScale(12),
        marginTop: 2,
        opacity: 0.7,
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rowValue: {
        fontSize: RESPONSIVE.moderateScale(14),
        fontWeight: '700',
        color: COLORS.primary,
        marginRight: 8,
    },
    debugPanel: {
        marginHorizontal: RESPONSIVE.wp(4),
        marginTop: RESPONSIVE.hp(2),
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    debugTitle: {
        fontSize: RESPONSIVE.moderateScale(14),
        fontWeight: '800',
        marginBottom: 8,
    },
    debugText: {
        fontSize: RESPONSIVE.moderateScale(13),
        marginBottom: 4,
        lineHeight: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        maxHeight: '60%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: RESPONSIVE.moderateScale(18),
        fontWeight: '800',
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 14,
        marginBottom: 4,
    },
    modalItemText: {
        fontSize: RESPONSIVE.moderateScale(16),
    },
    logoutButton: {
        marginTop: 40,
        marginHorizontal: RESPONSIVE.wp(4),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 18,
        backgroundColor: COLORS.danger + '10',
        borderWidth: 1,
        borderColor: COLORS.danger + '20',
    },
    logoutText: {
        color: COLORS.danger,
        fontSize: RESPONSIVE.moderateScale(16),
        fontWeight: '700',
        marginLeft: 8,
    },
});

export default GeneralSettingsScreen;
