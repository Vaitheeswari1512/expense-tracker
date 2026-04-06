import React, { useContext } from 'react';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Text } from '../components/Text';
import { View, StyleSheet, TouchableOpacity, ScrollView, Switch, Platform, Alert, useWindowDimensions, Image } from 'react-native';
import ResponsiveContainer from '../components/ResponsiveContainer';

import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, SHADOWS, RESPONSIVE, SIZES } from '../constants/theme';
import { SettingsContext } from '../context/SettingsContext';

const isWeb = Platform.OS === 'web';

const SettingsScreen = () => {
    const navigation = useNavigation();
    const { logout, user } = useContext(AuthContext);
    const { isDarkMode, toggleTheme, theme } = useContext(ThemeContext);
    const { 
        t 
    } = useContext(SettingsContext);
    const { width } = useWindowDimensions();

    const handleLogout = () => {
        Alert.alert(
            t('logout') || 'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', onPress: async () => {
                    await logout();
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                    });
                }, style: 'destructive' }
            ]
        );
    };

    const menuItems = [
        {
            label: t('profile_details') || 'Profile Details',
            icon: 'person-outline',
            color: COLORS.primary,
            action: () => navigation.navigate('ProfileDetails')
        },
        {
            label: t('settings') || 'Settings',
            icon: 'settings-outline',
            color: '#3F729B',
            action: () => navigation.navigate('GeneralSettings')
        },
        {
            label: t('notifications') || 'Notifications',
            icon: 'notifications-outline',
            color: '#FFBB33',
            action: () => navigation.navigate('Notifications')
        },
    ];

    const renderMenuItem = (item, index) => (
        <TouchableOpacity 
            key={index} 
            style={[styles.menuItem, { borderBottomColor: theme.colors.border }]} 
            onPress={item.action}
            activeOpacity={0.7}
        >
            <View style={styles.menuLeft}>
                <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                    <Icon name={item.icon} size={RESPONSIVE.moderateScale(20)} color={item.color} />
                </View>
                <Text style={[styles.menuText, { color: theme.colors.text }]}>{item.label}</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={theme.colors.subText} />
        </TouchableOpacity>
    );

    return (
        <ResponsiveContainer style={{ backgroundColor: theme.colors.background }} useSafeArea={false}>
            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
            >
                <LinearGradient
                    colors={[COLORS.gradientStart, '#A56EFF', COLORS.gradientEnd]}
                    style={styles.header}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.headerContent}>
                        <TouchableOpacity 
                            onPress={() => navigation.dispatch(DrawerActions.openDrawer())} 
                            style={styles.menuBtn}
                        >
                            <Icon name="menu" size={26} color={COLORS.white} />
                        </TouchableOpacity>
                        <View style={styles.profileInfo}>
                            <View style={[styles.avatarContainer, { overflow: 'hidden' }]}>
                                {user?.profileImage ? (
                                    <Image source={{ uri: user.profileImage }} style={{ width: '100%', height: '100%' }} />
                                ) : (
                                    <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
                                )}
                            </View>
                            <Text style={styles.name}>{user?.name || 'User'}</Text>
                            <Text style={styles.email}>{user?.email || 'user@example.com'}</Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.contentContainer}>
                    <View style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}>
                        {menuItems.map((item, index) => renderMenuItem(item, index))}

                        {/* Dark Mode Switch */}
                        <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
                            <View style={styles.menuLeft}>
                                <View style={[styles.iconBox, { backgroundColor: '#4285F415' }]}>
                                    <Icon name={isDarkMode ? "moon" : "moon-outline"} size={20} color="#4285F4" />
                                </View>
                                <Text style={[styles.menuText, { color: theme.colors.text }]}>{t('dark_mode') || 'Dark Mode'}</Text>
                            </View>
                            <Switch
                                trackColor={{ false: "#E0E0E0", true: COLORS.primary }}
                                thumbColor={COLORS.white}
                                onValueChange={toggleTheme}
                                value={isDarkMode}
                            />
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={styles.logoutButton} 
                        onPress={handleLogout}
                        activeOpacity={0.8}
                    >
                        <Icon name="log-out-outline" size={22} color={COLORS.danger} />
                        <Text style={styles.logoutText}>{t('logout') || 'Logout'}</Text>
                    </TouchableOpacity>

                    <Text style={[styles.versionText, { color: theme.colors.subText }]}>Version 1.0.4</Text>
                </View>
            </ScrollView>
        </ResponsiveContainer>
    );
};

const styles = StyleSheet.create({
    scrollContent: { 
        flexGrow: 1, 
        paddingBottom: RESPONSIVE.hp(5) 
    },
    header: {
        paddingTop: isWeb ? RESPONSIVE.hp(4) : RESPONSIVE.hp(8),
        paddingBottom: RESPONSIVE.hp(6),
        paddingHorizontal: RESPONSIVE.wp(5),
    },
    headerContent: {
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
        alignItems: 'center',
    },
    menuBtn: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    profileInfo: {
        alignItems: 'center',
    },
    avatarContainer: {
        width: RESPONSIVE.moderateScale(90),
        height: RESPONSIVE.moderateScale(90),
        borderRadius: RESPONSIVE.moderateScale(45),
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.white,
        marginBottom: 16,
        ...SHADOWS.medium,
    },
    avatarText: {
        fontSize: RESPONSIVE.moderateScale(32),
        fontWeight: 'bold',
        color: COLORS.white,
    },
    name: {
        fontSize: RESPONSIVE.moderateScale(22),
        fontWeight: '800',
        color: COLORS.white,
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    email: {
        fontSize: RESPONSIVE.moderateScale(14),
        color: 'rgba(255,255,255,0.85)',
        fontWeight: '500',
    },
    contentContainer: {
        paddingHorizontal: RESPONSIVE.wp(5),
        marginTop: -RESPONSIVE.hp(3),
        maxWidth: 800,
        width: '100%',
        alignSelf: 'center',
    },
    sectionCard: {
        borderRadius: 24,
        paddingVertical: 8,
        paddingHorizontal: 8,
        ...SHADOWS.large,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: RESPONSIVE.hp(2),
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconBox: {
        width: RESPONSIVE.moderateScale(42),
        height: RESPONSIVE.moderateScale(42),
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuText: {
        fontSize: RESPONSIVE.moderateScale(16),
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    logoutButton: {
        marginTop: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 77, 109, 0.1)',
        height: RESPONSIVE.moderateScale(58),
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 77, 109, 0.15)',
    },
    logoutText: {
        color: COLORS.danger,
        fontSize: RESPONSIVE.moderateScale(18),
        fontWeight: '800',
        marginLeft: 12,
    },
    versionText: {
        textAlign: 'center',
        marginTop: 24,
        fontSize: RESPONSIVE.moderateScale(12),
        fontWeight: '500',
        opacity: 0.6,
    }
});

export default SettingsScreen;
