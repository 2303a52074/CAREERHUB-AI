const ARBEITNOW_API_URL = 'https://www.arbeitnow.com/api/job-board-api';
const ARBEITNOW_SOURCE = 'Arbeitnow Job Board API';
const ARBEITNOW_HOSTS = new Set(['arbeitnow.com', 'www.arbeitnow.com', 'arbeitnow.co.uk', 'www.arbeitnow.co.uk']);

function safeHttpsUrl(value) {
    if (typeof value !== 'string') return null;
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return null;
        return url.toString();
    } catch {
        return null;
    }
}

function normalizeArbeitnowJob(job) {
    if (!job || typeof job !== 'object') return null;
    const applicationLink = safeHttpsUrl(job.url);
    const company = typeof job.company_name === 'string' ? job.company_name.trim() : '';
    const title = typeof job.title === 'string' ? job.title.trim() : '';
    if (!applicationLink || !ARBEITNOW_HOSTS.has(new URL(applicationLink).hostname) || !company || !title) {
        return null;
    }

    const tags = Array.isArray(job.tags)
        ? job.tags.filter(tag => typeof tag === 'string' && tag.trim()).map(tag => tag.trim())
        : [];
    const sourceJobTypes = Array.isArray(job.job_types)
        ? job.job_types.filter(type => typeof type === 'string' && type.trim()).map(type => type.trim())
        : [];
    const isInternship = [...tags, ...sourceJobTypes, title]
        .some(value => /\bintern(ship)?\b|\bpraktikum\b/i.test(value));
    const remote = job.remote === true;
    const sourceLocation = typeof job.location === 'string' ? job.location.trim() : '';
    if (!sourceLocation && !remote) return null;
    const location = sourceLocation || 'Remote';
    const timestamp = Number(job.created_at);
    const createdAt = Number.isFinite(timestamp) && timestamp > 0
        ? new Date(timestamp * 1000).toISOString()
        : null;

    return {
        id: String(job.slug || new URL(applicationLink).pathname.split('/').filter(Boolean).pop() || applicationLink),
        type: isInternship ? 'internship' : 'job',
        title,
        organization: company,
        location,
        remote,
        tags,
        sourceJobTypes,
        description: typeof job.description === 'string'
            ? job.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
            : '',
        applicationLink,
        source: ARBEITNOW_SOURCE,
        isSample: false,
        createdAt,
        ...(typeof job.salary === 'string' && job.salary.trim() ? { salaryOrStipend: job.salary.trim() } : {})
    };
}

async function fetchLiveJobs({ fetchImpl = fetch, timeoutMs = 12000 } = {}) {
    let response;
    try {
        response = await fetchImpl(`${ARBEITNOW_API_URL}?page=1`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(timeoutMs)
        });
    } catch (cause) {
        const error = new Error('Job provider request failed.');
        error.code = cause?.name === 'TimeoutError' || cause?.name === 'AbortError'
            ? 'JOB_PROVIDER_TIMEOUT'
            : 'JOB_PROVIDER_UNAVAILABLE';
        error.status = 503;
        throw error;
    }
    if (!response.ok) {
        const error = new Error(`Job provider returned HTTP ${response.status}.`);
        error.code = 'JOB_PROVIDER_UNAVAILABLE';
        error.status = 503;
        throw error;
    }

    let payload;
    try {
        payload = await response.json();
    } catch {
        const error = new Error('Job provider returned invalid JSON.');
        error.code = 'JOB_PROVIDER_INVALID_RESPONSE';
        error.status = 503;
        throw error;
    }
    if (!payload || !Array.isArray(payload.data)) {
        const error = new Error('Job provider returned an invalid response.');
        error.code = 'JOB_PROVIDER_INVALID_RESPONSE';
        error.status = 503;
        throw error;
    }

    return payload.data.map(normalizeArbeitnowJob).filter(Boolean);
}

function calculateJobMatch(profile, job) {
    const normalize = value => String(value).toLowerCase()
        .replace(/[^a-z0-9+#.]+/g, ' ').replace(/\s+/g, ' ').trim();
    const containsTerm = (text, term) => {
        const normalizedTerm = normalize(term);
        if (normalizedTerm.length < 2) return false;
        const escapedTerm = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(^|[^a-z0-9+#])${escapedTerm}(?=$|[^a-z0-9+#])`, 'i')
            .test(String(text || ''));
    };
    const profileSkills = Array.isArray(profile?.technicalSkills)
        ? profile.technicalSkills.map(skill => String(skill).trim().toLowerCase()).filter(Boolean)
        : [];
    const jobTags = (job.tags || []).map(tag => String(tag).trim().toLowerCase()).filter(Boolean);
    const title = String(job.title || '');
    const listingText = [title, job.description, ...jobTags].filter(Boolean).join(' ');
    const matchedProfileSkills = profileSkills.filter(skill => containsTerm(listingText, skill));
    const matchedSkills = jobTags.filter(tag =>
        profileSkills.some(skill => containsTerm(tag, skill) || containsTerm(skill, tag))
    );
    const requiredDimensions = [];

    if (profileSkills.length > 0 && listingText.trim()) {
        requiredDimensions.push({
            weight: 0.6,
            score: Math.round((new Set(matchedProfileSkills).size / profileSkills.length) * 100)
        });
    }

    const targetRole = String(profile?.targetRole || profile?.preferredRoles?.[0] || '').trim().toLowerCase();
    if (targetRole && title) {
        const roleTerms = normalize(targetRole).split(/\s+/)
            .filter(term => term.length > 2 || /[+#.]/.test(term));
        if (roleTerms.length) {
            const matchedTerms = roleTerms.filter(term => containsTerm(title, term));
            requiredDimensions.push({
                weight: 0.3,
                score: Math.round((matchedTerms.length / roleTerms.length) * 100)
            });
        }
    }

    const preferredLocations = Array.isArray(profile?.preferredLocations)
        ? profile.preferredLocations.map(location => String(location).trim().toLowerCase()).filter(Boolean)
        : [];
    if (preferredLocations.length > 0 && job.location) {
        const location = String(job.location).toLowerCase();
        const locationMatch = preferredLocations.some(preferred =>
            preferred === 'remote' ? job.remote === true : location.includes(preferred)
        );
        requiredDimensions.push({ weight: 0.1, score: locationMatch ? 100 : 0 });
    }

    const totalWeight = requiredDimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
    const overallMatch = totalWeight
        ? Math.round(requiredDimensions.reduce((sum, dimension) => sum + dimension.score * dimension.weight, 0) / totalWeight)
        : null;
    const allJobTags = [...new Set(jobTags)];
    const matchBasis = [];
    if (profileSkills.length > 0 && listingText.trim()) matchBasis.push('listed skills');
    if (targetRole && title) matchBasis.push('target role');
    if (preferredLocations.length > 0 && job.location) matchBasis.push('preferred location');

    return {
        overallMatch,
        matchedSkills,
        matchedProfileSkills,
        missingSkills: allJobTags.filter(tag => !matchedSkills.includes(tag)),
        matchBasis,
        matchUnavailableReason: overallMatch === null
            ? 'Add technical skills, a target role, or a preferred location to your profile to calculate a match score.'
            : null
    };
}

module.exports = {
    ARBEITNOW_API_URL,
    ARBEITNOW_SOURCE,
    safeHttpsUrl,
    normalizeArbeitnowJob,
    fetchLiveJobs,
    calculateJobMatch
};
