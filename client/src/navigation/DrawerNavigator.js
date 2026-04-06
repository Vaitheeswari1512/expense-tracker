import React, { useContext, useState, useCallback } from 'react';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { Text } from '../components/Text';
import { View, StyleSheet, TouchableOpacity, Platform, useWindowDimensions, Image } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { COLORS, RESPONSIVE } from '../constants/theme';
import { AppStack } from './AppNavigator';
import AddMenuModal from '../components/AddMenuModal';

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props) {
    const [addMenuVisible, setAddMenuVisible] = useState(false);
    const { width } = useWindowDimensions();
    const { user, logout } = useContext(AuthContext);
    const { theme, isDarkMode, toggleTheme } = useContext(ThemeContext);

    const userName = user?.name ? user.name : 'User';
    const userEmail = user?.email ? user.email : '';

    return (
        <View style={[styles.drawerContainer, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.profileSection, { backgroundColor: COLORS.primary + '10' }]}>
                <View style={[styles.avatarCircle, { backgroundColor: COLORS.primary, overflow: 'hidden' }]}>
                    {user?.profileImage ? (
                        <View style={{ width: '100%', height: '100%' }}>
                            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View style={{ width: '100%', height: '100%' }}>
                                <Icon name="person" size={RESPONSIVE.moderateScale(24)} color="#fff" style={{ position: 'absolute', opacity: 0 }} />
                                <View style={{ width: '100%', height: '100%' }}>
                                    {Platform.OS === 'web' ? (
                                        <img src={user.profileImage} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 25 }} alt="Profile" />
                                    ) : (
                                        <Image source={{ uri: user.profileImage }} style={{ width: '100%', height: '100%', borderRadius: 25 }} />
                                    )}
                                </View>
                            </View>
                        </View>
                    ) : (
                        <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
                    )}
                </View>
                <View style={styles.profileTextContainer}>
                    <Text style={[styles.profileName, { color: theme.colors.heading }]}>{userName}</Text>
                    <Text style={[styles.profileEmail, { color: theme.colors.subText }]}>{userEmail}</Text>
                </View>
            </View>
            <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 10 }}>
                <View style={styles.menuSection}>
                    <DrawerItem
                        label="Home"
                        icon={({ color, size }) => <Icon name="home-outline" size={size} color={color} />}
                        onPress={() => props.navigation.navigate('Root', { screen: 'Home' })}
                        activeTintColor={COLORS.primary}
                        inactiveTintColor={theme.colors.text}
                    />
                    <DrawerItem
                        label="Wallet"
                        icon={({ color, size }) => <Icon name="wallet-outline" size={size} color={color} />}
                        onPress={() => props.navigation.navigate('Root', { screen: 'Wallet' })}
                        activeTintColor={COLORS.primary}
                        inactiveTintColor={theme.colors.text}
                    />
                    <DrawerItem
                        label="Transactions"
                        icon={({ color, size }) => <Icon name="file-tray-full-outline" size={size} color={color} />}
                        onPress={() => props.navigation.navigate('Root', { screen: 'Transactions' })}
                        activeTintColor={COLORS.primary}
                        inactiveTintColor={theme.colors.text}
                    />
                    <DrawerItem
                        label="Budget Plan"
                        icon={({ color, size }) => <Icon name="list-outline" size={size} color={color} />}
                        onPress={() => props.navigation.navigate('Root', { screen: 'Plan' })}
                        activeTintColor={COLORS.primary}
                        inactiveTintColor={theme.colors.text}
                    />
                    <DrawerItem
                        label="Settings"
                        icon={({ color, size }) => <Icon name="settings-outline" size={size} color={color} />}
                        onPress={() => props.navigation.navigate('Root', { screen: 'Settings' })}
                        activeTintColor={COLORS.primary}
                        inactiveTintColor={theme.colors.text}
                    />

                    <DrawerItem
                        label="Add New"
                        icon={({ color, size }) => <Icon name="add-circle-outline" size={size} color={color} />}
                        onPress={() => { props.navigation.closeDrawer(); setTimeout(() => setAddMenuVisible(true), 200); }}
                        activeTintColor={COLORS.primary}
                        inactiveTintColor={theme.colors.text}
                    />
                </View>
                {/* Bottom sheet modal rendered inside drawer content */}
                <AddMenuModal
                    visible={addMenuVisible}
                    onClose={() => setAddMenuVisible(false)}
                    navigation={{
                        navigate: (screen, params) =>
                            props.navigation.navigate('Root', { screen, params }),
                    }}
                    theme={theme}
                />
            </DrawerContentScrollView>
            
            <View style={[styles.footerSection, { borderTopColor: theme.colors.border }]}>
                <TouchableOpacity onPress={toggleTheme} style={styles.footerBtn}>
                    <Icon name={isDarkMode ? 'sunny-outline' : 'moon-outline'} size={22} color={theme.colors.text} />
                    <Text style={[styles.footerBtnText, { color: theme.colors.text }]}>
                        {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={async () => {
                    await logout();
                    props.navigation.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                    });
                }} style={[styles.footerBtn, { backgroundColor: COLORS.danger + '10' }]}>
                    <Icon name="log-out-outline" size={22} color={COLORS.danger} />
                    <Text style={[styles.footerBtnText, { color: COLORS.danger, fontWeight: 'bold' }]}>Logout</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default function DrawerNavigator({ currentRouteName }) {
    const { width } = useWindowDimensions();
    const { user } = useContext(AuthContext);
    const { theme } = useContext(ThemeContext);

    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={({ navigation }) => ({
                headerShown: false,
                headerLeft: () => (
                    <TouchableOpacity onPress={() => navigation.openDrawer()} style={{ marginLeft: 16, marginTop: 16 }}>
                        <Icon name="menu" size={28} color={theme?.colors?.text || COLORS.primary} />
                    </TouchableOpacity>
                ),
                headerTitle: '',
                headerTitleStyle: {
                    fontFamily: 'System',
                    fontSize: 14,
                },
                headerStyle: { 
                    backgroundColor: theme?.colors?.background || '#fff', 
                    elevation: 0, 
                    shadowOpacity: 0,
                    borderBottomWidth: 0
                },
                drawerType: width > 900 ? 'permanent' : 'front',
                drawerStyle: { 
                    width: width > 900 ? 300 : Math.min(width * 0.8, 300),
                    borderRightWidth: 1,
                    borderColor: theme?.colors?.border || 'rgba(0,0,0,0.05)'
                },
                sceneContainerStyle: { backgroundColor: theme?.colors?.background }
            })}
        >
            <Drawer.Screen name="Root" component={AppStack} />
        </Drawer.Navigator>
    );
}

const styles = StyleSheet.create({
    drawerContainer: { flex: 1 },
    profileSection: {
        padding: RESPONSIVE.moderateScale(20),
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)'
    },
    avatarCircle: {
        width: RESPONSIVE.moderateScale(50), 
        height: RESPONSIVE.moderateScale(50), 
        borderRadius: RESPONSIVE.moderateScale(25),
        justifyContent: 'center', alignItems: 'center',
        marginRight: 15
    },
    avatarText: { color: '#fff',  fontWeight: 'bold' },
    profileTextContainer: { flex: 1 },
    profileName: {  fontWeight: 'bold' },
    profileEmail: {  marginTop: 2 },
    menuSection: { paddingHorizontal: 10 },
    footerSection: {
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        borderTopWidth: 1,
    },
    footerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginBottom: 8
    },
    footerBtnText: {
        marginLeft: 15,
        
        fontWeight: '600'
    }
});
