export type SectionId = 
  | 'dashboard'
  | 'assistant'
  | 'assessment'
  | 'skillgap'
  | 'opportunities'
  | 'applications'
  | 'resume'
  | 'interview'
  | 'coding'
  | 'analytics'
  | 'profile';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  degree?: string;
  department?: string;
  college?: string;
  graduationYear?: number;
  cgpa?: number;
  targetRole?: string;
  targetCompanies?: string[];
  skills?: string[];
  softSkills?: string[];
  certifications?: string[];
  projects?: {
    title: string;
    description: string;
    techStack: string[];
    liveUrl?: string;
    githubUrl?: string;
  }[];
  experience?: {
    role: string;
    company: string;
    duration: string;
    highlights: string;
  }[];
  readinessScore?: number;
}

export interface DashboardOverview {
  candidate: {
    name: string;
    targetRole: string;
    email: string;
  };
  readinessScore: number;
  profileCompletion: {
    completionPercentage: number;
    missingFields: string[];
  };
  applicationsSummary: {
    activeCount: number;
    pipeline: {
      applied: number;
      shortlisted: number;
      assessment: number;
      interview: number;
      selected: number;
      rejected: number;
    };
  };
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface DiagnosticQuestion {
  id: number;
  category: 'Aptitude' | 'Technical' | 'Problem Solving' | 'Communication' | 'Role-Specific';
  question: string;
  options: string[];
}

export interface DiagnosticBreakdownItem {
  category: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

export interface DiagnosticResult {
  message: string;
  assessmentId: string;
  overallReadiness: number;
  scores: {
    aptitude: number;
    technical: number;
    problemSolving: number;
    communication: number;
    roleSpecific: number;
  };
  strengths: string[];
  weaknesses: string[];
  skillGaps: string[];
  recommendedSkills: string[];
  suitableRoles: string[];
  breakdown: DiagnosticBreakdownItem[];
}

export interface SkillItem {
  skill: string;
  priority: 'High' | 'Medium' | 'Low';
  description: string;
  status: 'acquired' | 'missing';
}

export interface RoadmapMilestone {
  skill: string;
  priority: string;
  estimatedHours: string;
  recommendedCourse: string;
  practiceAction: string;
}

export interface SkillGapData {
  targetRole: string;
  matchPercentage: number;
  totalSkillsRequired: number;
  acquiredCount: number;
  missingCount: number;
  matchedSkills: SkillItem[];
  missingSkills: SkillItem[];
  learningRoadmap: RoadmapMilestone[];
}

export interface Opportunity {
  _id: string;
  id?: string;
  type: 'job' | 'internship' | 'hackathon' | 'course';
  title: string;
  organization: string;
  location: string;
  salaryOrStipend: string;
  requiredSkills: string[];
  eligibility: string;
  deadline: string;
  openings: number;
  description: string;
  applicationLink: string;
  overallMatch: number;
  skillsMatch?: number;
  educationMatch?: number;
  roleMatch?: number;
  experienceMatch?: number;
  locationMatch?: number;
  matchedSkills: string[];
  missingSkills: string[];
  matchReason?: string;
}

export type ApplicationStatus = 'Applied' | 'Shortlisted' | 'Assessment' | 'Interview' | 'Selected' | 'Rejected';

export interface JobApplication {
  _id: string;
  userId: string;
  company: string;
  jobRole: string;
  type?: 'job' | 'internship' | 'hackathon' | 'course';
  location?: string;
  salaryOrStipend?: string;
  appliedDate: string;
  status: ApplicationStatus;
  interviewDate?: string;
  matchPercentage?: number;
  notes?: string;
  contactPerson?: string;
}

export interface ResumeAnalysisResult {
  score: number;
  atsCompatibility: number;
  summary: string;
  matchedSkills: string[];
  detectedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  suggestedJobs: { title: string; link: string }[];
}

export interface CodingProblem {
  _id: string;
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  solutionTemplate: string;
  points: number;
  companies: string[];
  constraints?: string;
}

export interface InterviewQuestion {
  type: string;
  question: string;
  skill?: string;
  difficulty: string;
  hint?: string;
  company?: string;
  interviewType?: string;
}
