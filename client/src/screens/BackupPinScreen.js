import React, { useState, useContext, useRef, useEffect } from 'react';
import { Text } from '../components/Text';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SHADOWS } from '../constants/theme';
import { SettingsContext } from '../context/SettingsContext';
import { ThemeContext } from '../context/ThemeContext';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const BackupPinScreen = () => {
    const navigation = useNavigation();
    const { toggleBiometric, saveBackupPin } = useContext(SettingsContext);
    const { theme, toggleSidebar } = useContext(ThemeContext);

    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    // Animation
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

    const handleSave = async () => {
        if (!pin || pin.length < 4) {
            Alert.alert('Error', 'PIN or Password must be at least 4 characters long.');
            return;
        }
        if (pin !== confirmPin) {
            Alert.alert('Error', 'PIN/Passwords do not match. Please try again.');
            return;
        }

        try {
            if (saveBackupPin) await saveBackupPin(pin);
            await toggleBiometric(true);
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to save security settings.');
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: theme.colors.background }]}
        >
            <View style={styles.headerCircle1} />
            <View style={styles.headerCircle2} />

            <Animated.View style={[styles.content, { backgroundColor: theme.colors.card, opacity: fadeAnim }]}>
                <View style={styles.iconBox}>
                    <Icon name="shield-checkmark" size={40} color={COLORS.primary} />
                </View>
                
                <Text style={[styles.title, { color: theme.colors.text }]}>Set Backup Security</Text>
                <Text style={[styles.subtitle, { color: theme.colors.subText }]}>
                    Create a fallback PIN or Password to keep your data safe if biometric check fails.
                </Text>

                <View style={styles.inputGroup}>
                    <View style={[styles.inputBox, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border }]}>
                        <Icon name="lock-closed-outline" size={20} color={theme.colors.subText} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: theme.colors.text }]}
                            placeholder="Enter PIN or Password"
                            placeholderTextColor={theme.colors.subText}
                            secureTextEntry
                            value={pin}
                            onChangeText={setPin}
                        />
                    </View>

                    <View style={[styles.inputBox, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border }]}>
                        <Icon name="checkbox-outline" size={20} color={theme.colors.subText} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: theme.colors.text }]}
                            placeholder="Confirm PIN or Password"
                            placeholderTextColor={theme.colors.subText}
                            secureTextEntry
                            value={confirmPin}
                            onChangeText={setConfirmPin}
                        />
                    </View>
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                    <LinearGradient
                        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                        style={styles.btnGradient}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.btnText}>Enable Secure Lock</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                    <Text style={[styles.cancelBtnText, { color: theme.colors.subText }]}>Maybe Later</Text>
                </TouchableOpacity>
            </Animated.View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, position: 'relative', overflow: 'hidden' },
    headerCircle1: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: COLORS.primary + '10', top: -50, right: -50 },
    headerCircle2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: COLORS.income + '10', bottom: -50, left: -50 },
    
    content: { width: '100%', maxWidth: 450, borderRadius: 32, padding: 32, alignItems: 'center', ...SHADOWS.large },
    iconBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    title: {  fontWeight: '800', marginBottom: 12, textAlign: 'center' },
    subtitle: {  fontWeight: '500', marginBottom: 30, textAlign: 'center', lineHeight: 20 },
    
    inputGroup: { width: '100%', gap: 16, marginBottom: 30 },
    inputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1.5, paddingHorizontal: 16, height: 58 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1,  fontWeight: '600', letterSpacing: 1 },
    
    saveBtn: { width: '100%', borderRadius: 18, overflow: 'hidden', ...SHADOWS.medium },
    btnGradient: { height: 60, justifyContent: 'center', alignItems: 'center' },
    btnText: { color: COLORS.white,  fontWeight: '800' },
    
    cancelBtn: { marginTop: 20, padding: 10 },
    cancelBtnText: {  fontWeight: '700' },
});

export default BackupPinScreen;
