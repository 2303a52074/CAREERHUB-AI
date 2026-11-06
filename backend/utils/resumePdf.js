const { PDFParse } = require('pdf-parse');

async function parsePdfBuffer(buffer) {
    const parser = new PDFParse({ data: buffer });
    try {
        return await parser.getText();
    } finally {
        await parser.destroy();
    }
}

async function extractResumeText(buffer, parsePdf = parsePdfBuffer) {
    let parsed;
    try {
        parsed = await parsePdf(buffer);
    } catch {
        const error = new Error('PDF text extraction failed.');
        error.code = 'PDF_PARSE_FAILED';
        throw error;
    }
    const text = typeof parsed?.text === 'string' ? parsed.text.trim() : '';
    if (text.length < 30) {
        const error = new Error('PDF text is unavailable or too short.');
        error.code = 'PDF_TEXT_NOT_EXTRACTABLE';
        throw error;
    }
    return text;
}

module.exports = { extractResumeText };
