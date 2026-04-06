import React, { useState, useEffect, useRef } from 'react';
import { Text } from './Text';
import { View, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, useWindowDimensions, Animated } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { generateFinSightResponse } from '../utils/finSightAI';

const QUICK_PROMPTS = [
    '📊 Analyze my spending',
    '💰 How can I save more?',
    '📈 Income vs Expense',
    '🎯 Budget tips',
];

const TypingIndicator = () => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const anim = (dot, delay) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, { toValue: -6, duration: 350, useNativeDriver: true }),
                    Animated.timing(dot, { toValue: 0, duration: 350, useNativeDriver: true }),
                    Animated.delay(600),
                ])
            ).start();
        anim(dot1, 0);
        anim(dot2, 180);
        anim(dot3, 360);
    }, []);

    return (
        <View style={styles.typingBubble}>
            {[dot1, dot2, dot3].map((dot, i) => (
                <Animated.View key={i} style={[styles.typingDot, { transform: [{ translateY: dot }] }]} />
            ))}
        </View>
    );
};

const AIChatModal = ({ visible, onClose, theme, transactions, totalIncome, totalExpense, totalBalance, formatCurrency }) => {
    const { width, height } = useWindowDimensions();
    const isLargeScreen = width > 768;

    const [messages, setMessages] = useState([
        {
            id: '1',
            text: "Hello! I'm your Expense Tracker ✨\n\nI'm here to help you understand your finances better. Ask me anything about your spending, budget, or savings goals!",
            sender: 'ai',
            time: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const flatListRef = useRef();
    const slideAnim = useRef(new Animated.Value(height)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0, tension: 60, friction: 12, useNativeDriver: true
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: height, duration: 250, useNativeDriver: true
            }).start();
        }
    }, [visible]);

    const generateAIResponse = (text) =>
        generateFinSightResponse(text, { totalIncome, totalExpense, totalBalance, transactions, formatCurrency });

    const sendMessage = (text) => {
        const trimmed = (text || input).trim();
        if (!trimmed) return;

        const userMsg = { id: Date.now().toString(), text: trimmed, sender: 'user', time: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        setTimeout(() => {
            const aiReplyText = generateAIResponse(trimmed);
            const aiMsg = { id: (Date.now() + 1).toString(), text: aiReplyText, sender: 'ai', time: new Date() };
            setMessages(prev => [...prev, aiMsg]);
            setIsTyping(false);
        }, 1000 + Math.random() * 500);
    };

    const formatTime = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderMessage = ({ item, index }) => {
        const isUser = item.sender === 'user';
        return (
            <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAI]}>
                {!isUser && (
                    <LinearGradient
                        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                        style={styles.aiAvatar}
                    >
                        <Icon name="sparkles" size={14} color={COLORS.white} />
                    </LinearGradient>
                )}
                <View style={styles.msgContent}>
                    <View style={[
                        styles.bubble,
                        isUser ? styles.userBubble : [styles.aiBubble, { backgroundColor: theme.colors.card }]
                    ]}>
                        {!isUser && (
                            <Text style={[styles.aiSenderLabel, { color: COLORS.primary }]}>Expense Tracker</Text>
                        )}
                        <Text style={[
                            styles.bubbleText,
                            isUser ? styles.userBubbleText : { color: theme.colors.text }
                        ]}>
                            {item.text}
                        </Text>
                    </View>
                    <Text style={[styles.msgTime, { color: theme.colors.subText }, isUser && { textAlign: 'right' }]}>
                        {formatTime(item.time)}
                    </Text>
                </View>
                {isUser && (
                    <View style={[styles.userAvatar, { backgroundColor: COLORS.primary + '20' }]}>
                        <Icon name="person" size={14} color={COLORS.primary} />
                    </View>
                )}
            </View>
        );
    };

    return (
        <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
            <View style={[styles.overlay, isLargeScreen && styles.overlayCenter]}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={isLargeScreen ? styles.largeWrapper : { flex: 1, justifyContent: 'flex-end' }}
                >
                    <Animated.View style={[
                        styles.sheet,
                        { backgroundColor: theme.colors.background },
                        isLargeScreen && styles.sheetLarge,
                        { transform: [{ translateY: slideAnim }] }
                    ]}>
                        {/* Header */}
                        <LinearGradient
                            colors={['#1A0533', '#2D1065', '#4A1FA8']}
                            style={styles.chatHeader}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            {/* Glows */}
                            <View style={styles.headerGlow1} />
                            <View style={styles.headerGlow2} />

                            <View style={styles.chatHeaderLeft}>
                                <LinearGradient
                                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                                    style={styles.headerAIIcon}
                                >
                                    <Icon name="sparkles" size={20} color={COLORS.white} />
                                </LinearGradient>
                                <View>
                                    <Text style={styles.headerChatTitle}>Expense Tracker</Text>
                                    <View style={styles.onlineRow}>
                                        <View style={styles.onlineDot} />
                                        <Text style={styles.onlineText}>Online • Ready to help</Text>
                                    </View>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                                <Icon name="close" size={20} color="rgba(255,255,255,0.8)" />
                            </TouchableOpacity>
                        </LinearGradient>

                        {/* Messages */}
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.chatList}
                            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                            showsVerticalScrollIndicator={false}
                            renderItem={renderMessage}
                            ListFooterComponent={isTyping ? (
                                <View style={styles.msgRowAI}>
                                    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.aiAvatar}>
                                        <Icon name="sparkles" size={14} color={COLORS.white} />
                                    </LinearGradient>
                                    <TypingIndicator />
                                </View>
                            ) : (
                                // Quick prompts when no user message yet
                                messages.length <= 1 ? (
                                    <View style={styles.quickPromptsWrap}>
                                        <Text style={[styles.quickPromptsLabel, { color: theme.colors.subText }]}>Quick prompts</Text>
                                        <View style={styles.quickPromptsRow}>
                                            {QUICK_PROMPTS.map(p => (
                                                <TouchableOpacity
                                                    key={p}
                                                    style={[styles.quickPromptBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                                                    onPress={() => sendMessage(p)}
                                                >
                                                    <Text style={[styles.quickPromptText, { color: theme.colors.text }]} numberOfLines={2}>{p}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                ) : null
                            )}
                        />

                        {/* Input */}
                        <View style={[styles.inputRow, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
                            <View style={[styles.inputWrap, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]}>
                                <TextInput
                                    style={[styles.textInput, { color: theme.colors.text }]}
                                    placeholder="Ask about your finances..."
                                    placeholderTextColor={theme.colors.subText}
                                    value={input}
                                    onChangeText={setInput}
                                    onSubmitEditing={() => sendMessage()}
                                    returnKeyType="send"
                                    multiline
                                    maxLength={300}
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.sendBtn, !input.trim() && { opacity: 0.45 }]}
                                onPress={() => sendMessage()}
                                disabled={!input.trim() || isTyping}
                            >
                                <LinearGradient
                                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                                    style={styles.sendGradient}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                >
                                    <Icon name="send" size={18} color={COLORS.white} />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'flex-end',
    },
    overlayCenter: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    largeWrapper: { justifyContent: 'center', alignItems: 'center', flex: 1 },
    sheet: {
        width: '100%',
        height: '88%',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
        ...SHADOWS.large,
    },
    sheetLarge: {
        width: 560,
        height: 680,
        maxWidth: '92%',
        maxHeight: '90%',
        borderRadius: 28,
    },

    // Header
    chatHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 18, paddingTop: 22, overflow: 'hidden',
    },
    headerGlow1: {
        position: 'absolute', width: 150, height: 150, borderRadius: 75,
        backgroundColor: 'rgba(108,99,255,0.3)', top: -60, right: -20,
    },
    headerGlow2: {
        position: 'absolute', width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(72,202,228,0.2)', bottom: -30, left: 60,
    },
    chatHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerAIIcon: {
        width: 42, height: 42, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
    },
    headerChatTitle: { color: COLORS.white,  fontWeight: '800' },
    onlineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    onlineDot: {
        width: 7, height: 7, borderRadius: 4, backgroundColor: '#00D68F', marginRight: 5,
    },
    onlineText: { color: 'rgba(255,255,255,0.6)',  fontWeight: '500' },
    closeBtn: {
        width: 36, height: 36, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },

    // Messages
    chatList: { padding: 16, paddingBottom: 8 },
    msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16, gap: 8 },
    msgRowUser: { justifyContent: 'flex-end' },
    msgRowAI: { justifyContent: 'flex-start' },
    aiAvatar: {
        width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
        flexShrink: 0,
    },
    userAvatar: {
        width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
        flexShrink: 0,
    },
    msgContent: { maxWidth: '78%' },
    bubble: {
        borderRadius: 18, padding: 14,
        ...SHADOWS.light,
    },
    aiBubble: { borderBottomLeftRadius: 4 },
    userBubble: {
        borderBottomRightRadius: 4,
        backgroundColor: COLORS.primary,
    },
    aiSenderLabel: {  fontWeight: '700', marginBottom: 4 },
    bubbleText: {  lineHeight: 21, fontWeight: '400' },
    userBubbleText: { color: COLORS.white },
    msgTime: {  marginTop: 4, fontWeight: '500' },

    // Typing
    typingBubble: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(108,99,255,0.08)',
        padding: 14, borderRadius: 18, borderBottomLeftRadius: 4,
        gap: 5, height: 48,
    },
    typingDot: {
        width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary,
    },

    // Quick prompts
    quickPromptsWrap: { marginTop: 8, marginBottom: 8 },
    quickPromptsLabel: {  fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    quickPromptsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    quickPromptBtn: {
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
        borderWidth: 1, maxWidth: '47%',
    },
    quickPromptText: {  fontWeight: '600', lineHeight: 17 },

    // Input
    inputRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        padding: 12, borderTopWidth: 1,
        paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    },
    inputWrap: {
        flex: 1, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10,
        borderWidth: 1.5, maxHeight: 100,
    },
    textInput: {  fontWeight: '500', lineHeight: 20 },
    sendBtn: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden' },
    sendGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default AIChatModal;
