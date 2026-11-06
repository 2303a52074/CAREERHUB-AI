// CareerHub AI - Frontend Service & Interaction Controller
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function safeArbeitnowLink(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' &&
            ['arbeitnow.com', 'www.arbeitnow.com', 'arbeitnow.co.uk', 'www.arbeitnow.co.uk'].includes(url.hostname)
            ? url.href
            : '';
    } catch {
        return '';
    }
}

const CareerHub = {
    user: null,
    profileCompletion: 0,
    missingFields: [],

    async getHeaders() {
        const token = localStorage.getItem("token");
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        };
    },

    // 1. Dashboard Overview Loader
    async loadOverview() {
        try {
            const headers = await this.getHeaders();
            const [profileRes, appsRes, assessmentRes] = await Promise.all([
                fetch('/api/career/profile', { headers }),
                fetch('/api/career/applications', { headers }),
                fetch('/api/career/assessment/latest', { headers })
            ]);

            const profileData = await profileRes.json();
            const appsData = await appsRes.json();
            const assessmentData = await assessmentRes.json();
            if (!profileRes.ok || !appsRes.ok || !assessmentRes.ok) {
                throw new Error(profileData.message || appsData.message || assessmentData.message || 'Dashboard data could not be loaded.');
            }

            this.user = profileData.user;
            this.profileCompletion = profileData.completionPercentage ?? 0;
            this.missingFields = profileData.missingFields || [];

            // Update Readiness Score
            const readiness = assessmentData.assessment?.scores?.overallReadiness ??
                assessmentData.overallReadiness ?? this.user.careerReadinessScore ?? 0;
            const readinessEl = document.getElementById('dashReadinessScore');
            if (readinessEl) readinessEl.innerText = readiness + '%';

            const readinessRing = document.getElementById('dashReadinessRing');
            if (readinessRing) {
                readinessRing.style.background = `conic-gradient(#00d2ff ${readiness * 3.6}deg, rgba(255,255,255,0.08) 0deg)`;
            }

            // Update Profile Completion
            const compEl = document.getElementById('dashProfileCompletion');
            if (compEl) compEl.innerText = this.profileCompletion + '%';
            const compBar = document.getElementById('dashProfileBar');
            if (compBar) compBar.style.width = this.profileCompletion + '%';

            // Missing fields badge list
            const missingEl = document.getElementById('dashMissingFields');
            if (missingEl) {
                if (this.missingFields.length === 0) {
                    missingEl.innerHTML = '<span class="badge" style="background:rgba(16,185,129,0.2); color:#10b981; border-color:#10b981;">✓ Profile 100% Complete</span>';
                } else {
                    missingEl.innerHTML = this.missingFields.map(f => `<span class="badge" style="background:rgba(239,68,68,0.15); color:#f87171; border-color:#f87171;">+ Add ${f}</span>`).join(' ');
                }
            }

            // Update Applications Stats
            const stats = appsData.stats || {};
            const appCountEl = document.getElementById('dashActiveApps');
            if (appCountEl) appCountEl.innerText = stats.total || 0;

            const pipelineEl = document.getElementById('dashAppPipeline');
            if (pipelineEl) {
                pipelineEl.innerHTML = `
                    <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:8px;">
                        <span>Applied: <strong>${stats.applied || 0}</strong></span>
                        <span>Shortlisted: <strong>${stats.shortlisted || 0}</strong></span>
                        <span>Assessment: <strong>${stats.assessment || 0}</strong></span>
                        <span style="color:#00d2ff;">Interview: <strong>${stats.interview || 0}</strong></span>
                        <span style="color:#10b981;">Offers: <strong>${stats.selected || 0}</strong></span>
                    </div>
                `;
            }

            // Target Role indicator
            const targetRoleEl = document.getElementById('dashTargetRole');
            if (targetRoleEl) targetRoleEl.innerText = this.user.targetRole || 'Not set';

            // Candidate Name greeting
            const candidateNameEl = document.getElementById('dashCandidateName');
            if (candidateNameEl) candidateNameEl.innerText = this.user.name || 'Candidate';

        } catch (e) {
            console.error('Failed to load CareerHub overview:', e);
        }
    },

    // 2. AI Career Assistant
    chatHistory: [],
    async sendAssistantMessage(userText) {
        if (!userText || !userText.trim()) return;
        const chatContainer = document.getElementById('assistantChatMessages');
        if (!chatContainer) return;

        // Append user message
        this.chatHistory.push({ role: 'user', content: userText });
        const userMsgDiv = document.createElement('div');
        userMsgDiv.className = 'chat-message user';
        userMsgDiv.innerHTML = `<div class="message-bubble"><strong>👤 You</strong><p style="margin-top:6px;">${escapeHtml(userText)}</p></div>`;
        chatContainer.appendChild(userMsgDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // Append typing indicator
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message ai';
        typingDiv.id = 'assistantTypingIndicator';
        typingDiv.innerHTML = `<div class="message-bubble"><i class="fas fa-spinner fa-spin" style="color:#00d2ff;"></i> Thinking & analyzing your profile...</div>`;
        chatContainer.appendChild(typingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        try {
            const headers = await this.getHeaders();
            const res = await fetch('/api/career/assistant', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    message: userText,
                    history: this.chatHistory.slice(-6)
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Career assistant request failed.');
            const reply = data.reply;
            this.chatHistory.push({ role: 'assistant', content: reply });

            typingDiv.remove();

            const aiMsgDiv = document.createElement('div');
            aiMsgDiv.className = 'chat-message ai';
            // Format markdown-like bold and line breaks
            const formattedReply = escapeHtml(reply)
                .replace(/\n\n/g, '<br><br>')
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

            const responseSource = data.source === 'rule-based' ? 'Offline guidance' : 'AI-generated';
            aiMsgDiv.innerHTML = `<div class="message-bubble"><strong>🤖 CareerHub AI Mentor</strong><span style="font-size:11px;color:rgba(255,255,255,0.55);margin-left:8px;">${responseSource}</span><div style="margin-top:8px; line-height:1.6;">${formattedReply}</div></div>`;
            chatContainer.appendChild(aiMsgDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;

        } catch (e) {
            typingDiv.remove();
            showToast('Career assistant request failed.', 'error');
        }
    },

    // 3. Career Profile Management
    async loadProfileView() {
        try {
            const headers = await this.getHeaders();
            const res = await fetch('/api/career/profile', { headers });
            const data = await res.json();
            const u = data.user || {};

            document.getElementById('profileDegree').value = u.degree || '';
            document.getElementById('profileBranch').value = u.branch || '';
            document.getElementById('profileCollege').value = u.college || '';
            document.getElementById('profileGradYear').value = u.graduationYear || '';
            document.getElementById('profileCgpa').value = u.cgpa || '';
            document.getElementById('profileTargetRole').value = u.targetRole || '';
            document.getElementById('profileCareerGoals').value = u.careerGoals || '';
            document.getElementById('profileTechSkills').value = (u.technicalSkills || []).join(', ');
            document.getElementById('profileSoftSkills').value = (u.softSkills || []).join(', ');
            document.getElementById('profileCertifications').value = (u.certifications || []).join('\n');

            // Render projects
            const projContainer = document.getElementById('profileProjectsList');
            if (projContainer) {
                projContainer.innerHTML = (u.projects || []).map(p => `
                    <div style="background:rgba(0,210,255,0.05); border:1px solid rgba(0,210,255,0.2); border-radius:12px; padding:12px; margin-bottom:8px;">
                        <strong style="color:#00d2ff;">${escapeHtml(p.title)}</strong>
                        <span style="font-size:11px; color:rgba(255,255,255,0.5); margin-left:8px;">${escapeHtml(p.techStack)}</span>
                        <p style="font-size:12px; margin-top:4px;">${escapeHtml(p.description)}</p>
                    </div>
                `).join('');
            }

            // Render completion score
            const completionEl = document.getElementById('profileCompletionBadge');
            if (completionEl) {
                completionEl.innerText = `${data.completionPercentage}% Complete`;
                completionEl.style.color = data.completionPercentage >= 80 ? '#10b981' : '#f59e0b';
            }

        } catch (e) {
            console.error('Failed to load profile view:', e);
        }
    },

    async saveProfile() {
        try {
            const updatePayload = {
                degree: document.getElementById('profileDegree').value,
                branch: document.getElementById('profileBranch').value,
                college: document.getElementById('profileCollege').value,
                graduationYear: document.getElementById('profileGradYear').value,
                cgpa: document.getElementById('profileCgpa').value,
                targetRole: document.getElementById('profileTargetRole').value,
                careerGoals: document.getElementById('profileCareerGoals').value,
                technicalSkills: document.getElementById('profileTechSkills').value.split(',').map(s => s.trim()).filter(Boolean),
                softSkills: document.getElementById('profileSoftSkills').value.split(',').map(s => s.trim()).filter(Boolean),
                certifications: document.getElementById('profileCertifications').value.split('\n').map(s => s.trim()).filter(Boolean)
            };

            const headers = await this.getHeaders();
            const res = await fetch('/api/career/profile', {
                method: 'PUT',
                headers,
                body: JSON.stringify(updatePayload)
            });
            const data = await res.json();
            showToast(`Profile updated! Completion: ${data.completionPercentage}%`, 'success');
            this.loadProfileView();
            this.loadOverview();
        } catch (e) {
            showToast('Failed to update profile', 'error');
        }
    },

    // 4. Placement Readiness Assessment
    assessmentQuestions: [],
    assessmentAnswers: [],
    currentAssessmentIdx: 0,
    assessmentSessionId: null,

    async startAssessment() {
        try {
            const headers = await this.getHeaders();
            const res = await fetch('/api/career/assessment/start', {
                method: 'POST',
                headers,
                body: JSON.stringify({ category: 'Mixed', difficulty: 'medium', count: 5 })
            });
            const data = await res.json();
            if (!res.ok) {
                showToast(data.message || 'Assessment generation is unavailable. Please try again.', 'error');
                return;
            }
            if (!['openrouter', 'gemini', 'groq'].includes(data.source) ||
                !data.sessionId || !Array.isArray(data.questions) || !data.questions.length) {
                showToast('The AI provider did not return a usable assessment. Please try again.', 'error');
                return;
            }
            this.assessmentSessionId = data.sessionId;
            this.assessmentQuestions = data.questions;
            this.assessmentAnswers = new Array(this.assessmentQuestions.length).fill(null);
            this.currentAssessmentIdx = 0;

            document.getElementById('assessmentIntroCard').style.display = 'none';
            document.getElementById('assessmentReportCard').style.display = 'none';
            document.getElementById('assessmentActiveCard').style.display = 'block';

            showToast('Assessment questions are ready.', 'success');
            this.renderAssessmentQuestion();
        } catch (e) {
            console.error('Assessment start failed:', e);
            showToast('Failed to start the assessment. Check your connection and try again.', 'error');
        }
    },

    renderAssessmentQuestion() {
        if (this.currentAssessmentIdx >= this.assessmentQuestions.length) {
            this.submitAssessment();
            return;
        }

        const q = this.assessmentQuestions[this.currentAssessmentIdx];
        document.getElementById('assessmentProgressText').innerText = `Question ${this.currentAssessmentIdx + 1} of ${this.assessmentQuestions.length} (${q.category})`;
        document.getElementById('assessmentProgressBar').style.width = `${((this.currentAssessmentIdx + 1) / this.assessmentQuestions.length) * 100}%`;

        document.getElementById('assessmentQuestionText').innerText = q.question;
        const optionsContainer = document.getElementById('assessmentOptionsContainer');
        optionsContainer.innerHTML = q.options.map((opt, i) => `
            <label style="display:flex; align-items:center; gap:12px; background:rgba(0,210,255,0.06); padding:12px 18px; border-radius:12px; margin-bottom:10px; cursor:pointer; border:1px solid rgba(0,210,255,0.2);">
                <input type="radio" name="assessmentOpt" value="${i}" ${this.assessmentAnswers[this.currentAssessmentIdx] === i ? 'checked' : ''}>
                <span>${escapeHtml(opt)}</span>
            </label>
        `).join('');
    },

    nextAssessmentQuestion() {
        const selected = document.querySelector('input[name="assessmentOpt"]:checked');
        if (!selected) {
            showToast('Select an answer before continuing.', 'error');
            return;
        }
        this.assessmentAnswers[this.currentAssessmentIdx] = parseInt(selected.value, 10);
        this.currentAssessmentIdx++;
        this.renderAssessmentQuestion();
    },

    async submitAssessment() {
        const progressText = document.getElementById('assessmentProgressText');
        progressText.innerText = 'Evaluating readiness responses...';

        try {
            const headers = await this.getHeaders();
            const res = await fetch('/api/career/assessment/submit', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    sessionId: this.assessmentSessionId,
                    answers: this.assessmentAnswers.map((answer, index) => ({
                        questionId: index + 1,
                        answer
                    }))
                })
            });
            const report = await res.json();
            if (!res.ok) {
                progressText.innerText = report.message || 'Assessment submission failed. Please retry.';
                this.currentAssessmentIdx = this.assessmentQuestions.length - 1;
                showToast(report.message || 'Assessment submission failed.', 'error');
                return;
            }

            document.getElementById('assessmentActiveCard').style.display = 'none';
            const reportCard = document.getElementById('assessmentReportCard');
            reportCard.style.display = 'block';

            document.getElementById('reportReadinessScore').innerText = `${report.overallReadiness}%`;
            document.getElementById('reportAptitudeScore').innerText = `${report.scores?.aptitude || 0}%`;
            document.getElementById('reportTechnicalScore').innerText = `${report.scores?.technical || 0}%`;
            document.getElementById('reportProblemSolvingScore').innerText = `${report.scores?.problemSolving || 0}%`;
            document.getElementById('reportCommunicationScore').innerText = `${report.scores?.communication || 0}%`;
            document.getElementById('reportRoleSpecificScore').innerText = `${report.scores?.roleSpecific || 0}%`;

            document.getElementById('reportStrengthsList').innerHTML = (report.strengths || []).map(s => `<li>${escapeHtml(s)}</li>`).join('');
            document.getElementById('reportWeaknessesList').innerHTML = (report.weaknesses || []).map(w => `<li>${escapeHtml(w)}</li>`).join('');
            document.getElementById('reportRecommendedSkills').innerHTML = (report.recommendedSkills || []).map(r => `<span class="badge" style="background:rgba(0,210,255,0.2);">${escapeHtml(r)}</span>`).join(' ');

            showToast('Readiness Assessment evaluated and saved!', 'success');
            this.assessmentSessionId = null;
            this.loadOverview();
        } catch (e) {
            console.error('Assessment submission failed:', e);
            progressText.innerText = 'Assessment submission failed. Select Continue to retry.';
            this.currentAssessmentIdx = this.assessmentQuestions.length - 1;
            showToast('Assessment submission failed. Please retry.', 'error');
        }
    },

    // 5. Skill Gap & Roadmap
    async loadSkillGapView() {
        try {
            const headers = await this.getHeaders();
            const roleSelect = document.getElementById('skillGapRoleSelect');
            const targetRole = roleSelect?.value || '';

            const [gapRes, roadmapRes] = await Promise.all([
                fetch(targetRole ? `/api/career/skill-gap?role=${encodeURIComponent(targetRole)}` : '/api/career/skill-gap', { headers }),
                fetch('/api/career/roadmap', { headers })
            ]);

            const gapData = await gapRes.json();
            const roadmapData = await roadmapRes.json();

            // Render Match Score
            document.getElementById('gapMatchPercentage').innerText = `${gapData.matchPercentage}%`;
            document.getElementById('gapMatchBar').style.width = `${gapData.matchPercentage}%`;
            document.getElementById('gapAcquiredCount').innerText = gapData.acquiredCount;
            document.getElementById('gapMissingCount').innerText = gapData.missingCount;

            // Render acquired skills
            document.getElementById('gapAcquiredList').innerHTML = gapData.matchedSkills.map(s => `
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:10px; padding:10px 14px; margin-bottom:8px;">
                    <div><strong>${escapeHtml(s.skill)}</strong><p style="font-size:11px; color:rgba(255,255,255,0.6);">${escapeHtml(s.description)}</p></div>
                    <span style="color:#10b981; font-weight:600; font-size:12px;">✓ Acquired</span>
                </div>
            `).join('');

            // Render missing skills
            document.getElementById('gapMissingList').innerHTML = gapData.missingSkills.map(s => `
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:10px; padding:10px 14px; margin-bottom:8px;">
                    <div><strong>${escapeHtml(s.skill)}</strong><p style="font-size:11px; color:rgba(255,255,255,0.6);">${escapeHtml(s.description)}</p></div>
                    <span class="badge" style="background:rgba(245,158,11,0.2); color:#f59e0b; border-color:#f59e0b;">${s.priority} Priority</span>
                </div>
            `).join('');

            // Render roadmap milestones
            const roadmapContainer = document.getElementById('roadmapPhasesContainer');
            if (roadmapContainer && roadmapData.phases) {
                roadmapContainer.innerHTML = roadmapData.phases.map(p => `
                    <div class="card" style="margin-bottom:16px; border-color:${p.status === 'completed' ? '#10b981' : p.status === 'in-progress' ? '#00d2ff' : 'rgba(255,255,255,0.1)'}">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h4 style="color:${p.status === 'completed' ? '#10b981' : '#00d2ff'};">${escapeHtml(p.title)}</h4>
                            <span class="badge">${p.status.toUpperCase()}</span>
                        </div>
                        <p style="font-size:12px; color:rgba(255,255,255,0.6); margin:8px 0 14px 0;">${escapeHtml(p.description)}</p>
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            ${p.milestones.map(m => `
                                <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size:13px; background:rgba(0,0,0,0.2); padding:8px 12px; border-radius:8px;">
                                    <input type="checkbox" ${m.completed ? 'checked' : ''} onchange="CareerHub.toggleMilestone('${m.id}', this.checked)">
                                    <span style="${m.completed ? 'text-decoration:line-through; opacity:0.6;' : ''}">${escapeHtml(m.title)}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `).join('');
            }

        } catch (e) {
            console.error('Failed to load skill gap view:', e);
        }
    },

    async toggleMilestone(milestoneId, completed) {
        try {
            const headers = await this.getHeaders();
            const res = await fetch('/api/career/roadmap/milestone', {
                method: 'PUT',
                headers,
                body: JSON.stringify({ milestoneId, completed })
            });
            const data = await res.json();
            showToast(`Milestone updated! Progress: ${data.progressPercentage}%`, 'success');
        } catch (e) {
            showToast('Failed to update milestone', 'error');
        }
    },

    // 6. Opportunities Matcher
    async loadOpportunities(type = 'all', search = '') {
        try {
            const headers = await this.getHeaders();
            let url = `/api/career/opportunities?type=${encodeURIComponent(type)}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;

            const res = await fetch(url, { headers });
            const data = await res.json();
            const listEl = document.getElementById('opportunitiesContainer');
            if (!listEl) return;
            if (!res.ok) {
                listEl.textContent = data.message || 'Live job listings are unavailable.';
                return;
            }

            if (!data.opportunities || data.opportunities.length === 0) {
                listEl.innerHTML = '<p style="text-align:center; padding:40px;">No current listings match this filter.</p>';
                return;
            }

            listEl.innerHTML = data.opportunities.map((opp, index) => `
                <div class="job-card" style="border-left: 4px solid ${opp.overallMatch >= 80 ? '#10b981' : opp.overallMatch >= 65 ? '#00d2ff' : '#f59e0b'};">
                    <div style="flex:1; min-width:280px;">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px; flex-wrap:wrap;">
                            <span class="badge" style="text-transform:uppercase; font-size:10px;">${opp.type}</span>
                            <span class="badge" style="background:rgba(56,189,248,0.12); color:#38bdf8; border-color:rgba(56,189,248,0.3); font-size:10px;">${escapeHtml(opp.source)}</span>
                            <h4 style="font-size:18px; margin:0; color:#ffffff;">${escapeHtml(opp.title)}</h4>
                        </div>
                        <p style="color:#00d2ff; font-weight:700; font-size:14px; margin-bottom:4px;">
                            <i class="fas fa-building"></i> ${escapeHtml(opp.organization)} · <span style="color:rgba(255,255,255,0.7); font-weight:normal;"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(opp.location)}</span>
                        </p>
                        <p style="font-size:12px; color:rgba(255,255,255,0.7); margin-bottom:10px; line-height:1.5;">${escapeHtml(opp.description)}</p>
                        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
                            ${(opp.tags || []).map(tag => `<span class="badge" style="font-size:11px;">${escapeHtml(tag)}</span>`).join('')}
                        </div>
                    </div>
                    <div style="text-align:right; min-width:190px; display:flex; flex-direction:column; justify-content:space-between; align-items:flex-end;">
                        <div>
                            <div style="font-size:28px; font-weight:800; color:${opp.overallMatch >= 80 ? '#10b981' : '#00d2ff'};">${opp.overallMatch == null ? 'Profile incomplete' : `${opp.overallMatch}% Match`}</div>
                            ${opp.salaryOrStipend ? `<div class="job-salary" style="margin:4px 0 12px 0;">${escapeHtml(opp.salaryOrStipend)}</div>` : ''}
                        </div>
                        <div style="display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap;">
                            <button class="btn-secondary" data-job-index="${index}" style="padding:7px 14px; font-size:12px;">
                                <i class="fas fa-bookmark"></i> Track
                            </button>
                            ${safeArbeitnowLink(opp.applicationLink) ? `<a href="${escapeHtml(safeArbeitnowLink(opp.applicationLink))}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="padding:7px 18px; font-size:12px; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:6px; background:linear-gradient(135deg, #00d2ff, #0055ff);">View listing ↗</a>` : ''}
                            </a>
                        </div>
                    </div>
                </div>
            `).join('');
            listEl.querySelectorAll('[data-job-index]').forEach(button => {
                button.addEventListener('click', () => this.trackOpportunity(data.opportunities[Number(button.dataset.jobIndex)], button));
            });

        } catch (e) {
            console.error('Failed to load opportunities:', e);
        }
    },

    async trackOpportunity(job, button) {
        if (!job || !button) return;
        button.disabled = true;
        try {
            const headers = await this.getHeaders();
            const res = await fetch('/api/career/applications', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    company: job.organization,
                    jobRole: job.title,
                    jobId: job.id,
                    sourceUrl: job.applicationLink,
                    source: job.source,
                    applicationMethod: 'tracked',
                    type: job.type,
                    location: job.location,
                    ...(job.salaryOrStipend ? { salaryOrStipend: job.salaryOrStipend } : {}),
                    matchPercentage: job.overallMatch,
                    status: 'Saved'
                })
            });
            if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                if (res.status === 409 && error.duplicate) {
                    button.textContent = 'Already saved';
                    showToast('This job is already in your tracker.', 'info');
                    return;
                }
                throw new Error(error.message || `Request failed (${res.status})`);
            }
            button.textContent = 'Saved to pipeline';
            showToast('Job saved. You have not submitted an application.', 'success');
            this.loadApplications();
        } catch (e) {
            console.error('Failed to track opportunity:', e);
            button.disabled = false;
            showToast(e.message || 'Failed to track application', 'error');
        }
    },

    // 7. Applications Tracker
    async loadApplications() {
        try {
            const headers = await this.getHeaders();
            const res = await fetch('/api/career/applications', { headers });
            const data = await res.json();
            const container = document.getElementById('applicationsTableBody');
            if (!container) return;

            if (!data.applications || data.applications.length === 0) {
                container.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px;">No applications tracked yet. Click "+ New Application" or track from Opportunities!</td></tr>';
                return;
            }

            container.innerHTML = data.applications.map(app => `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                    <td style="padding:14px;"><strong>${escapeHtml(app.company)}</strong></td>
                    <td style="padding:14px;">${escapeHtml(app.jobRole)}</td>
                    <td style="padding:14px;"><span class="badge" style="color:#00d2ff;">${app.matchPercentage == null ? 'Not calculated' : `${app.matchPercentage}%`}</span></td>
                    <td style="padding:14px;">
                        <select onchange="CareerHub.updateApplicationStatus('${app._id}', this.value)" style="padding:6px 12px; font-size:12px;">
                            <option value="Applied" ${app.status === 'Applied' ? 'selected' : ''}>Applied</option>
                            <option value="Shortlisted" ${app.status === 'Shortlisted' ? 'selected' : ''}>Shortlisted</option>
                            <option value="Assessment" ${app.status === 'Assessment' ? 'selected' : ''}>Assessment</option>
                            <option value="Interview" ${app.status === 'Interview' ? 'selected' : ''}>Interview</option>
                            <option value="Selected" ${app.status === 'Selected' ? 'selected' : ''}>Selected (Offer)</option>
                            <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                    </td>
                    <td style="padding:14px; font-size:12px; color:rgba(255,255,255,0.6);">${escapeHtml(app.notes || 'No notes')}</td>
                    <td style="padding:14px; text-align:right;">
                        <button class="btn-secondary" style="padding:4px 10px; font-size:11px;" onclick="CareerHub.deleteApplication('${app._id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');

        } catch (e) {
            console.error('Failed to load applications:', e);
        }
    },

    async updateApplicationStatus(id, newStatus) {
        try {
            const headers = await this.getHeaders();
            await fetch(`/api/career/applications/${id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status: newStatus })
            });
            showToast(`Application status updated to ${newStatus}`, 'success');
            this.loadOverview();
        } catch (e) {
            showToast('Failed to update status', 'error');
        }
    },

    async deleteApplication(id) {
        if (!confirm('Are you sure you want to remove this application?')) return;
        try {
            const headers = await this.getHeaders();
            await fetch(`/api/career/applications/${id}`, {
                method: 'DELETE',
                headers
            });
            showToast('Application removed', 'info');
            this.loadApplications();
            this.loadOverview();
        } catch (e) {
            showToast('Failed to delete application', 'error');
        }
    },

    async createApplication() {
        const company = prompt('Company Name:');
        if (!company) return;
        const jobRole = prompt('Job / Internship Role:') || 'Software Engineer';
        const salary = prompt('Salary / Stipend (Optional):') || 'Competitive';

        try {
            const headers = await this.getHeaders();
            await fetch('/api/career/applications', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    company,
                    jobRole,
                    salaryOrStipend: salary,
                    status: 'Applied',
                })
            });
            showToast('New application tracked!', 'success');
            this.loadApplications();
            this.loadOverview();
        } catch (e) {
            showToast('Failed to create application', 'error');
        }
    },

    // 8. ATS Resume Scanner
    async analyzeResumeText() {
        const text = document.getElementById('resumeTextInput')?.value;
        if (!text || !text.trim()) {
            showToast('Please paste your resume text first.', 'error');
            return;
        }

        const targetRole = document.getElementById('resumeTargetRole')?.value || '';
        const resultContainer = document.getElementById('resumeAnalysis');
        resultContainer.style.display = 'block';
        resultContainer.innerHTML = '<div class="spinner"></div><p style="text-align:center;">Analyzing resume with CareerHub ATS AI...</p>';

        try {
            const headers = await this.getHeaders();
            const res = await fetch('/api/resume/analyze-text', {
                method: 'POST',
                headers,
                body: JSON.stringify({ resumeText: text, targetRole })
            });
            const data = await res.json();
            this.renderResumeAnalysis(data);
        } catch (e) {
            showToast('Resume analysis failed', 'error');
        }
    },

    async uploadResumeFile() {
        const fileInput = document.getElementById('resumeFile');
        const file = fileInput.files[0];
        if (!file) return;

        const targetRole = document.getElementById('resumeTargetRole')?.value || '';
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('targetRole', targetRole);

        const resultContainer = document.getElementById('resumeAnalysis');
        resultContainer.style.display = 'block';
        resultContainer.innerHTML = '<div class="spinner"></div><p style="text-align:center;">Extracting text & parsing ATS keywords...</p>';

        let token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/resume/upload', {
                method: 'POST',
                headers: token ? { 'Authorization': 'Bearer ' + token } : {},
                body: formData
            });
            const data = await res.json();
            this.renderResumeAnalysis(data);
        } catch (e) {
            showToast('Resume upload failed', 'error');
        }
    },

    renderResumeAnalysis(data) {
        const resultContainer = document.getElementById('resumeAnalysis');
        const score = Number.isFinite(data.score) ? data.score : null;
        resultContainer.style.display = 'block';
        resultContainer.innerHTML = `
            <div style="background:rgba(0,210,255,0.06); border:1px solid rgba(0,210,255,0.25); border-radius:18px; padding:28px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:20px;">
                    <div>
                        <h3 style="font-size:22px; color:#fff;">Resume Match Score</h3>
                        <p style="color:rgba(255,255,255,0.6); font-size:13px;">${escapeHtml(data.summary || 'Resume analysis complete.')}</p>
                        <p style="color:rgba(255,255,255,0.55);font-size:11px;">Method: ${escapeHtml(data.analysisMethod || 'not reported')}. Document layout is not evaluated from extracted text.</p>
                    </div>
                    <div style="font-size:42px; font-weight:800; color:${data.score >= 80 ? '#10b981' : '#00d2ff'};">
                        ${score === null ? '—' : `${score}%`}
                    </div>
                </div>
                ${score === null ? '' : `<div class="progress-bar"><div class="progress-fill" style="width:${score}%;"></div></div>`}

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin:24px 0;">
                    <div>
                        <h4 style="color:#10b981; margin-bottom:8px;"><i class="fas fa-check-circle"></i> Detected Keywords</h4>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            ${(data.matchedSkills || []).map(s => `<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981;">✓ ${escapeHtml(s)}</span>`).join('')}
                        </div>
                    </div>
                    <div>
                        <h4 style="color:#f87171; margin-bottom:8px;"><i class="fas fa-exclamation-triangle"></i> Missing High-Impact Skills</h4>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            ${(data.missingSkills || []).map(s => `<span class="badge" style="background:rgba(239,68,68,0.15); color:#f87171;">! ${escapeHtml(s)}</span>`).join('')}
                        </div>
                    </div>
                </div>

                <div style="margin-top:20px;">
                    <h4 style="color:#00d2ff; margin-bottom:8px;"><i class="fas fa-lightbulb"></i> Strategic Placement Recommendations</h4>
                    <ul style="margin-left:20px; line-height:1.7; color:rgba(255,255,255,0.8); font-size:13px;">
                        ${(data.recommendations || []).map(r => `<li>${escapeHtml(r)}</li>`).join('')}
                    </ul>
                </div>

                <button class="btn-primary" onclick="showSection('jobs')" style="margin-top:24px; width:100%;">
                    🔍 Explore Opportunities →
                </button>
            </div>
        `;
        showToast(`Resume scored ${data.score}% ATS compatibility`, 'success');
        this.loadOverview();
    }
};

window.CareerHub = CareerHub;
