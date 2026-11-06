require('./utils/loadEnv')();

async function listModels() {
    const key = process.env.OPENROUTER_API_KEY?.trim();
    if (!key) {
        console.error('OPENROUTER_API_KEY is missing from the backend environment.');
        process.exitCode = 1;
        return;
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
            Authorization: `Bearer ${key}`,
            'HTTP-Referer': process.env.OPENROUTER_SITE_URL?.trim() || 'http://localhost',
            'X-Title': process.env.OPENROUTER_APP_NAME?.trim() || 'CareerHub AI'
        },
        signal: AbortSignal.timeout(15000)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(data?.data)) {
        console.error(`OpenRouter model lookup failed with HTTP ${response.status}.`);
        process.exitCode = 1;
        return;
    }

    const modelIds = data.data
        .map(model => model?.id)
        .filter(modelId => typeof modelId === 'string')
        .sort();
    if (!modelIds.length) {
        console.log('OpenRouter returned no models.');
        return;
    }

    console.log(modelIds.join('\n'));
    console.log(`\nTotal available models: ${modelIds.length}`);
}

listModels().catch(error => {
    console.error(`OpenRouter model lookup failed: ${error.name === 'TimeoutError' ? 'request timed out' : 'network error'}.`);
    process.exitCode = 1;
});
