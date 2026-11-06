const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', 'uploads', 'videos');
const videoTypes = new Map([
    ['.mp4', 'video/mp4'],
    ['.mov', 'video/quicktime'],
    ['.webm', 'video/webm']
]);

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const userId = String(req.user._id || req.user.id);
        cb(null, `${userId}-${crypto.randomUUID()}${extension}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        if (videoTypes.get(extension) !== file.mimetype) {
            return cb(new Error('Upload a supported MP4, MOV, or WebM video file.'));
        }
        cb(null, true);
    }
});

async function hasValidVideoSignature(filePath, mimeType) {
    const handle = await fs.promises.open(filePath, 'r');
    try {
        const buffer = Buffer.alloc(12);
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
        if (mimeType === 'video/webm') {
            return bytesRead >= 4 &&
                buffer[0] === 0x1a && buffer[1] === 0x45 &&
                buffer[2] === 0xdf && buffer[3] === 0xa3;
        }
        return bytesRead >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp';
    } finally {
        await handle.close();
    }
}

router.post('/upload', authMiddleware, (req, res, next) => {
    upload.single('video')(req, res, error => {
        if (error) {
            const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
            return res.status(status).json({ message: error.message || 'Video upload failed.' });
        }
        next();
    });
}, async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Select a video file to upload.' });
    }

    try {
        if (!await hasValidVideoSignature(req.file.path, req.file.mimetype)) {
            await fs.promises.unlink(req.file.path);
            return res.status(400).json({ message: 'The uploaded file is not a valid supported video.' });
        }
        res.status(201).json({
            message: 'Video uploaded successfully.',
            videoUrl: `/api/video/file/${encodeURIComponent(req.file.filename)}`
        });
    } catch (error) {
        console.error('Video upload validation failed:', error);
        try {
            await fs.promises.unlink(req.file.path);
        } catch (cleanupError) {
            console.error('Invalid video cleanup failed:', cleanupError.message);
        }
        res.status(500).json({ message: 'Video upload could not be completed.' });
    }
});

router.get('/file/:filename', authMiddleware, (req, res) => {
    const filename = req.params.filename;
    const userId = String(req.user._id || req.user.id);
    if (path.basename(filename) !== filename || !filename.startsWith(`${userId}-`)) {
        return res.status(404).json({ message: 'Video not found.' });
    }
    const filePath = path.join(uploadDir, filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Video not found.' });
    }
    res.sendFile(filePath, error => {
        if (error && !res.headersSent) {
            console.error('Video download failed:', error);
            res.status(500).json({ message: 'Video could not be retrieved.' });
        }
    });
});

module.exports = router;
