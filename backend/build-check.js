const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const sourceDirectories = ['backend', 'frontend', 'public'];
let checkedJavaScript = 0;
let checkedInlineScripts = 0;

function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const filePath = path.join(directory, entry.name);
        if (entry.isDirectory()) return walk(filePath);
        return [filePath];
    });
}

for (const sourceDirectory of sourceDirectories) {
    const absoluteDirectory = path.join(root, sourceDirectory);
    if (!fs.existsSync(absoluteDirectory)) throw new Error(`Missing source directory: ${sourceDirectory}`);

    for (const filePath of walk(absoluteDirectory)) {
        if (filePath.endsWith('.js')) {
            const result = spawnSync(process.execPath, ['--check', filePath], { encoding: 'utf8' });
            if (result.status !== 0) {
                throw new Error(`${path.relative(root, filePath)}: ${result.stderr || result.stdout}`);
            }
            checkedJavaScript++;
        }

        if (filePath.endsWith('.html')) {
            const html = fs.readFileSync(filePath, 'utf8');
            for (const [, attributes, source] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
                if (/\bsrc\s*=/.test(attributes) || /\btype\s*=\s*["']module["']/i.test(attributes)) continue;
                new vm.Script(source, { filename: path.relative(root, filePath) });
                checkedInlineScripts++;
            }
        }
    }
}

console.log(`Build checks passed: ${checkedJavaScript} JavaScript files and ${checkedInlineScripts} inline page scripts.`);
