const router = require('express').Router();
const Notification = require('../models/Notification');
const verify = require('./verifyToken');

// Get all notifications for user (filtering out deleted ones)
router.get('/', verify, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user._id, isDeleted: { $ne: true } })
            .sort({ createdAt: -1 })
            .limit(50); // Limit to last 50 to avoid overload
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a notification for user
router.post('/', verify, async (req, res) => {
    try {
        const { title, message, type, category } = req.body;
        const newNotif = new Notification({
            userId: req.user._id,
            title,
            message: message || "",
            type: type || "info",
            category: category || "General",
            read: false,
            createdAt: new Date()
        });
        const savedNotif = await newNotif.save();
        res.status(201).json(savedNotif);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Mark all as read
router.put('/mark-read', verify, async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user._id, read: false, isDeleted: { $ne: true } },
            { $set: { read: true } }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Mark single as read
router.put('/:id/read', verify, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { read: true },
            { new: true }
        );
        if (!notification) return res.status(404).json({ message: "Notification not found" });
        res.json(notification);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete single notification (Soft Delete)
router.delete('/:id', verify, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { isDeleted: true },
            { new: true }
        );
        if (!notification) return res.status(404).json({ message: "Notification not found or unauthorized" });
        res.json({ success: true, message: "Notification deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete all notifications for user (Soft Delete)
router.delete('/', verify, async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user._id, isDeleted: { $ne: true } },
            { $set: { isDeleted: true } }
        );
        res.json({ success: true, message: "All notifications deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
