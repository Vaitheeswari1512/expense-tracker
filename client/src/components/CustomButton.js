import React from 'react';
import { Text } from './Text';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

const CustomButton = ({ text, onPress, containerStyle, isLoading }) => {
    return (
        <TouchableOpacity style={[styles.button, containerStyle]} onPress={onPress} disabled={isLoading}>
            <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                style={styles.gradientBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                {isLoading ? (
                    <ActivityIndicator color={COLORS.white} />
                ) : (
                    <Text style={styles.buttonText}>{text}</Text>
                )}
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: SIZES.radius,
        overflow: 'hidden',
        ...SHADOWS.medium,
        width: '100%'
    },
    gradientBtn: {
        padding: 15,
        alignItems: 'center',
        justifyContent: 'center'
    },
    buttonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        
        letterSpacing: 1
    }
});

export default CustomButton;
