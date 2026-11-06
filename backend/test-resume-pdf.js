const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { extractResumeText } = require('./utils/resumePdf');
const { extractResumeDocxText } = require('./utils/resumeDocx');

async function run() {
    const resumeText = 'Candidate resume text with a role, skills, projects, experience and education details.';
    const extracted = await extractResumeText(Buffer.from('pdf bytes'), async () => ({ text: resumeText }));
    assert.equal(extracted, resumeText);

    const validPdf = fs.readFileSync(path.join(__dirname, 'test-fixtures', 'valid-resume.pdf'));
    const parsedPdf = await extractResumeText(validPdf);
    assert.match(parsedPdf, /Backend Engineer/);
    assert.match(parsedPdf, /PostgreSQL and AWS/);

    await assert.rejects(
        extractResumeText(Buffer.from('image-only pdf'), async () => ({ text: '' })),
        error => error.code === 'PDF_TEXT_NOT_EXTRACTABLE'
    );
    await assert.rejects(
        extractResumeText(Buffer.from('broken pdf'), async () => { throw new Error('parser diagnostic'); }),
        error => error.code === 'PDF_PARSE_FAILED'
    );

    const docxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    const extractedDocx = await extractResumeDocxText(
        docxBuffer,
        async () => ({ value: resumeText })
    );
    assert.equal(extractedDocx, resumeText);
    await assert.rejects(
        extractResumeDocxText(Buffer.from('not a docx'), async () => ({ value: resumeText })),
        error => error.code === 'DOCX_INVALID_FILE'
    );
    await assert.rejects(
        extractResumeDocxText(docxBuffer, async () => { throw new Error('parser diagnostic'); }),
        error => error.code === 'DOCX_PARSE_FAILED'
    );
    await assert.rejects(
        extractResumeDocxText(docxBuffer, async () => ({ value: '' })),
        error => error.code === 'RESUME_TEXT_NOT_EXTRACTABLE'
    );

    console.log('Resume document extraction tests passed: text-based PDF/DOCX content is extracted; scanned, malformed, and unsupported documents are rejected.');
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
