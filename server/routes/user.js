const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const verify = require('./verifyToken');
const multer = require('multer');
const path = require('path');

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Safe filename with original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) return cb(null, true);
        cb(new Error('Only JPG, JPEG, and PNG images are allowed'));
    }
});

// Update Password
router.put('/update-password', verify, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        // Validation
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: 'Please provide both old and new passwords' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }

        // Get user
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Check if old password is correct
        const validPass = await bcrypt.compare(oldPassword, user.password);
        if (!validPass) return res.status(400).json({ error: 'Current password (old) is incorrect' });

        // Prevent using same password
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({ error: 'New password cannot be the same as the old password' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        user.password = hashedPassword;
        await user.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error('Update Password Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Upload Profile Photo
router.post('/upload-profile-photo', verify, upload.single('profileImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload an image' });
        }

        // Get the full URL for the image
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.get('host');
        const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

        // Update user in DB
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { profileImage: imageUrl },
            { new: true }
        ).select('-password');

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({ 
            success: true, 
            message: 'Profile photo uploaded successfully',
            user: {
                ...user._doc,
                profileImage: imageUrl
            }
        });
    } catch (err) {
        console.error('Upload Error:', err.message);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

// Delete Profile Photo
router.delete('/profile-photo', verify, async (req, res) => {
    try {
        // Find by token ID or explicit userId header
        const userId = req.user?._id || req.header('userId');
        
        console.log(`[BACKEND] Deleting profile photo for user: ${userId}`);

        if (!userId) {
            return res.status(400).json({ error: 'User identification failed' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { profileImage: '' }, // Permanent database clear
            { new: true }
        ).select('-password');

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({ 
            success: true, 
            message: 'Profile photo removed successfully',
            user: {
                ...user._doc,
                profileImage: ''
            }
        });
    } catch (err) {
        console.error('Delete Photo Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
