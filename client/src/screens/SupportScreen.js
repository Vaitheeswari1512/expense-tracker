import React, { useContext } from 'react';
import { Text } from '../components/Text';
import { View, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { COLORS, SIZES, SHADOWS, RESPONSIVE } from '../constants/theme';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const SupportScreen = () => {
    const { theme, toggleSidebar } = useContext(ThemeContext);
    const navigation = useNavigation();

    const contacts = [
        {
            title: 'Email Support',
            subtitle: 'Get response within 24hrs',
            icon: 'mail-outline',
            action: () => Linking.openURL('mailto:support@expensetracker.com')
        },
        {
            title: 'Website',
            subtitle: 'View our online docs',
            icon: 'globe-outline',
            action: () => Linking.openURL('https://expensetracker.com')
        }
    ];

    const faqs = [
        {
            question: 'How do I reset my password?',
            answer: 'Go to Profile > Profile Details and enter a new password in the password field.'
        },
        {
            question: 'Is my data secure?',
            answer: 'Yes, we use industry standard encryption to protect your data.'
        },
        {
            question: 'How do I export my data?',
            answer: 'Currently we are working on an export to CSV feature which will be available soon.'
        }
    ];

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, width: '90%', maxWidth: 1200, alignSelf: 'center' }}>
                
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={{ padding: 5 }}>
                    <Icon name="menu" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: RESPONSIVE.moderateScale(18), fontWeight: 'bold', color: theme.colors.text, marginLeft: 15 }}>Support</Text>
            </View>

            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>How can we help you?</Text>
                <Text style={[styles.headerSubtitle, { color: theme.colors.subText }]}>Contact our team or check FAQs</Text>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Contact Us</Text>
                {contacts.map((item, index) => (
                    <TouchableOpacity key={index} style={[styles.contactItem, { backgroundColor: theme.colors.card }]} onPress={item.action}>
                        <View style={[styles.iconBox, { backgroundColor: theme.colors.background }]}>
                            <Icon name={item.icon} size={24} color={COLORS.primary} />
                        </View>
                        <View style={styles.contactInfo}>
                            <Text style={[styles.contactTitle, { color: theme.colors.text }]}>{item.title}</Text>
                            <Text style={[styles.contactSubtitle, { color: theme.colors.subText }]}>{item.subtitle}</Text>
                        </View>
                        <Icon name="chevron-forward" size={20} color={COLORS.gray} />
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Frequently Asked Questions</Text>
                {faqs.map((item, index) => (
                    <View key={index} style={[styles.faqItem, { backgroundColor: theme.colors.card }]}>
                        <Text style={[styles.question, { color: theme.colors.text }]}>{item.question}</Text>
                        <Text style={[styles.answer, { color: theme.colors.subText }]}>{item.answer}</Text>
                    </View>
                ))}
            </View>
            
            <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={styles.footerText}>App Version 2.0.0</Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingVertical: 32,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontSize: RESPONSIVE.moderateScale(32),
        fontWeight: '900',
        textAlign: 'center'
    },
    headerSubtitle: {
        fontSize: RESPONSIVE.moderateScale(16),
        fontWeight: '600',
        marginTop: 8,
        textAlign: 'center'
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 25,
        width: '90%',
        maxWidth: 1200,
        alignSelf: 'center'
    },
    sectionTitle: {
        fontSize: RESPONSIVE.moderateScale(20),
        fontWeight: 'bold',
        marginBottom: 15
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 15,
        marginBottom: 15,
        ...SHADOWS.light
    },
    iconBox: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    contactInfo: {
        flex: 1
    },
    contactTitle: {
        fontSize: RESPONSIVE.moderateScale(18),
        fontWeight: '800',
        marginBottom: 4
    },
    contactSubtitle: {
        fontSize: RESPONSIVE.moderateScale(13),
        fontWeight: '500'
    },
    faqItem: {
        padding: 18,
        borderRadius: 20,
        marginBottom: 15,
        ...SHADOWS.light
    },
    question: {
        fontSize: RESPONSIVE.moderateScale(16),
        fontWeight: 'bold',
        marginBottom: 8
    },
    answer: {
        fontSize: RESPONSIVE.moderateScale(14),
        lineHeight: 20
    },
    footerText: {
        fontSize: RESPONSIVE.moderateScale(12),
        color: 'rgba(0,0,0,0.3)',
        fontWeight: '600'
    }
});

export default SupportScreen;
