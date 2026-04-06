import React, { useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    useWindowDimensions,
    Platform,
    Pressable,
    ScrollView,
    Modal,
    Animated,
} from 'react-native';
import { Text } from '../components/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, SHADOWS, RESPONSIVE } from '../constants/theme';

// ─── Individual Action Card ────────────────────────────────────────────────────
const ActionCard = ({ title, subtitle, icon, gradient, iconBg, iconColor, badge, onPress, delay }) => {
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 350,
                delay,
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                delay,
                speed: 14,
                bounciness: 6,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handlePressIn = () =>
        Animated.spring(scale, { toValue: 0.96, speed: 50, bounciness: 4, useNativeDriver: true }).start();
    const handlePressOut = () =>
        Animated.spring(scale, { toValue: 1, speed: 50, bounciness: 4, useNativeDriver: true }).start();

    return (
        <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={onPress}
                style={styles.card}
            >
                {/* Icon Box */}
                <View style={styles.iconWrapper}>
                    {gradient ? (
                        <LinearGradient colors={gradient} style={styles.iconBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                            <Icon name={icon} size={22} color={COLORS.white} />
                        </LinearGradient>
                    ) : (
                        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                            <Icon name={icon} size={22} color={iconColor} />
                        </View>
                    )}
                </View>

                {/* Text */}
                <View style={styles.cardText}>
                    <View style={styles.cardTitleRow}>
                        <Text style={styles.cardTitle}>{title}</Text>
                        {badge && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{badge}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.cardSubtitle}>{subtitle}</Text>
                </View>

                {/* Chevron */}
                <View style={styles.chevronWrap}>
                    <Icon name="chevron-forward" size={18} color="rgba(108,99,255,0.4)" />
                </View>
            </Pressable>
        </Animated.View>
    );
};

// ─── Bottom Sheet Modal ────────────────────────────────────────────────────────
const AddMenuModal = ({ visible, onClose, navigation, theme }) => {
    const { width } = useWindowDimensions();
    const translateY = useRef(new Animated.Value(600)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    const sheetMaxWidth = Math.min(width, 480);

    /* Open / close animations */
    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    damping: 18,
                    mass: 0.9,
                    stiffness: 120,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 600,
                    duration: 280,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const handleAction = (screen, params = {}) => {
        onClose();
        setTimeout(() => navigation.navigate(screen, params), 180);
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            {/* Backdrop */}
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            {/* Sheet */}
            <View style={styles.overlay} pointerEvents="box-none">
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: theme?.colors?.card || '#FFFFFF',
                            width: sheetMaxWidth,
                            transform: [{ translateY }],
                        },
                    ]}
                >
                    {/* Drag Handle */}
                    <View style={styles.handleWrap}>
                        <View style={styles.handle} />
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={[styles.headerTitle, { color: theme?.colors?.heading || COLORS.darkText }]}>
                                Add New
                            </Text>
                            <Text style={[styles.headerSubtitle, { color: theme?.colors?.subText || COLORS.gray }]}>
                                What would you like to add?
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                            <Icon name="close" size={18} color={theme?.colors?.text || COLORS.darkText} />
                        </TouchableOpacity>
                    </View>

                    {/* Divider */}
                    <View style={[styles.divider, { backgroundColor: theme?.colors?.border || 'rgba(0,0,0,0.06)' }]} />

                    {/* Scrollable Cards */}
                    <ScrollView
                        contentContainerStyle={styles.cardList}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        <ActionCard
                            delay={60}
                            title="Expense"
                            subtitle="Record a purchase or bill"
                            icon="trending-down-outline"
                            iconBg={COLORS.expense + '18'}
                            iconColor={COLORS.expense}
                            onPress={() => handleAction('Add', { type: 'expense' })}
                        />

                        <ActionCard
                            delay={130}
                            title="Income"
                            subtitle="Add a salary, gift, or earning"
                            icon="trending-up-outline"
                            iconBg={COLORS.income + '18'}
                            iconColor={COLORS.income}
                            onPress={() => handleAction('Add', { type: 'income' })}
                        />

                        <ActionCard
                            delay={200}
                            title="Scan Receipt"
                            subtitle="Auto-extract amount from a photo"
                            icon="scan-outline"
                            gradient={['#8E2DE2', '#4A00E0']}
                            onPress={() => handleAction('Scanner')}
                        />

                        {/* Bottom safe-area spacer */}
                        <View style={{ height: Platform.OS === 'ios' ? 18 : 10 }} />
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    /* Backdrop */
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.52)',
    },

    /* Sheet container — anchors to bottom */
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    sheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 10,
        ...SHADOWS.large,
        overflow: 'hidden',
    },

    /* Drag handle */
    handleWrap: {
        alignItems: 'center',
        paddingTop: 6,
        paddingBottom: 4,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(0,0,0,0.12)',
    },

    /* Header */
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 10,
    },
    headerTitle: {
        fontSize: RESPONSIVE.moderateScale(19),
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: RESPONSIVE.moderateScale(12),
        fontWeight: '500',
        marginTop: 2,
        opacity: 0.65,
    },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(0,0,0,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    /* Divider */
    divider: {
        height: 1,
        marginHorizontal: 16,
        marginBottom: 4,
    },

    /* Card list */
    cardList: {
        paddingHorizontal: 12,
        paddingTop: 4,
    },

    /* Card */
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 8,
        backgroundColor: 'rgba(108,99,255,0.04)',
        borderWidth: 1.5,
        borderColor: 'rgba(108,99,255,0.08)',
    },

    /* Icon */
    iconWrapper: {
        marginRight: 12,
    },
    iconBox: {
        width: 46,
        height: 46,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.light,
    },

    /* Card text */
    cardText: {
        flex: 1,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        marginBottom: 3,
    },
    cardTitle: {
        fontSize: RESPONSIVE.moderateScale(16),
        fontWeight: '700',
        color: COLORS.darkText,
        letterSpacing: -0.2,
    },
    cardSubtitle: {
        fontSize: RESPONSIVE.moderateScale(12),
        fontWeight: '500',
        color: COLORS.gray,
        lineHeight: 17,
    },

    /* AI badge */
    badge: {
        backgroundColor: '#EDE7FF',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#C4B5FD',
    },
    badgeText: {
        fontSize: RESPONSIVE.moderateScale(9),
        fontWeight: '800',
        color: '#4A00E0',
        letterSpacing: 0.3,
    },

    /* Chevron */
    chevronWrap: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: 'rgba(108,99,255,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default AddMenuModal;
