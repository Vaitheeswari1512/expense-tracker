import React, { useContext } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '../context/ThemeContext';
import { COLORS, RESPONSIVE } from '../constants/theme';

const ResponsiveContainer = ({ children, style, useSafeArea = true }) => {
    const { width } = useWindowDimensions();
    const { theme } = useContext(ThemeContext);
    const isWeb = Platform.OS === 'web';
    const isTablet = width > 768;
    const isDesktop = width > 1024;
    
    const containerStyle = [
        styles.container,
        { backgroundColor: theme.colors.background },
        isTablet && styles.tabletContainer,
        isDesktop && styles.desktopContainer,
        // On web/desktop, add a subtle border and shadow to the main container
        (isTablet || isWeb) && {
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: theme.colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.05,
            shadowRadius: 30,
            elevation: 5,
        },
        style
    ];

    const Content = useSafeArea ? (
        <SafeAreaView style={containerStyle} edges={['top', 'left', 'right']}>
            {children}
        </SafeAreaView>
    ) : (
        <View style={containerStyle}>
            {children}
        </View>
    );

    return (
        <View style={[styles.outerWrapper, { backgroundColor: theme.colors.background }]}>
            {isWeb ? (
                <LinearGradient
                    colors={[theme.colors.background, '#E8EFF9']}
                    style={styles.gradientBg}
                >
                    {Content}
                </LinearGradient>
            ) : Content}
        </View>
    );
};

const styles = StyleSheet.create({
    outerWrapper: {
        flex: 1,
        width: '100%',
        minHeight: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'flex-start',
        overflow: 'hidden'
    },
    gradientBg: {
        width: '100%',
        height: '100%',
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
        minHeight: '100%'
    },
    tabletContainer: {
        maxWidth: '95%',
    },
    desktopContainer: {
        maxWidth: 1600,
    }
});

export default ResponsiveContainer;
