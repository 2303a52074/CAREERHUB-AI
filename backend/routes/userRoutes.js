const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const Interview = require('../models/Interview');
const { Parser } = require('json2csv');
const { validateProfileUpdate } = require('../utils/profileValidation');

const router = express.Router();

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -calendarRefreshToken');
        if (!user) return res.status(404).json({ message: 'User not found.' });
        res.json(user);
    } catch (error) {
        console.error('Profile fetch failed:', error);
        res.status(500).json({ message: 'Failed to load profile.' });
    }
});

// Update profile — saves ALL user profile fields
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { updates, error } = validateProfileUpdate(req.body);
        if (error) return res.status(400).json({ message: error });
        if (updates.email) {
            const existing = await User.findOne({ email: updates.email });
            if (existing && String(existing._id) !== String(req.user.id)) {
                return res.status(409).json({ message: 'An account with this email already exists.' });
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password -calendarRefreshToken');

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json({ message: 'Profile updated successfully.', user });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }
        console.error('Profile update error:', err);
        res.status(500).json({ message: 'Failed to update profile.' });
    }
});

// Get full user profile without password
router.get('/full-profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -calendarRefreshToken');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json({ user });
    } catch (err) {
        console.error('Full profile fetch error:', err);
        res.status(500).json({ message: 'Failed to fetch profile.' });
    }
});

// Export interview history as CSV
router.get('/export', authMiddleware, async (req, res) => {
    const interviews = await Interview.find({ userId: req.user.id }).lean();
    if (interviews.length === 0) {
        return res.status(404).json({ message: 'No data to export' });
    }
    const fields = ['role', 'difficulty', 'totalScore', 'xpEarned', 'date'];
    const json2csv = new Parser({ fields });
    const csv = json2csv.parse(interviews);
    res.header('Content-Type', 'text/csv');
    res.attachment('interviews.csv');
    res.send(csv);
});

// Leaderboard (top 10 users by XP, public profiles only)
router.get('/leaderboard', async (req, res) => {
    const users = await User.find({ publicProfile: true })
        .sort({ xp: -1 })
        .limit(10)
        .select('name xp level');
    res.json(users);
});

router.get('/leetcode/:username', authMiddleware, async (req, res) => {
    const username = req.params.username;
    if (typeof username !== 'string' || !/^[A-Za-z0-9_-]{1,30}$/.test(username)) {
        return res.status(400).json({
            success: false,
            code: 'LEETCODE_USERNAME_INVALID',
            message: 'Enter a valid LeetCode username.'
        });
    }

    return res.status(503).json({
        success: false,
        code: 'LEETCODE_SYNC_UNAVAILABLE',
        message: 'LeetCode profile synchronization is unavailable because no authorized public stats API could be verified. No data was fetched or synced.',
        profileUrl: `https://leetcode.com/u/${encodeURIComponent(username)}/`,
        isSynced: false
    });
});

module.exports = router;