import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from './Text';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, SHADOWS, RESPONSIVE } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const InsightsCard = ({ title, insight, type, onPress }) => {
    const getIcon = () => {
        switch (type) {
            case 'warning': return 'warning-outline';
            case 'trend': return 'trending-up-outline';
            case 'forecast': return 'calendar-outline';
            case 'anomaly': return 'alert-circle-outline';
            default: return 'analytics-outline';
        }
    };

    const getColors = () => {
        switch (type) {
            case 'warning': return ['#FF8800', '#FFBB33'];
            case 'anomaly': return ['#FF4D6D', '#FF758F'];
            case 'trend': return ['#6C63FF', '#8D86FF'];
            default: return [COLORS.gradientStart, COLORS.gradientEnd];
        }
    };

    return (
        <TouchableOpacity 
            style={[styles.container, { borderLeftColor: getColors()[0] }]} 
            onPress={onPress}
            activeOpacity={0.9}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: getColors()[0] + '15' }]}>
                    <Icon name={getIcon()} size={20} color={getColors()[0]} />
                </View>
                <Text style={styles.title}>{title}</Text>
            </View>
            <Text style={styles.insightText}>{insight}</Text>
            <View style={styles.footer}>
                <Text style={styles.actionText}>Ask Antigravity</Text>
                <Icon name="chevron-forward" size={14} color={COLORS.primary} />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        padding: 16,
        marginBottom: 15,
        borderLeftWidth: 4,
        ...SHADOWS.small
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    title: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.primary,
        letterSpacing: -0.5
    },
    insightText: {
        fontSize: 14,
        lineHeight: 20,
        color: '#666',
        fontWeight: '500',
        marginBottom: 12
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end'
    },
    actionText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
        marginRight: 4
    }
});

export default InsightsCard;
