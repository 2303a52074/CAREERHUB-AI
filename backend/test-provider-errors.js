const assert = require('node:assert/strict');
const { providerErrorMessage } = require('./utils/providerErrors');

assert.match(providerErrorMessage('AI_PROVIDER_QUOTA_EXCEEDED', 'Resume analysis'), /provider quota is exhausted/i);
assert.match(providerErrorMessage('AI_PROVIDER_AUTH_ERROR', 'Career Assistant'), /provider rejected the server credentials/i);
assert.match(providerErrorMessage('AI_MODEL_INVALID', 'Interview'), /configured AI model is unavailable/i);
assert.match(providerErrorMessage('AI_RATE_LIMITED', 'Coding hint'), /provider is rate-limiting/i);
assert.match(providerErrorMessage('AI_PROVIDER_TIMEOUT', 'Career Assistant'), /before the request deadline/i);
assert.match(providerErrorMessage('AI_PROVIDER_TIMEOUT', 'Career Assistant'), /No result was saved/i);
assert.match(providerErrorMessage('AI_PROVIDER_NETWORK_ERROR', 'Career Assistant'), /could not connect to the AI provider/i);
assert.match(providerErrorMessage('AI_PROVIDER_INVALID_OUTPUT', 'Resume analysis'), /did not match the required format/i);
assert.match(providerErrorMessage('AI_PROVIDER_REQUEST_REJECTED', 'Career Assistant'), /rejected this request configuration/i);
assert.equal(providerErrorMessage('AI_ANSWER_REQUIRED', 'Interview'), 'Provide an answer before requesting an AI evaluation.');
assert.match(providerErrorMessage('AI_PROVIDER_NOT_CONFIGURED'), /configured AI provider is not ready/i);
assert.doesNotMatch(providerErrorMessage('AI_PROVIDER_QUOTA_EXCEEDED'), /API key value/i);
assert.match(providerErrorMessage('AI_PROVIDER_UNAVAILABLE', 'Career Assistant', {
    fallbackAttempted: true
}), /Configured AI providers did not return a usable response/);

console.log('Provider error tests passed: quota, credentials, model, rate limits, timeout, malformed output, and safe user-facing messages.');
