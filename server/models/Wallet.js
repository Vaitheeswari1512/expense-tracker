const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    income: {
        type: Number,
        default: 0
    },
    expenses: {
        type: Number,
        default: 0
    },
    balance: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Wallet', WalletSchema);
