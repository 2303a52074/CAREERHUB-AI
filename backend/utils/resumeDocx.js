function createDocxError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

async function extractResumeDocxText(buffer, extractDocxText) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 4 ||
        buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
        throw createDocxError('DOCX_INVALID_FILE', 'The uploaded file is not a valid DOCX document.');
    }

    let extracted;
    try {
        const extractor = extractDocxText || (async docxBuffer => {
            const mammoth = require('mammoth');
            return mammoth.extractRawText({ buffer: docxBuffer });
        });
        extracted = await extractor(buffer);
    } catch {
        throw createDocxError('DOCX_PARSE_FAILED', 'The DOCX document could not be read.');
    }

    const text = typeof extracted?.value === 'string' ? extracted.value.trim() : '';
    if (text.length < 30) {
        throw createDocxError(
            'RESUME_TEXT_NOT_EXTRACTABLE',
            'The DOCX document contains too little extractable text.'
        );
    }
    return text;
}

module.exports = { extractResumeDocxText };
