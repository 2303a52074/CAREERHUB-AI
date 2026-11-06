const STRING_LIMITS = {
    name: 100,
    email: 254,
    theme: 20,
    degree: 120,
    branch: 120,
    college: 160,
    graduationYear: 4,
    cgpa: 20,
    careerGoals: 3000,
    targetRole: 120
};

const STRING_ARRAY_LIMITS = {
    technicalSkills: 60,
    softSkills: 60,
    certifications: 160,
    careerInterests: 120,
    preferredRoles: 120,
    preferredLocations: 120
};

const ALLOWED_FIELDS = new Set([
    ...Object.keys(STRING_LIMITS),
    ...Object.keys(STRING_ARRAY_LIMITS),
    'publicProfile',
    'projects',
    'experience'
]);

function validExternalLink(value) {
    if (!value) return true;
    try {
        const url = new URL(value);
        return url.protocol === 'https:';
    } catch {
        return false;
    }
}

function validateText(value, maxLength, required = false) {
    return typeof value === 'string' &&
        value.trim().length <= maxLength &&
        (!required || value.trim().length > 0);
}

function validateEntries(value, fields, requiredField) {
    if (!Array.isArray(value) || value.length > 30) return false;
    return value.every(entry => entry && typeof entry === 'object' && !Array.isArray(entry) &&
        Object.keys(entry).every(key => Object.hasOwn(fields, key)) &&
        (!requiredField || validateText(entry[requiredField], fields[requiredField], true)) &&
        Object.entries(entry).every(([key, item]) => validateText(item, fields[key])));
}

function validateProfileUpdate(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return { error: 'Profile update must be a JSON object.' };
    }

    const updates = {};
    for (const [field, value] of Object.entries(body)) {
        if (!ALLOWED_FIELDS.has(field)) {
            return { error: `Profile field "${field}" cannot be changed here.` };
        }
        if (Object.hasOwn(STRING_LIMITS, field)) {
            if (!validateText(value, STRING_LIMITS[field], ['name', 'email'].includes(field))) {
                return { error: `${field} must be text with at most ${STRING_LIMITS[field]} characters.` };
            }
            const normalized = value.trim();
            if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
                return { error: 'Enter a valid email address.' };
            }
            if (field === 'theme' && !['dark', 'light'].includes(normalized)) {
                return { error: 'Theme must be dark or light.' };
            }
            if (field === 'graduationYear' && normalized && !/^\d{4}$/.test(normalized)) {
                return { error: 'Graduation year must contain four digits.' };
            }
            updates[field] = field === 'email' ? normalized.toLowerCase() : normalized;
            continue;
        }
        if (Object.hasOwn(STRING_ARRAY_LIMITS, field)) {
            const maxLength = STRING_ARRAY_LIMITS[field];
            if (!Array.isArray(value) || value.length > 50 ||
                value.some(item => !validateText(item, maxLength, true))) {
                return { error: `${field} must be a list of up to 50 text values (maximum ${maxLength} characters each).` };
            }
            const uniqueItems = new Map();
            value.forEach(item => {
                const normalized = item.trim();
                const key = normalized.toLowerCase();
                if (!uniqueItems.has(key)) uniqueItems.set(key, normalized);
            });
            updates[field] = [...uniqueItems.values()];
            continue;
        }
        if (field === 'publicProfile') {
            if (typeof value !== 'boolean') return { error: 'publicProfile must be true or false.' };
            updates[field] = value;
            continue;
        }
        if (field === 'projects') {
            const fields = { title: 120, techStack: 300, description: 2000, link: 500 };
            if (!validateEntries(value, fields, 'title') ||
                value.some(project => !validExternalLink(project.link || ''))) {
                return { error: 'Projects must contain valid text fields and HTTPS links.' };
            }
            updates[field] = value.map(project => Object.fromEntries(
                Object.entries(project).map(([key, item]) => [key, item.trim()])
            ));
            continue;
        }
        if (field === 'experience') {
            const fields = { company: 160, role: 120, duration: 120, description: 2000 };
            if (!validateEntries(value, fields, 'company')) {
                return { error: 'Experience entries must contain a company and valid text fields.' };
            }
            updates[field] = value.map(entry => Object.fromEntries(
                Object.entries(entry).map(([key, item]) => [key, item.trim()])
            ));
        }
    }

    if (Object.keys(updates).length === 0) return { error: 'Provide at least one profile field to update.' };
    return { updates };
}

module.exports = { validateProfileUpdate };
