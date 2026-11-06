const originalFetch = globalThis.fetch;
const primaryModel = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';

if (process.env.CAREERHUB_TEST_SIMULATE_PRIMARY_FAILURE === '1') {
    globalThis.fetch = async (input, options = {}) => {
        const url = typeof input === 'string' ? input : input?.url;
        if (typeof url === 'string' && url.endsWith('/chat/completions')) {
            let requestBody;
            try {
                requestBody = JSON.parse(options.body);
            } catch {
                requestBody = null;
            }
            if (requestBody?.model === primaryModel) {
                return new Response(JSON.stringify({
                    error: { message: 'Controlled integration-test primary HTTP 503.' }
                }), { status: 503, headers: { 'content-type': 'application/json' } });
            }
        }
        return originalFetch(input, options);
    };
}
