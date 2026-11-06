const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');
const loadEnv = require('../backend/utils/loadEnv');

loadEnv();

const app = express();
const frontendDir = __dirname;
const frontendPort = Number(process.env.FRONTEND_PORT || 3001);
const configuredBackendUrl = process.env.CAREERHUB_BACKEND_URL ||
    `http://127.0.0.1:${process.env.PORT || 3000}`;
const backendUrl = new URL(configuredBackendUrl);

if (!['http:', 'https:'].includes(backendUrl.protocol) ||
    backendUrl.pathname !== '/' || backendUrl.username || backendUrl.password ||
    backendUrl.search || backendUrl.hash) {
    throw new Error('CAREERHUB_BACKEND_URL must be an HTTP(S) origin without credentials, query, or fragment.');
}

app.use('/api', (req, res) => {
    const transport = backendUrl.protocol === 'https:' ? https : http;
    const upstream = transport.request({
        protocol: backendUrl.protocol,
        hostname: backendUrl.hostname,
        port: backendUrl.port || undefined,
        method: req.method,
        path: req.originalUrl,
        headers: {
            ...req.headers,
            host: backendUrl.host
        }
    }, upstreamResponse => {
        res.statusCode = upstreamResponse.statusCode || 502;
        for (const [name, value] of Object.entries(upstreamResponse.headers)) {
            if (!['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te',
                'trailer', 'transfer-encoding', 'upgrade'].includes(name.toLowerCase()) && value !== undefined) {
                res.setHeader(name, value);
            }
        }
        upstreamResponse.pipe(res);
    });

    upstream.on('error', error => {
        console.error(`API proxy failed for ${req.method} ${req.originalUrl}: ${error.code || error.name}`);
        if (!res.headersSent) {
            res.status(502).json({
                code: 'API_BACKEND_UNAVAILABLE',
                message: 'The CareerHub backend could not be reached. Please retry.'
            });
        } else {
            res.destroy(error);
        }
    });

    req.pipe(upstream);
});

app.use(express.static(frontendDir, { extensions: ['html'] }));

app.listen(frontendPort, '0.0.0.0', () => {
    console.log(`CareerHub frontend running on http://0.0.0.0:${frontendPort}`);
    console.log(`API requests are proxied to ${backendUrl.origin}`);
});
