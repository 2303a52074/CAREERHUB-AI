import { 
  DashboardOverview, 
  DiagnosticQuestion, 
  DiagnosticResult, 
  SkillGapData, 
  Opportunity, 
  JobApplication, 
  ApplicationStatus,
  ResumeAnalysisResult, 
  CodingProblem, 
  InterviewQuestion, 
  UserProfile 
} from '../types';

let authToken: string = localStorage.getItem('token') || '';

export function getAuthToken(): string {
  return authToken;
}

export function setAuthToken(token: string) {
  authToken = token;
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (authToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data.message || data.error) errorMsg = data.message || data.error;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  async ensureDemoAuth(): Promise<{ token: string; user: any }> {
    if (authToken) {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return { token: authToken, user };
      } catch {}
    }
    const data = await request<{ token: string; user: any }>('/api/auth/demo', {
      method: 'POST',
    });
    setAuthToken(data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  async getOverview(): Promise<DashboardOverview> {
    return request<DashboardOverview>('/api/career/overview');
  },

  async askAssistant(message: string): Promise<{ reply: string; timestamp: string }> {
    return request<{ reply: string; timestamp: string }>('/api/career/assistant', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  async getAssessmentQuestions(): Promise<{ questions: DiagnosticQuestion[] }> {
    return request<{ questions: DiagnosticQuestion[] }>('/api/career/assessment/questions');
  },

  async submitAssessment(answers: any[], targetRole: string): Promise<DiagnosticResult> {
    return request<DiagnosticResult>('/api/career/assessment/submit', {
      method: 'POST',
      body: JSON.stringify({ answers, targetRole }),
    });
  },

  async getSkillGap(targetRole?: string): Promise<SkillGapData> {
    const query = targetRole ? `?targetRole=${encodeURIComponent(targetRole)}` : '';
    return request<SkillGapData>(`/api/career/skill-gap${query}`);
  },

  async getOpportunities(type?: string): Promise<{ opportunities: Opportunity[]; total: number }> {
    const query = type && type !== 'all' ? `?type=${encodeURIComponent(type)}` : '';
    return request<{ opportunities: Opportunity[]; total: number }>(`/api/career/opportunities${query}`);
  },

  async getApplications(): Promise<{ applications: JobApplication[]; stats: any }> {
    return request<{ applications: JobApplication[]; stats: any }>('/api/career/applications');
  },

  async addApplication(appData: Partial<JobApplication>): Promise<{ message: string; application: JobApplication }> {
    return request<{ message: string; application: JobApplication }>('/api/career/applications', {
      method: 'POST',
      body: JSON.stringify(appData),
    });
  },

  async updateApplicationStatus(id: string, status: ApplicationStatus, notes?: string): Promise<{ message: string; application: JobApplication }> {
    return request<{ message: string; application: JobApplication }>(`/api/career/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  },

  async analyzeResumeText(resumeText: string, targetRole: string): Promise<ResumeAnalysisResult> {
    return request<ResumeAnalysisResult>('/api/resume/analyze-text', {
      method: 'POST',
      body: JSON.stringify({ resumeText, targetRole }),
    });
  },

  async analyzeResumeFile(formData: FormData): Promise<ResumeAnalysisResult> {
    return request<ResumeAnalysisResult>('/api/resume/analyze', {
      method: 'POST',
      body: formData,
    });
  },

  async generateInterviewQuestions(payload: { role: string; difficulty: string; type: string }): Promise<{ questions: InterviewQuestion[] }> {
    return request<{ questions: InterviewQuestion[] }>('/api/interview/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async evaluateInterviewAnswer(payload: { question: string; answer: string; role: string; type: string }): Promise<{ score: number; feedback: string; strengths: string[]; improvements: string[] }> {
    return request<{ score: number; feedback: string; strengths: string[]; improvements: string[] }>('/api/interview/evaluate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getCodingProblems(): Promise<CodingProblem[]> {
    return request<CodingProblem[]>('/api/coding/problems');
  },

  async runCode(problemId: string, code: string, language: string = 'javascript'): Promise<any> {
    return request<any>('/api/coding/run', {
      method: 'POST',
      body: JSON.stringify({ problemId, code, language }),
    });
  },

  async getProfile(): Promise<UserProfile> {
    const res = await request<any>('/api/career/profile');
    return res.user || res;
  },

  async updateProfile(profileData: Partial<UserProfile>): Promise<{ message: string; user: UserProfile }> {
    return request<{ message: string; user: UserProfile }>('/api/career/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },
};
