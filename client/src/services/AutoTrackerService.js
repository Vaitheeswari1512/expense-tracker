import { NativeModules, Platform, PermissionsAndroid, ToastAndroid } from 'react-native';

const { SmsNotificationModule } = NativeModules;

const CATEGORY_KEYWORDS = {
    Food: ['swiggy', 'zomato', 'restaurant', 'food', 'cafe', 'eats', 'blinkit', 'zepto', 'instamart', 'pizza', 'burger'],
    Travel: ['uber', 'ola', 'irctc', 'metro', 'fuel', 'petrol', 'diesel', 'bharatpet', 'hpcl', 'iocl', 'rapido', 'travel'],
    Shopping: ['amazon', 'flipkart', 'myntra', 'nykaa', 'shopping', 'lifestyle', 'zara', 'h&m', 'decathlon'],
    Bills: ['electricity', 'water', 'gas', 'bill', 'recharge', 'jio', 'airtel', 'vi ', 'broadband', 'insurance', 'rent'],
    Entertainment: ['netflix', 'hotstar', 'theatre', 'bookmyshow', 'cinema', 'spotify', 'prime video', 'multiplex']
};

class AutoTrackerService {
    constructor() {
        this.processedIds = new Set();
        this.MAX_CACHE_SIZE = 100;
        this.DEBUG = true;
    }

    log(tag, message, data = '') {
        if (this.DEBUG) {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[${timestamp}] ${tag}: ${message}`, data);
        }
    }

    generateUniqueId(amount, merchant, timestamp = Date.now()) {
        const roundedTime = Math.floor(timestamp / 60000);
        const cleanMerchant = (merchant || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '');
        return `${amount}_${cleanMerchant}_${roundedTime}`;
    }

    cleanupCache() {
        if (this.processedIds.size > this.MAX_CACHE_SIZE) {
            const firstAdded = this.processedIds.values().next().value;
            this.processedIds.delete(firstAdded);
        }
    }

    analyzeTransaction(text, source) {
        if (!text || typeof text !== 'string') {
            this.log('PARSER', 'Empty or invalid text received');
            return null;
        }

        const textLower = text.toLowerCase();
        this.log(source.toUpperCase(), `Processing: ${text.substring(0, 80)}...`);

        if (textLower.includes('otp') || textLower.includes('verification code') || textLower.includes('login code') || textLower.includes('offer')) {
            this.log('SECURITY', 'Ignored OTP or promotional content');
            return null;
        }

        const amountRegex = /(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i;
        const amountMatch = text.match(amountRegex);
        if (!amountMatch) {
            this.log('PARSER', 'Failed: No amount found');
            return null;
        }

        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        if (isNaN(amount) || amount <= 0) return null;

        const expenseKeywords = ['debited', 'spent', 'paid', 'purchase', 'sent', 'withdrawal', 'transfer to', 'payee', 'txn successful', 'using'];
        const incomeKeywords = ['credited', 'received', 'deposited', 'salary', 'cashback', 'refund', 'amount received', 'money received', 'deposit'];

        let type = null;
        if (expenseKeywords.some((kw) => textLower.includes(kw))) {
            type = 'expense';
        } else if (incomeKeywords.some((kw) => textLower.includes(kw))) {
            type = 'income';
        } else if (source === 'notification') {
            type = textLower.includes('to') || textLower.includes('paid') ? 'expense' : 'income';
        } else {
            type = 'expense';
        }

        let merchant = 'Unknown';
        const merchantPatterns = [
            /to\s+([A-Za-z0-9\s.@_-]+?)(?:\s+on|\s+at|\s+using|\s+via|\s+for|$)/i,
            /at\s+([A-Za-z0-9\s.@_-]+?)(?:\s+on|\s+using|\s+via|\s+for|$)/i,
            /paid\s+([A-Za-z0-9\s.@_-]+?)(?:\s+on|\s+at|\s+using|\s+via|\s+for|$)/i,
            /from\s+([A-Za-z0-9\s.@_-]+?)(?:\s+on|\s+at|\s+using|\s+via|\s+for|$)/i
        ];

        for (const pattern of merchantPatterns) {
            const match = text.match(pattern);
            if (match?.[1]) {
                merchant = match[1].trim().substring(0, 40);
                break;
            }
        }

        if (merchant === 'Unknown') {
            const handleMatch = text.match(/([A-Za-z0-9._-]{2,})@(?:ok|upi|pay|bank|axis|icici|phonepe)/i);
            if (handleMatch?.[1]) {
                merchant = handleMatch[1];
            }
        }

        let category = 'Auto';
        const combinedContext = `${merchant} ${text}`.toLowerCase();
        for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
            if (keywords.some((kw) => combinedContext.includes(kw))) {
                category = catName;
                break;
            }
        }

        const uniqueId = this.generateUniqueId(amount, merchant);
        if (this.processedIds.has(uniqueId)) {
            this.log('DEDUPE', `Skipped duplicate ID: ${uniqueId}`);
            return null;
        }

        this.processedIds.add(uniqueId);
        this.cleanupCache();

        return {
            amount,
            type,
            source,
            category,
            merchant,
            id: uniqueId,
            description: text.substring(0, 140).replace(/\n/g, ' '),
            date: new Date().toISOString(),
            isAuto: true
        };
    }

    showConfirmationToast(data) {
        if (Platform.OS === 'android') {
            const msg = `Auto-added: Rs.${data.amount} (${data.category} - ${data.merchant})`;
            ToastAndroid.showWithGravity(msg, ToastAndroid.LONG, ToastAndroid.BOTTOM);
        }
    }

    async checkSmsPermission() {
        if (Platform.OS !== 'android') return false;
        try {
            const receiveGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
            const readGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
            return receiveGranted && readGranted;
        } catch (error) {
            this.log('PERMISSION', 'SMS permission check failed', error);
            return false;
        }
    }

    async requestSmsPermission() {
        if (Platform.OS !== 'android') return false;
        try {
            const result = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
                PermissionsAndroid.PERMISSIONS.READ_SMS
            ]);

            return result[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED &&
                result[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;
        } catch (error) {
            this.log('PERMISSION', 'SMS permission request failed', error);
            return false;
        }
    }

    async getStatus() {
        if (Platform.OS !== 'android') return 'UNSUPPORTED';
        if (!SmsNotificationModule?.isNotificationAccessEnabled) {
            return 'PERMISSION_REQUIRED';
        }

        const hasPermission = await SmsNotificationModule.isNotificationAccessEnabled();
        return hasPermission ? 'ACTIVE' : 'PERMISSION_REQUIRED';
    }

    prepareForAI(data) {
        return {
            ...data,
            aiHint: `Categorize transaction: ${data.description}`,
            rawText: data.description
        };
    }

    cleanMerchantName(name) {
        if (!name) return 'Unknown';
        return name
            .replace(/VPA[:\s]*/i, '')
            .replace(/([A-Z0-9]+)@([A-Z]+)/i, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    async checkPermission() {
        if (Platform.OS !== 'android') return false;
        if (!SmsNotificationModule?.isNotificationAccessEnabled) {
            return false;
        }

        return await SmsNotificationModule.isNotificationAccessEnabled();
    }

    requestPermission() {
        if (Platform.OS === 'android' && SmsNotificationModule?.requestNotificationAccess) {
            SmsNotificationModule.requestNotificationAccess();
        }
    }

    requestBatteryExemption() {
        if (Platform.OS === 'android' && SmsNotificationModule?.requestBatteryOptimizationExemption) {
            SmsNotificationModule.requestBatteryOptimizationExemption();
        }
    }
}

export default new AutoTrackerService();
