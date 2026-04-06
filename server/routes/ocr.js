const router = require('express').Router();
const multer = require('multer');
const Tesseract = require('tesseract.js');
const verify = require('./verifyToken');

// Use memory storage to process the image directly without saving to disk
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/', upload.single('receipt'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image uploaded' });
        }

        // Tesseract.js recognizes the image buffer
        const { data: { text } } = await Tesseract.recognize(
            req.file.buffer,
            'eng'
        );

        // ── Standardized Financial Document Parser ──────────────────────────────
        
        // STEP 0: RECONSTRUCT STRUCTURE
        const splitKeywords = [
            'Total', 'Grand Total', 'Net Amount', 'Amount Payable', 
            'Discount', 'Cash', 'UPI', 'RuPay', 'Card', 
            'Subtotal', 'GST', 'CGST', 'SGST', 'Tax'
        ];

        let processedText = text;
        for (const kw of splitKeywords) {
            const regex = new RegExp(`(${kw})`, 'gi');
            processedText = processedText.replace(regex, '\n$1');
        }

        const lines = processedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        const priorityLabels = ['total', 'grand total', 'net amount', 'amount payable', 'total payable', 'net payable'];
        
        // Improved regex from frontend: handles 123, 123.45, 1,234.56, and spaces like "231 . 00"
        const amountRegex = /(\d{1,3}(,\d{3})*(\s*\.\s*\d{1,2})|\d{1,3}(,\d{3})*)/g;

        let priorityMatches = [];
        let allValidDecimals = [];

        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            
            // IGNORE noise lines (Taxes, Discounts, Subtotals)
            const isNoisyLine = ['subtotal', 'discount', 'gst', 'cgst', 'sgst', 'tax', 'balance', 'change', 'saved', 'rounding'].some(kw => lowerLine.includes(kw));
            
            // IGNORE payment method lines
            const isPaymentLine = ['cash', 'upi', 'rupay', 'card', 'payment', 'phonepe', 'gpay', 'paytm', 'visa', 'mastercard', 'pos', 'terminal'].some(kw => lowerLine.includes(kw));

            const matches = line.match(amountRegex) || [];
            // Filter numbers
            const lineDecimals = matches
                .map(m => parseFloat(m.replace(/,/g, '').replace(/\s/g, '')))
                .filter(v => v > 1 && v < 500000); // Exclude tiny noise < 1

            if (lineDecimals.length > 0) {
                const isTotalLine = priorityLabels.some(label => lowerLine.includes(label));
                
                if (isTotalLine) {
                    // Total lines are the highest priority. We take the largest number on a "Total" line.
                    priorityMatches.push(Math.max(...lineDecimals));
                } else if (!isNoisyLine && !isPaymentLine) {
                    // If no explicit total, we track these as potential candidates
                    allValidDecimals.push(...lineDecimals);
                }
            }
        }

        // Final Extraction:
        // 1. Largest number on a "Total" line is usually the Grand Total.
        // 2. If no total label, take the maximum from non-noise candidate decimals.
        let detectedAmount = 0;
        if (priorityMatches.length > 0) {
            detectedAmount = Math.max(...priorityMatches);
        } else if (allValidDecimals.length > 0) {
            detectedAmount = Math.max(...allValidDecimals);
        }
        
        res.json({
            success: true,
            detectedAmount: detectedAmount,
            rawText: text
        });

    } catch (err) {
        console.error('OCR Error:', err);
        res.status(500).json({ success: false, message: 'Failed to process receipt image' });
    }
});

module.exports = router;
