import React, { useContext, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, useWindowDimensions, Platform, Pressable, ScrollView } from 'react-native';
import { Text } from '../components/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withSpring, 
    withTiming, 
    FadeIn, 
    SlideInDown,
    FadeOut,
    SlideOutDown 
} from 'react-native-reanimated';
import { COLORS, SIZES, SHADOWS, RESPONSIVE } from '../constants/theme';
import { ThemeContext } from '../context/ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ModernActionCard = ({ title, subtitle, icon, iconColor, bgColor, gradient, isNew, onPress, widthType, index, theme }) => {
    const scale = useSharedValue(1);
    
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.96);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1);
    };

    return (
        <AnimatedPressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onPress}
            entering={FadeIn.delay(100 * index).duration(400)}
            style={[
                styles.cardBase,
                { backgroundColor: theme.colors.card, width: widthType === 'half' ? '48%' : '100%' },
                animatedStyle
            ]}
        >
            <View style={styles.cardContent}>
                {gradient ? (
                    <LinearGradient colors={gradient} style={styles.iconBox}>
                        <Icon name={icon} size={26} color={COLORS.white} />
                    </LinearGradient>
                ) : (
                    <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
                        <Icon name={icon} size={28} color={iconColor} />
                    </View>
                )}
                
                <View style={styles.cardTextContainer}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{title}</Text>
                        {isNew && (
                            <View style={styles.newBadge}>
                                <Text style={styles.newBadgeText}>AI POWERED</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.cardSub, { color: theme.colors.subText }]}>{subtitle}</Text>
                </View>
                
                <Icon name="chevron-forward" size={18} color={theme.colors.subText} style={styles.arrow} />
            </View>
        </AnimatedPressable>
    );
};

const AddMenuScreen = ({ navigation }) => {
    const { theme } = useContext(ThemeContext);
    const { width, height } = useWindowDimensions();
    
    const isMobile = width < 600;
    
    const handleClose = () => {
        navigation.goBack();
    };

    const handleAction = (screen, params = {}) => {
        navigation.navigate(screen, params);
    };

    const containerStyle = useMemo(() => {
        if (isMobile) {
            return styles.sheetMobile;
        }
        return [styles.sheetTablet, { maxWidth: 600, width: '90%' }];
    }, [isMobile]);

    return (
        <View style={styles.overlay}>
            <Pressable style={styles.backdrop} onPress={handleClose} />
            
            <Animated.View 
                entering={SlideInDown.springify().damping(15)}
                exiting={SlideOutDown}
                style={[
                    styles.sheet, 
                    { backgroundColor: theme.colors.background },
                    containerStyle
                ]}
            >
                {/* Header Section */}
                <LinearGradient
                    colors={[COLORS.gradientStart, '#A56EFF', COLORS.gradientEnd]}
                    style={styles.header}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.headerCircle1} />
                    <View style={styles.headerCircle2} />

                    <View style={styles.headerContent}>
                        <View style={styles.headerText}>
                            <Text style={styles.headerTitle}>Create New</Text>
                            <Text style={styles.headerSubtitle}>What would you like to add?</Text>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                            <Icon name="close" size={24} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                <ScrollView 
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.gridContainer}>
                        <ModernActionCard
                            index={0}
                            title="Add Expense"
                            subtitle="Record a new purchase"
                            icon="trending-down"
                            iconColor={COLORS.expense}
                            bgColor={COLORS.expense + '15'}
                            widthType={isMobile ? 'full' : 'half'}
                            theme={theme}
                            onPress={() => handleAction('Add', { type: 'expense' })}
                        />
                        
                        <ModernActionCard
                            index={1}
                            title="Add Income"
                            subtitle="Money you received"
                            icon="trending-up"
                            iconColor={COLORS.income}
                            bgColor={COLORS.income + '15'}
                            widthType={isMobile ? 'full' : 'half'}
                            theme={theme}
                            onPress={() => handleAction('Add', { type: 'income' })}
                        />

                        <ModernActionCard
                            index={2}
                            title="Scan Receipt"
                            subtitle="Auto-extract details from bill photos"
                            icon="scan"
                            gradient={['#8E2DE2', '#4A00E0']}
                            isNew={true}
                            widthType="full"
                            theme={theme}
                            onPress={() => handleAction('Scanner')}
                        />

                        <ModernActionCard
                            index={3}
                            title="Set Budget Goal"
                            subtitle="Define monthly limits for categories"
                            icon="calendar"
                            iconColor={COLORS.white}
                            bgColor="#FFBB33"
                            widthType="full"
                            theme={theme}
                            onPress={() => handleAction('Plan')}
                        />
                    </View>
                </ScrollView>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.65)', 
        justifyContent: 'flex-end',
        alignItems: 'center'
    },
    backdrop: { ...StyleSheet.absoluteFillObject },
    sheet: {
        backgroundColor: '#fff',
        overflow: 'hidden',
        ...SHADOWS.large,
    },
    sheetMobile: {
        width: '100%',
        maxHeight: '90%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
    },
    sheetTablet: {
        borderRadius: 32,
        marginBottom: 40,
        maxHeight: '85%',
    },

    header: {
        paddingTop: 32,
        paddingBottom: 24,
        paddingHorizontal: 24,
        overflow: 'hidden',
    },
    headerCircle1: {
        position: 'absolute', width: 220, height: 220, borderRadius: 110,
        backgroundColor: 'rgba(255,255,255,0.06)', top: -100, right: -40,
    },
    headerCircle2: {
        position: 'absolute', width: 140, height: 140, borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.04)', bottom: -60, left: 10,
    },
    headerContent: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    headerTitle: { color: COLORS.white, fontSize: RESPONSIVE.moderateScale(28), fontWeight: '800', letterSpacing: -0.5 },
    headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: RESPONSIVE.moderateScale(15), fontWeight: '600', marginTop: 4 },
    closeBtn: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
    },

    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 16,
    },

    cardBase: {
        borderRadius: 24,
        padding: 16,
        ...SHADOWS.card,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconBox: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.light,
    },
    cardTextContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: RESPONSIVE.moderateScale(17),
        fontWeight: '800',
    },
    cardSub: {
        fontSize: RESPONSIVE.moderateScale(12),
        fontWeight: '500',
        lineHeight: 18,
    },
    arrow: {
        opacity: 0.5,
    },

    newBadge: {
        backgroundColor: '#E6E6FA',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#D8BFD8',
    },
    newBadgeText: {
        fontSize: RESPONSIVE.moderateScale(8),
        fontWeight: '900',
        color: '#4A00E0',
    },
});

export default AddMenuScreen;
