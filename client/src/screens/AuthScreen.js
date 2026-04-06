import React, { useContext, useState } from 'react';
import { Text } from '../components/Text';
import { View, TouchableOpacity, StyleSheet, Dimensions, Image, Platform } from 'react-native';
import ResponsiveContainer from '../components/ResponsiveContainer';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';

import { Ionicons as Icon } from '@expo/vector-icons';

import { AuthContext } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS, RESPONSIVE } from '../constants/theme';

const { width } = Dimensions.get('window');

const AuthScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const { login, register } = useContext(AuthContext);

    const handleSubmit = async () => {
        setErrorMsg('');
        
        if (!email || !password || (!isLogin && (!name || !confirmPassword || !phone))) {
            setErrorMsg('Please fill all fields');
            return;
        }

        if (!isLogin && password !== confirmPassword) {
            setErrorMsg('Passwords do not match');
            return;
        }

        setIsSubmitting(true);
        let result;
        if (isLogin) {
            result = await login(email, password);
        } else {
            result = await register(name, email, password, phone);
        }
        setIsSubmitting(false);

        if (result && !result.success) {
            setErrorMsg(result.error);
        }
    };

    const isWeb = Platform.OS === 'web';

    if (isWeb) {
        return (
            <View style={styles.webContainer}>
                <View style={styles.webContentWrapper}>
                    {/* Left Side: Branding */}
                    <View style={styles.webBrandingSide}>
                        <LinearGradient
                            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                            style={styles.webBrandingGradient}
                        >
                            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                <View style={{ 
                                    width: 80, 
                                    height: 80, 
                                    borderRadius: 20, 
                                    backgroundColor: COLORS.white + '20', 
                                    justifyContent: 'center', 
                                    alignItems: 'center',
                                    marginBottom: 15,
                                    borderWidth: 1,
                                    borderColor: COLORS.white + '40'
                                }}>
                                    <Icon name="wallet" size={40} color={COLORS.white} />
                                </View>
                                <Text style={styles.webAppTitle}>Expense Tracker</Text>
                            </View>
                        </LinearGradient>
                    </View>

                    {/* Right Side: Form */}
                    <View style={styles.webFormSide}>
                        <View style={styles.webFormContainer}>
                            <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>

                            {errorMsg ? (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorText}>{errorMsg}</Text>
                                </View>
                            ) : null}

                            <View style={styles.inputsWrapper}>
                                {!isLogin && (
                                    <>
                                        <CustomInput
                                            placeholder="Full Name"
                                            value={name}
                                            onChangeText={setName}
                                            iconName="person-outline"
                                        />
                                        <CustomInput
                                            placeholder="Phone Number"
                                            value={phone}
                                            onChangeText={setPhone}
                                            keyboardType="phone-pad"
                                            iconName="call-outline"
                                        />
                                    </>
                                )}

                                <CustomInput
                                    placeholder="Email Address"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    iconName="mail-outline"
                                />

                                <CustomInput
                                    placeholder="Password"
                                    value={password}
                                    onChangeText={setPassword}
                                    isPassword={true}
                                    iconName="lock-closed-outline"
                                />

                                {!isLogin && (
                                    <CustomInput
                                        placeholder="Confirm Password"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        isPassword={true}
                                        iconName="lock-closed-outline"
                                    />
                                )}
                            </View>

                            <CustomButton
                                text={isLogin ? 'LOG IN' : 'GET STARTED'}
                                onPress={handleSubmit}
                                containerStyle={styles.buttonStyle}
                                isLoading={isSubmitting}
                            />

                            <TouchableOpacity onPress={() => {
                                setIsLogin(!isLogin);
                                setErrorMsg('');
                            }} style={styles.toggleContainer}>
                                <Text style={styles.linkText}>
                                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                                    <Text style={styles.linkTextBold}>{isLogin ? "Register" : "Login"}</Text>
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <ResponsiveContainer style={{ backgroundColor: COLORS.background }} useSafeArea={false}>
            <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={{ 
                    width: 70, 
                    height: 70, 
                    borderRadius: 18, 
                    backgroundColor: COLORS.white + '20', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: COLORS.white + '40'
                }}>
                    <Icon name="wallet" size={35} color={COLORS.white} />
                </View>
                <Text style={styles.appTitle}>Expense Tracker</Text>
            </LinearGradient>

            <View style={styles.formWrapper}>
                <View style={styles.formContainer}>
                    <Text style={styles.title}>{isLogin ? 'Welcome Back!' : 'Create Account'}</Text>

                    {errorMsg ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{errorMsg}</Text>
                        </View>
                    ) : null}

                    <View style={styles.inputsWrapper}>
                        {!isLogin && (
                            <>
                                <CustomInput
                                    placeholder="Full Name"
                                    value={name}
                                    onChangeText={setName}
                                    iconName="person-outline"
                                />
                                <CustomInput
                                    placeholder="Phone Number"
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                    iconName="call-outline"
                                />
                            </>
                        )}

                        <CustomInput
                            placeholder="Email Address"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            iconName="mail-outline"
                        />

                        <CustomInput
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            isPassword={true}
                            iconName="lock-closed-outline"
                        />

                        {!isLogin && (
                            <CustomInput
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                isPassword={true}
                                iconName="lock-closed-outline"
                            />
                        )}
                    </View>

                    <CustomButton
                        text={isLogin ? 'LOGIN' : 'REGISTER'}
                        onPress={handleSubmit}
                        containerStyle={styles.buttonStyle}
                        isLoading={isSubmitting}
                    />

                    <TouchableOpacity onPress={() => {
                        setIsLogin(!isLogin);
                        setErrorMsg('');
                    }} style={styles.toggleContainer}>
                        <Text style={styles.linkText}>
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                            <Text style={styles.linkTextBold}>{isLogin ? "Register" : "Login"}</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ResponsiveContainer>
    );
};

