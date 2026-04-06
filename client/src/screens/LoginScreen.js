import React, { useContext, useState, useRef, useEffect } from 'react';
import { Text } from '../components/Text';
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform, Animated, KeyboardAvoidingView, ScrollView, ActivityIndicator, StatusBar, useWindowDimensions, Alert } from 'react-native';
import ResponsiveContainer from '../components/ResponsiveContainer';
import CustomInput from '../components/CustomInput';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons as Icon } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, RESPONSIVE } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const { login } = useContext(AuthContext);
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
        if (!email || !password) {
            setErrorMsg('Please enter both email and password');
            return;
        }

        setIsSubmitting(true);
        const result = await login(email, password);
        setIsSubmitting(false);

        if (result && !result.success) {
            setErrorMsg(result.error);
        }
        // No navigation.replace needed — RootNavigator auto-switches to Home
        // when AuthContext sets user state after successful login
    };

    const clearTestData = async () => {
        try {
            await AsyncStorage.clear();
            Alert.alert("Success", "AsyncStorage cleared for testing! App is fully reset.");
        } catch(e){
            console.error(e);
        }
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
                        <Icon name="wallet" size={42} color="#4A00E0" />
                    </Animated.View>
                    
                    <Text style={styles.headerTitle}>Expense Tracker</Text>
                    <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>Smart Money Management</Text>
                </LinearGradient>

                {/* Content Section */}
                <Animated.View style={[styles.content, { transform: [{ translateY: slideAnim }] }]}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} bounces={false}>
                        <Text style={styles.welcomeTitle}>Welcome Back</Text>
                        <Text style={styles.welcomeSubtitle}>Sign in to your account</Text>

                        {errorMsg ? (
                            <View style={styles.errorBox}>
                                <Icon name="alert-circle" size={18} color="#FF4D6D" />
                                <Text style={styles.errorText}>{errorMsg}</Text>
                            </View>
                        ) : null}

                        <View style={styles.form}>
                            <CustomInput
                                placeholder="Email Address"
                                value={email}
                                onChangeText={setEmail}
                                iconName="mail-outline"
                                autoCapitalize="none"
                                containerStyle={styles.inputStyle}
                            />
                            <CustomInput
                                placeholder="Password"
                                value={password}
                                onChangeText={setPassword}
                                iconName="lock-closed-outline"
                                isPassword
                                containerStyle={styles.inputStyle}
                            />

                            <View style={styles.authActions} />

                            <TouchableOpacity 
                                style={styles.loginBtn} 
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
                                        <Text style={styles.loginBtnText}>LOGIN</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.signUpBtn}
                                onPress={() => navigation.navigate('Register')}
                            >
                                <Text style={styles.signUpText}>
                                    New here? <Text style={styles.signUpBold}>Sign Up</Text>
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={{ marginTop: 20, alignItems: 'center' }}
                                onPress={clearTestData}
                            >
                                <Text style={{ color: '#8E8E8E', fontSize: 12, textDecorationLine: 'underline' }}>Clear Storage (Dev Testing)</Text>
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
        height: RESPONSIVE.hp(38),
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 30,
        paddingBottom: 55, // Prevent overlap from the content's negative margin
        overflow: 'hidden'
    },
    blob: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 1000,
    },
    blob1: {
        width: 200,
        height: 200,
        top: -50,
        right: -50,
    },
    blob2: {
        width: 150,
        height: 150,
        bottom: 20,
        left: -30,
    },
    logoBox: {
        width: 80,
        height: 80,
        backgroundColor: '#fff',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 18,
        ...SHADOWS.medium
    },
    headerTitle: {
        fontSize: SCREEN_WIDTH > 400 ? 34 : 30,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 0.5
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 6,
        fontWeight: '600'
    },
    content: {
        flex: 1,
        backgroundColor: '#fff',
        marginTop: -55,
        borderTopLeftRadius: 45,
        borderTopRightRadius: 45,
        ...SHADOWS.large
    },
    scrollContent: {
        paddingTop: 45,
        paddingHorizontal: 28,
        paddingBottom: 40
    },
    welcomeTitle: {
        fontSize: 30,
        fontWeight: '900',
        color: '#1A1A1A',
        letterSpacing: -0.5
    },
    welcomeSubtitle: {
        fontSize: 16,
        color: '#8E8E8E',
        marginTop: 10,
        marginBottom: 35
    },
    form: {
        width: '100%'
    },
    inputStyle: {
        backgroundColor: '#F5F7FF',
        borderWidth: 0,
        borderRadius: 18,
        marginBottom: 10,
        height: 60
    },
    authActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 10,
    },
    biometricBtn: {
        width: 60,
        height: 60,
        borderRadius: 18,
        backgroundColor: COLORS.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.primary + '20',
    },
    forgotText: {
        color: COLORS.primary,
        fontWeight: '700',
        fontSize: 14,
    },
    loginBtn: {
        marginTop: 35,
        borderRadius: 18,
        overflow: 'hidden',
        ...SHADOWS.medium
    },
    btnGradient: {
        height: 64,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loginBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 2
    },
    signUpBtn: {
        marginTop: 30,
        alignItems: 'center',
        paddingBottom: 20
    },
    signUpText: {
        fontSize: 15,
        color: '#707070',
    },
    signUpBold: {
        color: '#4A00E0',
        fontWeight: '900'
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 77, 109, 0.1)',
        marginBottom: 20,
        gap: 12
    },
    errorText: {
        color: '#FF4D6D',
        fontSize: 13,
        fontWeight: '600'
    }
});

export default LoginScreen;
