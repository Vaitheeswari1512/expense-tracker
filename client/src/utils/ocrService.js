import { Platform } from 'react-native';

// ── Highly Accurate Financial Document Parser ────────────────────────────────
// This parser follows strict priority rules to extract the TRUE Grand Total.

// STEP 1: PRIORITY LABELS (Number must be on the same line)
const PRIORITY_LABELS = [
    'total', 'grand total', 'net amount', 'amount payable',
    'total payable', 'net payable', 'bill total', 'invoice total'
];

// STEP 2: STRICT EXCLUSIONS
const STRICT_EXCLUSIONS = [
    'subtotal', 'sub total', 'sub-total', 'discount',
    'tax', 'gst', 'cgst', 'sgst', 'igst', 'vat',
    'received cash', 'cash received', 'cash',
    'upi', 'rupay', 'ru pay', 'card', 'payment',
    'change', 'items', 'qty', 'quantity', 'number of items',
    'mrp', 'rate', 'hsn', 'voucher', 'bank', 'appr', 'rrn'
];

/**
 * Clean a numeric string and return as float.
 * Removes commas. Returns 0 if invalid.
 */
const parseCurrency = (str) => {
    const val = parseFloat(str.replace(/,/g, '').trim());
    return isNaN(val) ? 0 : val;
};

/**
 * STEP 3: DECIMAL RULE
 * Extract ONLY decimal numbers (e.g., 123.45). Ignore integers like item counts (e.g., 8).
 */
const extractDecimals = (text) => {
    const results = [];
    // Regex for numbers with decimals: matches 12.3, 1,234.56, etc.
    const rx = /[\d,]+\.\d{1,2}/g;
    let match;
    while ((match = rx.exec(text)) !== null) {
        const val = parseCurrency(match[0]);
        if (val > 0) results.push(val);
    }
    return results;
};

/**
 * Main parser strictly following user steps.
 */
/**
 * Main parser strictly following user steps.
 */
export const extractTotalFromText = (rawText) => {
    if (!rawText) return '';

    // Standardize text for better matching
    const lines = rawText.split('\n')
        .map(l => l.trim().toLowerCase())
        .filter(l => l.length > 0);
    
    const priorityLabels = ['net total', 'grand total', 'net amount', 'amount payable', 'total payable', 'total:', 'total amount'];
    const noiseLabels = ['tax', 'gst', 'cgst', 'sgst', 'igst', 'subtotal', 'sub total', 'discount', 'saving', 'cash', 'upi', 'card', 'change', 'coupon', 'wallet'];
    
    // Improved regex: handles 123, 123.45, 1,234.56, and spaces like "231 . 00"
    const amountRegex = /(\d{1,3}(,\d{3})*(\s*\.\s*\d{1,2})|\d{1,3}(,\d{3})*)/g;

    let priorityMatches = [];
    let fallbackMatches = [];

    for (let line of lines) {
        // Find all numbers in the line
        const matches = line.match(amountRegex) || [];
        const lineAmounts = matches.map(m => {
            // Remove commas and spaces around decimals
            return parseFloat(m.replace(/,/g, '').replace(/\s/g, ''));
        }).filter(v => v > 1); // Ignore tiny numbers like "5" if they are alone

        if (lineAmounts.length > 0) {
            const isPriority = priorityLabels.some(label => line.includes(label));
            const isNoisy = noiseLabels.some(label => line.includes(label));
            
            if (isPriority && !isNoisy) {
                // If it's a "Total" line, we take the largest number found on that line
                priorityMatches.push(Math.max(...lineAmounts));
            } else if (!isNoisy && !line.includes('total')) {
                // Potential candidates from lines that aren't marked as noise or total
                fallbackMatches.push(...lineAmounts);
            }
        }
    }

    let finalAmount = 0;
    if (priorityMatches.length > 0) {
        // Pick the largest from the priority lines (Grand totals are usually the largest)
        finalAmount = Math.max(...priorityMatches);
    } else if (fallbackMatches.length > 0) {
        // If no explicit total found, pick the maximum of all valid numbers found
        finalAmount = Math.max(...fallbackMatches);
    }

    return finalAmount > 0 ? finalAmount.toFixed(2) : '';
};


/**
 * Run Tesseract.js OCR on the given image URI.
 * Works on Web (browser). Returns raw text or null on native.
 */
export const runOCR = async (imageUri) => {
    if (Platform.OS !== 'web') {
        process.env.NODE_ENV !== 'production' && console.log('[OCR] Native OCR not integrated locally');
        return null;
    }
    try {
        const Tesseract = await import('tesseract.js');
        const { data: { text } } = await Tesseract.recognize(imageUri, 'eng');
        return text;
    } catch (err) {
        console.error('[OCR] Tesseract error:', err);
        return null;
    }
};

/**
 * Automatic Category Detection based on keywords in raw text.
 */
export const detectCategory = (rawText) => {
    if (!rawText) return 'Others';
    const text = rawText.toLowerCase();

    const categoryKeywords = {
        Food: ['restaurant', 'cafe', 'diner', 'pizza', 'burger', 'swiggy', 'zomato', 'bakery', 'kfc', 'mcdonald', 'hotel', 'eats'],
        Grocery: ['supermarket', 'mart', 'market', 'bigbasket', 'reliance', 'grocery', 'vegetable', 'fruit', 'store', 'dairy', 'milk'],
        Travel: ['uber', 'ola', 'taxi', 'auto', 'metro', 'train', 'irctc', 'bus', 'flight', 'indigo', 'airway', 'rapido'],
        Fuel: ['petrol', 'diesel', 'hpcl', 'iocl', 'shyam', 'filling', 'gas station', 'shell', 'fuel'],
        Medicine: ['pharmacy', 'hospital', 'clinic', 'medical', 'apollo', 'medplus', 'health', 'tablet', 'pharma'],
        Clothes: ['fashion', 'zara', 'h&m', 'myntra', 'apparel', 'textile', 'clothing', 'shoe', 'wear', 't-shirt'],
        Entertainment: ['cinema', 'pvr', 'inox', 'netflix', 'prime', 'gaming', 'park', 'zoo', 'ticket'],
        Shopping: ['amazon', 'flipkart', 'meesho', 'jiomart', 'electronics', 'gadget', 'mall'],
        Salary: ['salary', 'income', 'credit', 'payout', 'bonus'],
        Utilities: ['bill', 'electric', 'water', 'bescom', 'mobile', 'recharge', 'wifi', 'jio', 'airtel', 'vi '],
        Health: ['gym', 'yoga', 'lab', 'doctor', 'diagnostic', 'fitness'],
        Education: ['school', 'college', 'fee', 'course', 'udemy', 'tuition', 'book', 'stationery'],
    };

    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(k => text.includes(k))) return cat;
    }

    return 'Others';
};

/**
 * High-level wrapper used by ScanReceiptScreen.
 * Returns { amount: string, category: string, rawText: string }
 */
export const processReceiptImage = async (imageUri) => {
    try {
        const rawText = await runOCR(imageUri);
        if (!rawText) {
            // Native device without local OCR: return blank so user enters manually
            return { amount: '', category: 'Others', rawText: '' };
        }
        const amount = extractTotalFromText(rawText);
        const category = detectCategory(rawText);
        return { amount, category, rawText };
    } catch (err) {
        console.error('[ocrService] processReceiptImage error:', err);
        return { amount: '', category: 'Others', rawText: '' };
    }
};
