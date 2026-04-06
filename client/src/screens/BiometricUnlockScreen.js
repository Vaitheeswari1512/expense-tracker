import React, { useEffect, useState, useContext, useRef } from 'react';
import { Text } from '../components/Text';
import { View, StyleSheet, TouchableOpacity, TextInput, Alert, Platform, Animated, useWindowDimensions } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { SettingsContext } from '../context/SettingsContext';
import { ThemeContext } from '../context/ThemeContext';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS, RESPONSIVE } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const BiometricUnlockScreen = () => {
    const { unlockApp, backupPin } = useContext(SettingsContext);
    const { theme } = useContext(ThemeContext);
    const { width } = useWindowDimensions();

    const [failedAttempts, setFailedAttempts] = useState(0);
    const [showPinInput, setShowPinInput] = useState(false);
    const [pin, setPin] = useState('');

    // Animation
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
        if (!showPinInput) {
            handleBiometricAuth();
        }
    }, [showPinInput]);

    const handleBiometricAuth = async () => {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!hasHardware || !isEnrolled) {
                setShowPinInput(true);
                return;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock Expense Tracker',
                fallbackLabel: 'Use PIN',
            });

            if (result.success) {
                unlockApp();
            } else {
                setFailedAttempts(prev => {
                    const nextAttempts = prev + 1;
                    if (nextAttempts >= 2) setShowPinInput(true);
                    return nextAttempts;
                });
            }
        } catch (error) {
            setShowPinInput(true);
        }
    };

    const handlePinSubmit = () => {
        if (pin === backupPin) {
            unlockApp();
        } else {
            // Shake animation
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
            ]).start();
            setPin('');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.headerCircle1} />
            <View style={styles.headerCircle2} />

            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateX: shakeAnim }] }]}>
                <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                    style={styles.logoBox}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                    <Icon name="lock-closed" size={44} color={COLORS.white} />
                </LinearGradient>

                <Text style={[styles.title, { color: theme.colors.text }]}>Safe & Secure</Text>
                
                {showPinInput ? (
                    <View style={styles.formSection}>
                        <Text style={[styles.subtitle, { color: theme.colors.subText }]}>Enter your backup PIN or Password to unlock your vault</Text>
                        
                        <View style={[styles.inputBox, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: theme.colors.text }]}
                                value={pin}
                                onChangeText={setPin}
                                secureTextEntry
                                placeholder="••••"
                                placeholderTextColor={theme.colors.subText}
                                keyboardType="default"
                                autoFocus
                                onSubmitEditing={handlePinSubmit}
                            />
                        </View>

                        <TouchableOpacity style={styles.unlockBtn} onPress={handlePinSubmit}>
                            <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.btnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                <Text style={styles.btnText}>Unlock Vault</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleBiometricAuth} style={styles.switchBtn}>
                            <Icon name="finger-print" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                            <Text style={styles.switchBtnText}>Try Biometrics</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.biometricSection}>
                        <Text style={[styles.subtitle, { color: theme.colors.subText }]}>Verify your identity to access your financial dashboard</Text>
                        
                        <TouchableOpacity style={styles.biometricCircle} onPress={handleBiometricAuth}>
                            <View style={styles.pulseBox1} />
                            <View style={styles.pulseBox2} />
                            <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.fingerBox}>
                                <Icon name="finger-print" size={48} color={COLORS.white} />
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowPinInput(true)} style={styles.fallbackBtn}>
                            <Text style={[styles.fallbackText, { color: COLORS.primary }]}>Use Backup PIN</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, position: 'relative', overflow: 'hidden' },
    headerCircle1: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: COLORS.primary + '08', top: -50, right: -50 },
    headerCircle2: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: COLORS.income + '08', bottom: -50, left: -50 },

    content: { alignItems: 'center', width: '100%', maxWidth: 400 },
    logoBox: { width: 90, height: 90, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 24, ...SHADOWS.medium },
    title: { fontSize: RESPONSIVE.moderateScale(32), fontWeight: '900', marginBottom: 12, letterSpacing: -0.5 },
    subtitle: { fontSize: RESPONSIVE.moderateScale(18), fontWeight: '500', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20, marginBottom: 40 },

    formSection: { width: '100%', alignItems: 'center' },
    inputBox: { width: '100%', height: 64, borderRadius: 20, borderWidth: 1.5, justifyContent: 'center', paddingHorizontal: 20, marginBottom: 24 },
    input: {  textAlign: 'center', fontWeight: '800', letterSpacing: 8 },
    
    unlockBtn: { width: '100%', borderRadius: 18, overflow: 'hidden', ...SHADOWS.medium },
    btnGradient: { height: 60, justifyContent: 'center', alignItems: 'center' },
    btnText: { color: COLORS.white,  fontWeight: '800' },
    footerText: { fontSize: RESPONSIVE.moderateScale(12), color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
    
    switchBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 24 },
    switchBtnText: { color: COLORS.primary, fontWeight: '800', },

    biometricSection: { width: '100%', alignItems: 'center' },
    biometricCircle: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center', marginBottom: 40, position: 'relative' },
    pulseBox1: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: COLORS.primary + '15' },
    pulseBox2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary + '25' },
    fingerBox: { width: 80, height: 80, borderRadius: 30, justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },
    
    fallbackBtn: { marginTop: 20 },
    fallbackText: {  fontWeight: '800' },
});

export default BiometricUnlockScreen;
