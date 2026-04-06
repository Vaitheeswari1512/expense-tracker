import React, { useContext } from 'react';
import { Text } from '../components/Text';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';

const LoadingScreen = () => {
    const { user, token, isLoading } = useContext(AuthContext);

    return (
        <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            style={styles.container}
        >
            <ActivityIndicator size="large" color="#FFF" />
            <Text style={styles.text}>Loading Expense Tracker...</Text>
            <Text style={styles.subText}>Auth loading: {isLoading ? 'true' : 'false'}</Text>
            <Text style={styles.subText}>User present: {user ? 'yes' : 'no'}</Text>
            <Text style={styles.subText}>Token present: {token ? 'yes' : 'no'}</Text>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        marginTop: 20,
        color: '#FFF',
        fontWeight: '600',
    },
    subText: {
        marginTop: 8,
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
    },
});

export default LoadingScreen;
