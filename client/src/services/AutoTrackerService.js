import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid, ToastAndroid } from 'react-native';

const { SmsNotificationModule } = NativeModules;
const eventEmitter = new NativeEventEmitter(SmsNotificationModule);

// Configuration & Keywords
const BANK_SENDER_IDS = ['SBI', 'HDFC', 'ICICI', 'AXIS', 'KOTAK', 'PAYTM', 'GPAY', 'PHONEPE', 'BANK', 'UNION', 'CANARA', 'BOB'];
const TARGET_UPI_PACKAGES = [
    'com.google.android.apps.nbu.paisa.user', // GPay
    'com.phonepe.app',                        // PhonePe
    'net.one97.paytm',                        // Paytm
    'com.sbi.upi',                            // YONO
    'in.org.npci.upiapp'                      // BHIM
];

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

    /**
     * STRUCTURED LOGGING
     */
    log(tag, message, data = '') {
        if (this.DEBUG) {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[${timestamp}] 🤖 ${tag}: ${message}`, data);
        }
    }

    /**
     * ADVANCED DUPLICATE PROTECTION: Unique ID Generation
     * (Amount + Merchant + Minute-rounded Timestamp)
     */
    generateUniqueId(amount, merchant, timestamp = Date.now()) {
        const roundedTime = Math.floor(timestamp / 60000); // Unique per minute
        const cleanMerchant = merchant.toLowerCase().replace(/[^a-z0-9]/g, '');
        return `${amount}_${cleanMerchant}_${roundedTime}`;
    }

    /**
     * CLEAN CACHE
     */
    cleanupCache() {
        if (this.processedIds.size > this.MAX_CACHE_SIZE) {
            const firstAdded = this.processedIds.values().next().value;
            this.processedIds.delete(firstAdded);
        }
    }

    /**
     * IMPROVED PARSING: Enhanced Regex & Logic
     */
    analyzeTransaction(text, source) {
        if (!text || typeof text !== 'string') {
            this.log('PARSER', 'Empty or invalid text received');
            return null;
        }

        const textLower = text.toLowerCase();
        this.log(source.toUpperCase(), `Processing: ${text.substring(0, 50)}...`);

        // 1. Security Check: Ignore OTP & Promotional
        if (textLower.includes('otp') || textLower.includes('verification code') || textLower.includes('login code') || textLower.includes('offer')) {
            this.log('SECURITY', 'Ignored: OTP/Promotional Content');
            return null;
        }

        // 2. Amount Extraction (₹ 500, Rs. 500, INR 1,200.50, etc.)
        const amountRegex = /(?:₹|Rs\.?|INR)\s?([\d,]+(?:\.\d{1,2})?)/i;
        const amountMatch = text.match(amountRegex);
        if (!amountMatch) {
            this.log('PARSER', 'Failed: No amount found');
            return null;
        }

        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        if (isNaN(amount) || amount <= 0) return null;

        // 3. Type Detection (Income vs Expense)
        const expenseKeywords = ['debited', 'spent', 'paid', 'purchase', 'sent', 'withdrawal', 'transfer to', 'payee', 'txn successful', 'purchase of', 'using umid', 'using'];
        const incomeKeywords = ['credited', 'received', 'deposited', 'salary', 'added to wallet', 'cashback', 'refund', 'amount received', 'money received', 'deposit'];

        let type = null;
        if (expenseKeywords.some(kw => textLower.includes(kw))) {
            type = 'expense';
        } else if (incomeKeywords.some(kw => textLower.includes(kw))) {
            type = 'income';
        } else if (source === 'notification') {
            // Default fallback for UPI notification that contains an amount but no clear keyword
            type = textLower.includes('to') || textLower.includes('paid') ? 'expense' : 'income';
        } else {
            type = 'expense';
        }

        // 4. Merchant Extraction (Handle multi-line and common patterns)
        let merchant = 'Unknown';
        const merchantPatterns = [
            /to\s+([A-Za-z0-9\s.]+?)(?:\s+on|\s+at|\s+using|\s+via|\s+for|$)/i,
            /at\s+([A-Za-z0-9\s.]+?)(?:\s+on|\s+using|\s+via|\s+for|$)/i,
            /paid\s+([A-Za-z0-9\s.]+?)(?:\s+on|\s+at|\s+using|\s+via|\s+for|$)/i,
            /from\s+([A-Za-z0-9\s.]+?)(?:\s+on|\s+at|\s+using|\s+via|\s+for|$)/i,
            /to\s+([A-Za-z0-9\.\-_@]+)(?:\s+on|\s+at|\s+using|\s+via|\s+for|$)/i
        ];

        for (const pattern of merchantPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                merchant = match[1].trim();
                if (merchant.length > 30) merchant = merchant.substring(0, 30);
                break;
            }
        }

        if (merchant === 'Unknown') {
            const handleMatch = text.match(/([A-Za-z0-9\.\-_]{2,})@(?:ok|upi|pay|bank|axis|icici|phonepe|upi)/i);
            if (handleMatch && handleMatch[1]) {
                merchant = handleMatch[1];
            }
        }

        // 5. Intelligent Categorization
        let category = 'Auto';
        const combinedContext = (merchant + ' ' + text).toLowerCase();
        
        for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
            if (keywords.some(kw => combinedContext.includes(kw))) {
                category = catName;
                break;
            }
        }

        if (!type) {
            if (combinedContext.includes('credited') || combinedContext.includes('received') || combinedContext.includes('added to wallet')) {
                type = 'income';
            } else {
                type = 'expense';
            }
        }

        // 6. Duplicate Check (Composite ID)
        const uniqueId = this.generateUniqueId(amount, merchant);
        if (this.processedIds.has(uniqueId)) {
            this.log('DEDUPE', `Skipped Duplicate ID: ${uniqueId}`);
            return null;
        }
        
        this.processedIds.add(uniqueId);
        this.cleanupCache();

        this.log('SUCCESS', `Parsed: ₹${amount} | ${type} | ${merchant} | ${category}`);
        
        return {
            amount,
            type,
            source,
            category,
            merchant,
            id: uniqueId,
            description: text.substring(0, 100).replace(/\n/g, ' '),
            date: new Date().toISOString(),
            isAuto: true
        };
    }

    /**
     * UX: Toast Notification
     */
    showConfirmationToast(data) {
        if (Platform.OS === 'android') {
            const msg = `💰 Auto-Added: ₹${data.amount} (${data.category} - ${data.merchant})`;
            ToastAndroid.showWithGravity(msg, ToastAndroid.LONG, ToastAndroid.BOTTOM);
        }
    }

    async checkSmsPermission() {
        if (Platform.OS !== 'android') return false;
        try {
            const receiveGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
            const readGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
            const granted = receiveGranted && readGranted;
            this.log('PERMISSION', `SMS permissions granted: ${granted}`);
            return granted;
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

            const granted = result[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED &&
                result[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;

            this.log('PERMISSION', `SMS permission request result: ${granted ? 'GRANTED' : 'DENIED'}`, result);
            return granted;
        } catch (error) {
            this.log('PERMISSION', 'SMS permission request failed', error);
            return false;
        }
    }

    /**
     * STATUS CHECK
     */
    async getStatus() {
        if (Platform.OS !== 'android') return 'UNSUPPORTED';
        if (!SmsNotificationModule || !SmsNotificationModule.isNotificationAccessEnabled) {
            this.log('PERMISSION', 'Notification access check unavailable because native module is missing');
            return 'PERMISSION_REQUIRED';
        }
        const hasPermission = await SmsNotificationModule.isNotificationAccessEnabled();
        return hasPermission ? 'ACTIVE' : 'PERMISSION_REQUIRED';
    }

    // Permission Helpers
    /**
     * AI SCALING: Structured metadata for future LLM processing
     */
    prepareForAI(data) {
        return {
            ...data,
            aiHint: `Categorize transaction: ${data.description}`,
            rawText: data.description // Pass to AI for deep extraction
        };
    }

    /**
     * MERCHANT CLEANUP: Remove redundant banking prefixes/suffixes
     */
    cleanMerchantName(name) {
        if (!name) return 'Unknown';
        return name
            .replace(/VPA[:\s]*/i, '')
            .replace(/([A-Z0-9]+)@([A-Z]+)/i, '') // Remove UPI handles
            .replace(/\s+/g, ' ')
            .trim();
    }

    async checkPermission() {
        if (Platform.OS !== 'android') return false;
        if (!SmsNotificationModule || !SmsNotificationModule.isNotificationAccessEnabled) {
            this.log('PERMISSION', 'Notification access API unavailable');
            return false;
        }
        return await SmsNotificationModule.isNotificationAccessEnabled();
    }

    requestPermission() {
        if (Platform.OS === 'android') {
            SmsNotificationModule.requestNotificationAccess();
        }
    }

    requestBatteryExemption() {
        if (Platform.OS === 'android') {
            SmsNotificationModule.requestBatteryOptimizationExemption();
        }
    }
}

export default new AutoTrackerService();
