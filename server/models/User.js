const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        default: ''
    },
    profileImage: {
        type: String,
        default: ''
    },
    settings: {
        theme: {
            type: String,
            default: 'light',
            enum: ['light', 'dark']
        },
        currency: {
            type: String,
            default: 'USD'
        }
    },
    budgets: [{
        category: {
            type: String,
            required: true
        },
        limit: {
            type: Number,
            required: true
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
