import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { Text } from './Text';
import { COLORS, SHADOWS, RESPONSIVE } from '../constants/theme';
import { Ionicons as Icon } from '@expo/vector-icons';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
        const message = error?.message || String(error) || 'Unknown error occurred';
        Alert.alert('App Error', message, [{ text: 'OK' }], { cancelable: true });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <View style={styles.content}>
                        <View style={styles.iconBox}>
                            <Icon name="alert-circle" size={80} color={COLORS.danger} />
                        </View>
                        <Text style={styles.title}>Something went wrong</Text>
                        <Text style={styles.subtitle}>
                            We encountered an unexpected error. This usually happens when data fails to load correctly.
                        </Text>
                        
                        <View style={styles.errorDetails}>
                            <Text style={styles.errorText}>{this.state.error?.toString()}</Text>
                        </View>

                        <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                            <Text style={styles.buttonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FE',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        width: '100%',
        maxWidth: 450,
        backgroundColor: '#FFFFFF',
        borderRadius: 30,
        padding: 30,
        alignItems: 'center',
        ...SHADOWS.large,
    },
    iconBox: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.danger + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: RESPONSIVE.moderateScale(24),
        fontWeight: '900',
        color: '#1A1A1A',
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: RESPONSIVE.moderateScale(16),
        color: '#666666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    errorDetails: {
        width: '100%',
        backgroundColor: '#FFF1F1',
        padding: 15,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#FFE0E0',
    },
    errorText: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 12,
        color: COLORS.danger,
    },
    button: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 16,
        ...SHADOWS.medium,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default ErrorBoundary;
