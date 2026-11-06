const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnv(projectRoot = path.resolve(__dirname, '..', '..')) {
    const files = [
        path.join(projectRoot, '.env'),
        path.join(projectRoot, 'backend', '.env')
    ];

    for (const file of files) {
        if (!fs.existsSync(file)) continue;
        const result = dotenv.config({ path: file });
        if (result.error) throw result.error;
    }
}

module.exports = loadEnv;
