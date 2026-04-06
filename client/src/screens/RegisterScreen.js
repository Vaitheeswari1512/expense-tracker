import React, { useContext, useState, useRef, useEffect } from 'react';
import { Text } from '../components/Text';
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform, ScrollView, Animated, KeyboardAvoidingView, ActivityIndicator, StatusBar, useWindowDimensions, Alert } from 'react-native';
import ResponsiveContainer from '../components/ResponsiveContainer';
import CustomInput from '../components/CustomInput';
import { Ionicons as Icon } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, RESPONSIVE } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const RegisterScreen = ({ navigation }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const { register } = useContext(AuthContext);
    const { theme } = useContext(ThemeContext);

    // Animations
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const logoPulse = useRef(new Animated.Value(1)).current;
    const blob1Anim = useRef(new Animated.Value(0)).current;
    const blob2Anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entry Animation
        Animated.spring(slideAnim, {
            toValue: 0,
            tension: 20,
            friction: 7,
            useNativeDriver: true
        }).start();

        // Logo Pulse
        Animated.loop(
            Animated.sequence([
                Animated.timing(logoPulse, { toValue: 1.1, duration: 1500, useNativeDriver: true }),
                Animated.timing(logoPulse, { toValue: 1, duration: 1500, useNativeDriver: true })
            ])
        ).start();

        // Background Blobs Floating
        const createFloatingAnim = (anim) => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, { toValue: 1, duration: 4000, useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 0, duration: 4000, useNativeDriver: true })
                ])
            ).start();
        };
        createFloatingAnim(blob1Anim);
        createFloatingAnim(blob2Anim);
    }, []);

    const handleSubmit = async () => {
        setErrorMsg('');
        if (!name || !email || !password || !phone || !confirmPassword) {
            setErrorMsg('Please fill all fields');
            return;
        }
        if (password !== confirmPassword) {
            setErrorMsg('Passwords do not match');
            return;
        }

        setIsSubmitting(true);
        const result = await register(name, email, password, phone);
        setIsSubmitting(false);

        if (result && !result.success) {
            setErrorMsg(result.error || 'Registration failed');
        }
        // No navigation.replace needed — RootNavigator auto-switches to Home
        // when AuthContext sets user state after successful registration
    };

    const blob1Style = {
        transform: [
            { translateX: blob1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }) },
            { translateY: blob1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) }
        ]
    };

    const blob2Style = {
        transform: [
            { translateX: blob2Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) },
            { translateY: blob2Anim.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }) }
        ]
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <ResponsiveContainer style={{ flex: 1, backgroundColor: '#8E2DE2' }} useSafeArea={false}>
                {/* Header Section */}
                <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]}
                    style={styles.header}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    {/* Floating Background Blobs */}
                    <Animated.View style={[styles.blob, styles.blob1, blob1Style]} />
                    <Animated.View style={[styles.blob, styles.blob2, blob2Style]} />

                    <Animated.View style={[styles.logoBox, { transform: [{ scale: logoPulse }] }]}>
                        <Icon name="person-add" size={42} color={COLORS.primary} />
                    </Animated.View>
                    
                    <Text style={styles.headerTitle}>Create Account</Text>
                    <Text style={styles.headerSubtitle}>Join our financial community</Text>
                </LinearGradient>

                {/* Content Section */}
                <Animated.View style={[styles.content, { transform: [{ translateY: slideAnim }] }]}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} bounces={false}>
                        <Text style={styles.welcomeTitle}>Get Started</Text>
                        <Text style={styles.welcomeSubtitle}>Sign up to manage your expenses</Text>

                        {errorMsg ? (
                            <View style={styles.errorBox}>
                                <Icon name="alert-circle" size={18} color="#FF4D6D" />
                                <Text style={styles.errorText}>{errorMsg}</Text>
                            </View>
                        ) : null}

                        <View style={styles.form}>
                            <CustomInput placeholder="Full Name" value={name} onChangeText={setName} iconName="person-outline" containerStyle={styles.inputStyle} />
                            <CustomInput placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" iconName="call-outline" containerStyle={styles.inputStyle} />
                            <CustomInput placeholder="Email Address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" iconName="mail-outline" containerStyle={styles.inputStyle} />
                            <CustomInput placeholder="Password" value={password} onChangeText={setPassword} isPassword iconName="lock-closed-outline" containerStyle={styles.inputStyle} />
                            <CustomInput placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} isPassword iconName="shield-checkmark-outline" containerStyle={styles.inputStyle} />

                            <TouchableOpacity 
                                style={styles.submitBtn} 
                                onPress={handleSubmit}
                                disabled={isSubmitting}
                            >
                                <LinearGradient
                                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                                    style={styles.btnGradient}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>SIGN UP</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.loginLink}
                                onPress={() => navigation.navigate('Login')}
                            >
                                <Text style={styles.loginText}>
                                    Already a member? <Text style={styles.loginBold}>Log In</Text>
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </Animated.View>
            </ResponsiveContainer>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        height: RESPONSIVE.hp(32),
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 20,
        paddingBottom: 50, // Prevent overlap from the content's negative margin
        overflow: 'hidden'
    },
    blob: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 1000,
    },
    blob1: {
        width: 180,
        height: 180,
        top: -40,
        left: -40,
    },
    blob2: {
        width: 130,
        height: 130,
        bottom: 10,
        right: -20,
    },
    logoBox: {
        width: 70,
        height: 70,
        backgroundColor: '#fff',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        ...SHADOWS.medium
    },
    headerTitle: {
        fontSize: SCREEN_WIDTH > 400 ? 30 : 26,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 0.5
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 4,
        fontWeight: '600'
    },
    content: {
        flex: 1,
        backgroundColor: '#fff',
        marginTop: -50,
        borderTopLeftRadius: 45,
        borderTopRightRadius: 45,
        ...SHADOWS.large
    },
    scrollContent: {
        paddingTop: 40,
        paddingHorizontal: 28,
        paddingBottom: 40
    },
    welcomeTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: '#1A1A1A',
        letterSpacing: -0.5
    },
    welcomeSubtitle: {
        fontSize: 15,
        color: '#8E8E8E',
        marginTop: 8,
        marginBottom: 30
    },
    form: {
        width: '100%'
    },
    inputStyle: {
        backgroundColor: '#F5F7FF',
        borderWidth: 0,
        borderRadius: 15,
        marginBottom: 12,
        height: 55
    },
    submitBtn: {
        marginTop: 25,
        borderRadius: 16,
        overflow: 'hidden',
        ...SHADOWS.medium
    },
    btnGradient: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center'
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1.5
    },
    loginLink: {
        marginTop: 25,
        alignItems: 'center',
        paddingBottom: 20
    },
    loginText: {
        fontSize: 14,
        color: '#707070',
    },
    loginBold: {
        color: '#4A00E0',
        fontWeight: '900'
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 77, 109, 0.1)',
        marginBottom: 15,
        gap: 10
    },
    errorText: {
        color: '#FF4D6D',
        fontSize: 13,
        fontWeight: '600'
    }
});

export default RegisterScreen;
