const messages = {
    AI_PROVIDER_NOT_CONFIGURED: 'The configured AI provider is not ready. Check its backend-only environment settings and restart the backend.',
    AI_PROVIDER_QUOTA_EXCEEDED: 'The AI provider quota is exhausted. Wait for quota to reset or configure an explicitly qualified provider.',
    AI_PROVIDER_AUTH_ERROR: 'The AI provider rejected the server credentials. Check the backend-only API key setting.',
    AI_MODEL_INVALID: "The configured AI model is unavailable. Check its model ID against the provider's current model list.",
    AI_PROVIDER_REQUEST_REJECTED: 'The AI provider rejected this request configuration. Check the model and generation settings.',
    AI_RATE_LIMITED: 'The AI provider is rate-limiting requests. Please wait a moment and try again.',
    AI_PROVIDER_TIMEOUT: 'The AI provider did not respond before the request deadline. No result was saved; retry when ready.',
    AI_PROVIDER_INVALID_OUTPUT: 'The AI provider returned a response that did not match the required format. No result was saved; retry when ready.',
    AI_PROVIDER_EMPTY_RESPONSE: 'The AI provider returned no usable content. No result was saved; retry when ready.',
    AI_PROVIDER_NETWORK_ERROR: 'The backend could not connect to the AI provider. Check network access and retry.',
    AI_ANSWER_REQUIRED: 'Provide an answer before requesting an AI evaluation.',
    AI_PROVIDER_UNAVAILABLE: 'The AI service is temporarily unavailable. Please retry.'
};

function providerErrorMessage(code, feature = 'AI request', error = null) {
    if (code === 'AI_ANSWER_REQUIRED') return messages[code];
    if (error?.fallbackAttempted) {
        return `${feature}: Configured AI providers did not return a usable response. No result was saved; retry later.`;
    }
    const detail = messages[code] || 'The AI service could not complete this request.';
    return `${feature}: ${detail}`;
}

module.exports = { providerErrorMessage };