const styles = StyleSheet.create({
    // Web Styles
    webContainer: {
        flex: 1,
        backgroundColor: '#F5F7FA',
        justifyContent: 'center',
        alignItems: 'center'
    },
    webContentWrapper: {
        flexDirection: 'row',
        width: 1000,
        height: 700,
        backgroundColor: COLORS.white,
        borderRadius: 30,
        overflow: 'hidden',
        ...SHADOWS.large
    },
    webBrandingSide: {
        flex: 1,
    },
    webBrandingGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40
    },
    webAppTitle: {
        fontSize: RESPONSIVE.moderateScale(32),
        fontWeight: '900',
        color: COLORS.white,
        marginBottom: 10
    },
    webAppSubtitle: {
        fontSize: RESPONSIVE.moderateScale(16),
        color: COLORS.white,
        textAlign: 'center',
        opacity: 0.9,
        lineHeight: 26
    },
    webFormSide: {
        flex: 1.2,
        justifyContent: 'center',
        padding: 60
    },
    webFormContainer: {
        width: '100%',
    },

    // Mobile Styles
    header: {
        height: 280,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        paddingTop: 40,
        zIndex: 1
    },
    appTitle: {
        fontSize: RESPONSIVE.moderateScale(28),
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1
    },
    formWrapper: {
        marginTop: -60,
        paddingHorizontal: 20,
        zIndex: 10,
        flex: 1
    },
    formContainer: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 24,
        ...SHADOWS.medium,
        marginBottom: 20
    },
    title: {
        fontSize: RESPONSIVE.moderateScale(24),
        fontWeight: 'bold',
        color: COLORS.black,
        marginBottom: 12
    },
    subtitle: {
        fontSize: RESPONSIVE.moderateScale(14),
        color: COLORS.gray,
        marginBottom: 32,
        opacity: 0.8
    },
    inputsWrapper: {
        gap: 8
    },
    errorContainer: {
        backgroundColor: '#FFE5E5',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#FF4444'
    },
    errorText: {
        color: '#D8000C',
        fontSize: RESPONSIVE.moderateScale(12),
        fontWeight: '500'
    },
    buttonStyle: {
        marginTop: 20,
        height: 60,
        borderRadius: 16
    },
    toggleContainer: {
        marginTop: 20,
        paddingVertical: 10
    },
    linkText: {
        color: COLORS.gray,
        textAlign: 'center',
        fontSize: RESPONSIVE.moderateScale(14),
    },
    linkTextBold: {
        color: COLORS.primary,
        fontWeight: 'bold'
    }
});

export default AuthScreen;
