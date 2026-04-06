import React, { useContext, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { Text } from '../components/Text';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import { SettingsContext } from '../context/SettingsContext';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, SHADOWS, RESPONSIVE } from '../constants/theme';
import ResponsiveContainer from '../components/ResponsiveContainer';

const DataManagementScreen = () => {
    const navigation = useNavigation();
    const { theme } = useContext(ThemeContext);
    const { backupData, restoreData, fullAppReset, lastBackupDate } = useContext(SettingsContext);
    
    // UI state for loading
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    const handleBackup = async () => {
        setIsBackingUp(true);
        // Add a slight delay for better UI feedback
        setTimeout(async () => {
            await backupData();
            setIsBackingUp(false);
        }, 500);
    };

    const handleRestore = async () => {
        setIsRestoring(true);
        setTimeout(async () => {
            await restoreData();
            setIsRestoring(false);
        }, 500);
    };

    const handleFullReset = () => {
        fullAppReset();
    };

    const renderActionCard = ({ icon, color, title, subtitle, onPress, isLoading, isDanger }) => (
        <TouchableOpacity 
            style={[
                styles.actionCard, 
                { backgroundColor: isDanger ? theme.colors.card : theme.colors.card },
                isDanger && { borderColor: COLORS.danger + '40', borderWidth: 1 }
            ]} 
            onPress={onPress}
            activeOpacity={0.7}
            disabled={isLoading}
        >
            <View style={styles.cardLeft}>
                <View style={[styles.iconBox, { backgroundColor: isDanger ? COLORS.danger + '15' : color + '15' }]}>
                    {isLoading ? (
                        <ActivityIndicator color={isDanger ? COLORS.danger : color} size="small" />
                    ) : (
                        <Icon name={icon} size={24} color={isDanger ? COLORS.danger : color} />
                    )}
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.cardTitle, { color: isDanger ? COLORS.danger : theme.colors.heading }]}>{title}</Text>
                    <Text style={[styles.cardSubtitle, { color: theme.colors.subText }]}>{subtitle}</Text>
                </View>
            </View>
            <Icon name="chevron-forward" size={20} color={theme.colors.subText} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <ResponsiveContainer useSafeArea={false} style={{ flex: 1 }}>
                
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()} style={[styles.backBtn, { backgroundColor: theme.colors.card }]}>
                        <Icon name="menu" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.colors.heading }]}>Data Management</Text>
                    <View style={{ width: 40 }} /> {/* Spacer */}
                </View>

                <ScrollView 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={styles.scrollContent}
                >
                    <View style={styles.infoBox}>
                        <Icon name="information-circle-outline" size={20} color={COLORS.primary} style={{ marginTop: 2 }} />
                        <Text style={[styles.infoText, { color: theme.colors.text }]}>
                            Manage your app's data securely. You can backup your records to a file, restore from an existing backup, or completely reset the app.
                        </Text>
                    </View>

                    <Text style={[styles.sectionHeader, { color: theme.colors.subText }]}>BACKUP & RESTORE</Text>
                    
                    <View style={styles.cardGroup}>
                        {renderActionCard({
                            icon: 'cloud-upload-outline',
                            color: COLORS.primary,
                            title: 'Backup Data',
                            subtitle: lastBackupDate ? `Last backup: ${new Date(lastBackupDate).toLocaleDateString()}` : 'Securely save your data to cloud/device',
                            onPress: handleBackup,
                            isLoading: isBackingUp
                        })}
                        
                        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                        
                        {renderActionCard({
                            icon: 'cloud-download-outline',
                            color: '#A56EFF',
                            title: 'Restore Data',
                            subtitle: 'Import data from a backup file',
                            onPress: handleRestore,
                            isLoading: isRestoring
                        })}
                    </View>

                    <Text style={[styles.sectionHeader, { color: theme.colors.subText }]}>DANGER ZONE</Text>

                    <View style={styles.cardGroup}>
                        {renderActionCard({
                            icon: 'warning-outline',
                            color: COLORS.danger,
                            title: 'Full App Reset',
                            subtitle: 'Delete all data and log out',
                            onPress: handleFullReset,
                            isDanger: true
                        })}
                    </View>

                </ScrollView>
            </ResponsiveContainer>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: RESPONSIVE.wp(5),
        paddingVertical: RESPONSIVE.hp(2),
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.light,
    },
    headerTitle: {
        fontSize: RESPONSIVE.moderateScale(20),
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    scrollContent: {
        paddingHorizontal: RESPONSIVE.wp(5),
        paddingBottom: 40,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary + '10',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        marginTop: 8,
    },
    infoText: {
        flex: 1,
        marginLeft: 12,
        fontSize: RESPONSIVE.moderateScale(13),
        lineHeight: 20,
    },
    sectionHeader: {
        fontSize: RESPONSIVE.moderateScale(12),
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    cardGroup: {
        borderRadius: 20,
        overflow: 'hidden',
        ...SHADOWS.card,
        marginBottom: 32,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 18,
        paddingHorizontal: 16,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: RESPONSIVE.moderateScale(16),
        fontWeight: '700',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: RESPONSIVE.moderateScale(13),
        opacity: 0.8,
    },
    divider: {
        height: 1,
        width: '100%',
    }
});

export default DataManagementScreen;
