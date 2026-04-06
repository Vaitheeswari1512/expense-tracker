import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Cap font scale reference width to 450px on web to prevent gigantic text on desktop monitors
const scaleWidth = isWeb ? Math.min(width, 450) : width;

const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

export const RESPONSIVE = {
    wp: (percentage) => (width * percentage) / 100,
    hp: (percentage) => (height * percentage) / 100,
    fs: (percentage) => (scaleWidth * percentage) / 100,
    
    // Standard scaling functions for React Native
    // Capped to scaleWidth (450px max on web) to prevent oversized elements
    scale: (size) => (scaleWidth / guidelineBaseWidth) * size,
    verticalScale: (size) => (height / guidelineBaseHeight) * size,
    moderateScale: (size, factor = 0.5) => size + ((scaleWidth / guidelineBaseWidth) * size - size) * factor,
};

export const COLORS = {
    // Primary brand colors - fintech purple/indigo palette
    primary: '#6C63FF',           // Vibrant purple
    primaryLight: '#8B83FF',
    primaryDark: '#4A3FFF',
    gradientStart: '#6C63FF',     // Purple
    gradientEnd: '#48CAE4',       // Teal
    gradientMid: '#A56EFF',       // Mid purple

    // Secondary accent
    accent: '#FF6584',            // Pink accent
    accentBlue: '#48CAE4',        // Teal/cyan

    // Background tones
    background: '#F0F2FF',        // Light lavender background
    backgroundCard: '#FFFFFF',

    // Text
    white: '#FFFFFF',
    black: '#0D0D1A',
    darkText: '#1A1A2E',
    gray: '#6B7280',
    lightGray: '#E8EAF6',
    muted: '#A0A8C0',

    // Status colors
    income: '#00D68F',            // Vibrant teal-green
    expense: '#FF4D6D',           // Vivid coral-red
    danger: '#FF3361',
    success: '#00D68F',
    warning: '#FFB800',

    // Gradient presets
    incomeGradient: ['#00D68F', '#00B4D8'],
    expenseGradient: ['#FF4D6D', '#FF8C42'],
    balanceGradient: ['#6C63FF', '#48CAE4'],
    aiGradient: ['#A56EFF', '#6C63FF'],

    // Category colors - vibrant
    categoryColors: {
        Food: '#FF7043',
        Grocery: '#4CAF50',
        Travel: '#2196F3',
        Fuel: '#FF5722',
        Medicine: '#00BCD4',
        Clothes: '#9C27B0',
        Entertainment: '#E91E63',
        Shopping: '#FF007F',
        Salary: '#00BFA5',
        Scanner: '#607D8B',
        Others: '#78909C',
        Gift: '#FF8F00',
        Utilities: '#1976D2',
        Health: '#43A047',
        Education: '#7B1FA2',
    },
};

export const SIZES = {
    base: 8,
    font: 14,
    radius: 20,
    radiusSm: 12,
    radiusLg: 24,
    padding: 20,
    paddingLg: 28,
    h1: 30,
    h2: 22,
    h3: 18,
    h4: 15,
    body1: 30,
    body2: 22,
    body3: 16,
    body4: 14,
    body5: 12,
};

export const SHADOWS = {
    light: {
        shadowColor: '#6C63FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    medium: {
        shadowColor: '#6C63FF',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 20,
        elevation: 8,
    },
    large: {
        shadowColor: '#6C63FF',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 15,
    },
    card: {
        shadowColor: '#A0A8C0',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 6,
    },
};

export default { COLORS, SIZES, SHADOWS, RESPONSIVE };
