import React, { useState, useCallback, useEffect, useContext, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, ScrollView, Animated, KeyboardAvoidingView, DeviceEventEmitter } from 'react-native';
import { Text } from '../components/Text';
import { GiftedChat, Bubble, Send, InputToolbar } from 'react-native-gifted-chat';
import { Ionicons as Icon } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { COLORS, SHADOWS, RESPONSIVE } from '../constants/theme';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';

// Options for quick prompts
const QUICK_PROMPTS = [
    { id: 'today', title: '💰 Today', message: 'What is my today expense?' },
    { id: 'month', title: '📊 Month', message: 'Give me my monthly report' },
    { id: 'budget', title: '⚠️ Budget', message: 'Check my budget status' },
    { id: 'recent', title: '🧾 Recent', message: 'Show recent transactions' },
    { id: 'tips', title: '💡 Tips', message: 'Give me some savings tips' },
];

const ChatbotScreen = ({ navigation }) => {
    const { user, token, BASE_URL } = useContext(AuthContext);
    const { theme, isDarkMode } = useContext(ThemeContext);
    
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    
    // Pulse animation for the online dot
    const dotPulse = useRef(new Animated.Value(1)).current;
    
    // Typing indicator dots
    const typingDot1 = useRef(new Animated.Value(0.3)).current;
    const typingDot2 = useRef(new Animated.Value(0.3)).current;
    const typingDot3 = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        // Initial Greeting
        setMessages([
            {
                _id: 1,
                text: `Welcome back, ${user?.name || 'User'}! 👋\n\nI'm Antigravity, your smart financial assistant. How can I help you manage your money today?`,
                createdAt: new Date(),
                user: {
                    _id: 2,
                    name: 'Antigravity AI',
                    avatar: 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png',
                },
            },
        ]);

        Animated.loop(
            Animated.sequence([
                Animated.timing(dotPulse, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
                Animated.timing(dotPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    useEffect(() => {
        if (isTyping) {
            Animated.loop(
                Animated.stagger(150, [
                    Animated.sequence([
                        Animated.timing(typingDot1, { toValue: 1, duration: 300, useNativeDriver: true }),
                        Animated.timing(typingDot1, { toValue: 0.3, duration: 300, useNativeDriver: true })
                    ]),
                    Animated.sequence([
                        Animated.timing(typingDot2, { toValue: 1, duration: 300, useNativeDriver: true }),
                        Animated.timing(typingDot2, { toValue: 0.3, duration: 300, useNativeDriver: true })
                    ]),
                    Animated.sequence([
                        Animated.timing(typingDot3, { toValue: 1, duration: 300, useNativeDriver: true }),
                        Animated.timing(typingDot3, { toValue: 0.3, duration: 300, useNativeDriver: true })
                    ])
                ])
            ).start();
        }
    }, [isTyping]);

    const onSend = useCallback(async (newMessages = []) => {
        if (!newMessages[0]?.text.trim()) return;

        setMessages(previousMessages => GiftedChat.append(previousMessages, newMessages));
        const userMessage = newMessages[0].text;

        setIsTyping(true);
        try {
            const response = await fetch(`${BASE_URL}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token
                },
                body: JSON.stringify({ message: userMessage })
            });

            const data = await response.json();
            
            let replyText = "I'm sorry, I couldn't process that. Please try again.";
            if (response.ok && data.reply) {
                replyText = data.reply;
            } else if (!response.ok) {
                replyText = `API Error: ${data.error || 'Server error'}. Make sure backend is running correctly.`;
            }

            const aiMessage = {
                _id: Math.round(Math.random() * 1000000),
                text: replyText,
                createdAt: new Date(),
                user: {
                    _id: 2,
                    name: 'Antigravity AI',
                    avatar: 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png',
                },
            };

            setMessages(previousMessages => GiftedChat.append(previousMessages, [aiMessage]));
            
            // Text to Speech logic (Optional refinement)
            if (response.ok && data.reply) {
                const isTamil = /[\u0B80-\u0BFF]/.test(data.reply);
                Speech.speak(data.reply, {
                    language: isTamil ? 'ta-IN' : 'en-US',
                    pitch: 1.0,
                    rate: 1.0
                });
            }

        } catch (error) {
            console.error("Chat Error:", error);
            
            const errorMsg = {
                _id: Math.round(Math.random() * 1000000),
                text: "Network error. Please check if your backend server is running and accessible.",
                createdAt: new Date(),
                user: { _id: 2, name: 'Antigravity AI', avatar: 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png' },
            };
            setMessages(previousMessages => GiftedChat.append(previousMessages, [errorMsg]));
        } finally {
            setIsTyping(false);
        }
    }, [token, BASE_URL]);

    const handleQuickPrompt = (prompt) => {
        const newMessage = {
            _id: Math.round(Math.random() * 1000000),
            text: prompt.message,
            createdAt: new Date(),
            user: { _id: 1 }
        };
        onSend([newMessage]);
    };

    const renderBubble = (props) => (
        <Bubble
            {...props}
            wrapperStyle={{
                right: { 
                    backgroundColor: COLORS.primary, 
                    borderTopRightRadius: 5,
                    borderBottomRightRadius: 20,
                    borderTopLeftRadius: 20,
                    borderBottomLeftRadius: 20,
                    padding: 4,
                    ...SHADOWS.small 
                },
                left: { 
                    backgroundColor: theme.colors.card, 
                    borderTopLeftRadius: 5,
                    borderBottomLeftRadius: 20,
                    borderTopRightRadius: 20,
                    borderBottomRightRadius: 20,
                    padding: 4,
                    ...SHADOWS.card 
                }
            }}
            textStyle={{
                right: { color: '#fff', fontSize: 16, lineHeight: 22, fontWeight: '500' },
                left: { color: theme.colors.text, fontSize: 16, lineHeight: 22, fontWeight: '500' }
            }}
            timeTextStyle={{
                right: { color: 'rgba(255,255,255,0.7)' },
                left: { color: theme.colors.subText }
            }}
        />
    );

    const renderInputToolbar = (props) => (
        <View style={styles.toolbarContainer}>
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.suggestionsScroll}
                contentContainerStyle={styles.suggestionsContent}
            >
                {QUICK_PROMPTS.map(item => (
                    <TouchableOpacity 
                        key={item.id} 
                        style={[styles.suggestionChip, { backgroundColor: isDarkMode ? '#333' : '#fff', borderColor: theme.colors.border }]}
                        onPress={() => handleQuickPrompt(item)}
                    >
                        <Text style={[styles.suggestionText, { color: theme.colors.text }]}>{item.title}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
            <InputToolbar
                {...props}
                containerStyle={[styles.inputToolbar, { backgroundColor: theme.colors.card, borderTopWidth: 0 }]}
                primaryStyle={{ alignItems: 'flex-end', paddingBottom: 5 }}
            />
        </View>
    );

    const renderSend = (props) => (
        <Send {...props} containerStyle={styles.sendContainer}>
            <LinearGradient 
                colors={[COLORS.gradientStart, COLORS.gradientEnd]} 
                style={styles.sendBtn}
            >
                <Icon name="arrow-up" size={24} color="#fff" />
            </LinearGradient>
        </Send>
    );

    const renderFooter = () => {
        if (!isTyping) return null;
        return (
            <View style={styles.typingIndicatorContainer}>
                <View style={[styles.typingBubble, { backgroundColor: theme.colors.card }]}>
                    <Animated.View style={[styles.typingDot, { opacity: typingDot1 }]} />
                    <Animated.View style={[styles.typingDot, { opacity: typingDot2 }]} />
                    <Animated.View style={[styles.typingDot, { opacity: typingDot3 }]} />
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
                    <Icon name="menu" size={26} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Financial AI</Text>
                    <View style={styles.statusRow}>
                        <Animated.View style={[styles.onlineDot, { transform: [{ scale: dotPulse }] }]} />
                        <Text style={styles.statusText}>Active Advisor</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.headerIcon}>
                    <Icon name="shield-checkmark" size={22} color="#00D68F" />
                </TouchableOpacity>
            </View>

            <GiftedChat
                messages={messages}
                onSend={msgs => onSend(msgs)}
                user={{ _id: 1 }}
                renderBubble={renderBubble}
                renderSend={renderSend}
                renderInputToolbar={renderInputToolbar}
                renderFooter={renderFooter}
                placeholder="Ask about your budget..."
                alwaysShowSend
                scrollToBottom
                renderAvatarOnTop
                renderUsernameOnMessage
                keyboardShouldPersistTaps="handled"
                listViewProps={{
                    contentContainerStyle: { paddingBottom: 30 }
                }}
            />
            {Platform.OS === 'android' && <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={80} />}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 45,
        paddingBottom: 15,
        borderBottomWidth: 1,
        ...SHADOWS.medium,
        zIndex: 100
    },
    menuBtn: { padding: 5, marginRight: 15 },
    headerTitleContainer: { flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00D68F', marginRight: 6 },
    statusText: { fontSize: 13, color: COLORS.gray, fontWeight: '600' },
    sendContainer: { justifyContent: 'center', alignItems: 'center', marginHorizontal: 8, marginBottom: 5 },
    sendBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', ...SHADOWS.small },
    toolbarContainer: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
    suggestionsScroll: { paddingVertical: 12, maxHeight: 60 },
    suggestionsContent: { paddingHorizontal: 15, gap: 10 },
    suggestionChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        ...SHADOWS.small
    },
    suggestionText: { fontSize: 14, fontWeight: '700' },
    inputToolbar: { borderTopWidth: 0, marginHorizontal: 10, marginBottom: 5, borderRadius: 25, ...SHADOWS.small },
    headerIcon: { padding: 5 },
    typingIndicatorContainer: {
        paddingHorizontal: 15,
        paddingBottom: 10,
        paddingTop: 5,
        alignItems: 'flex-start'
    },
    typingBubble: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderBottomLeftRadius: 5,
        gap: 6,
        ...SHADOWS.card
    },
    typingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#00D68F'
    },
});

export default ChatbotScreen;
