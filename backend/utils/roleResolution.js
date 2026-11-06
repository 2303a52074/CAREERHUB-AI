function resolveTargetRole(requestedRole, profile) {
    if (typeof requestedRole === 'string' && requestedRole.trim()) {
        return { role: requestedRole.trim(), source: 'exercise' };
    }
    if (typeof profile?.targetRole === 'string' && profile.targetRole.trim()) {
        return { role: profile.targetRole.trim(), source: 'profile' };
    }
    return { role: null, source: 'missing' };
}

function targetRoleRequiredResponse(res) {
    return res.status(409).json({
        code: 'TARGET_ROLE_REQUIRED',
        message: 'Choose a target role in your profile before using this personalized feature.',
        actionUrl: '/profile'
    });
}

module.exports = { resolveTargetRole, targetRoleRequiredResponse };
