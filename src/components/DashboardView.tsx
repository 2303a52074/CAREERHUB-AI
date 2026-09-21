import React from 'react';
import { DashboardOverview, SectionId } from '../types';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Briefcase, 
  ClipboardCheck, 
  FileText, 
  Mic, 
  Code2, 
  TrendingUp, 
  Compass
} from 'lucide-react';

interface DashboardViewProps {
  overview: DashboardOverview | null;
  onNavigate: (section: SectionId) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ overview, onNavigate }) => {
  const readiness = overview?.readinessScore ?? 82;
  const candidate = overview?.candidate || { name: 'Candidate', targetRole: 'Full Stack Developer', email: '' };
  const completion = overview?.profileCompletion || { completionPercentage: 90, missingFields: [] };
  const pipeline = overview?.applicationsSummary?.pipeline || {
    applied: 1,
    shortlisted: 1,
    assessment: 1,
    interview: 1,
    selected: 1,
    rejected: 0,
  };

  const getReadinessTier = (score: number) => {
    if (score >= 85) return { label: 'Tier-1 Ready (Amazon, Google, Microsoft)', color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-500/30' };
    if (score >= 70) return { label: 'High Potential (Product & FinTech)', color: 'text-cyan-400', bg: 'bg-cyan-950/40 border-cyan-500/30' };
    if (score >= 50) return { label: 'Emerging Candidate (Service & Startups)', color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-500/30' };
    return { label: 'Needs Comprehensive Practice', color: 'text-rose-400', bg: 'bg-rose-950/40 border-rose-500/30' };
  };

  const tier = getReadinessTier(readiness);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-[#101e40] to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/50 text-cyan-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Campus Placement Season Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">{candidate.name}</span>!
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Your placement intelligence cockpit is monitoring target roles for <span className="text-cyan-300 font-semibold">{candidate.targetRole}</span>. Prepare strategically across Aptitude, Data Structures, and Mock Interviews.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('assessment')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Diagnostic Test</span>
            </button>
            <button
              onClick={() => onNavigate('opportunities')}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-sm transition-all flex items-center gap-2"
            >
              <Briefcase className="w-4 h-4 text-cyan-400" />
              <span>View Matches</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Readiness Gauge & Pipeline Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Readiness Card */}
        <div className="lg:col-span-1 rounded-3xl bg-[#0f1b3b] border border-slate-800 p-6 flex flex-col justify-between relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Placement Readiness Index
            </span>
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              AI Evaluated
            </span>
          </div>

          {/* Big Circular Score Display */}
          <div className="my-4 flex flex-col items-center justify-center">
            <div className="relative w-44 h-44 flex items-center justify-center">
              {/* SVG Ring */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-800"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-cyan-400"
                  strokeDasharray={`${(readiness / 100) * 264} 264`}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-extrabold text-white tracking-tight">{readiness}%</span>
                <span className="text-[11px] font-medium text-slate-400 mt-0.5">Readiness Score</span>
              </div>
            </div>

            <div className={`mt-3 px-3 py-1.5 rounded-xl border text-xs font-semibold text-center ${tier.bg} ${tier.color}`}>
              {tier.label}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Industry Benchmark (Tier 1):</span>
              <span className="font-semibold text-white">85%</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Your Placement Probability:</span>
              <span className="font-semibold text-emerald-400">High (91%)</span>
            </div>
          </div>
        </div>

        {/* Pipeline & Metrics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#0f1b3b] border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Profile Health</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{completion.completionPercentage}%</span>
                {completion.completionPercentage === 100 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <span className="text-xs text-amber-400">Incomplete</span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f1b3b] border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Active Pipeline</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-cyan-400">
                  {overview?.applicationsSummary?.activeCount ?? 5}
                </span>
                <span className="text-xs text-slate-400">Roles</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f1b3b] border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Interviews Lined Up</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-300">{pipeline.interview}</span>
                <span className="text-xs text-slate-400">Scheduled</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f1b3b] border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Offers Received</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-400">{pipeline.selected}</span>
                <span className="text-xs text-emerald-300 font-medium">Selected</span>
              </div>
            </div>
          </div>

          {/* Application Pipeline Stage Visualizer */}
          <div className="p-6 rounded-3xl bg-[#0f1b3b] border border-slate-800 space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Campus Application Funnel</h3>
                <p className="text-xs text-slate-400">Live recruitment progress across all drives</p>
              </div>
              <button
                onClick={() => onNavigate('applications')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
              >
                Open Pipeline <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Funnel Stage Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 block mb-1">1. Applied</span>
                <span className="text-lg font-bold text-white">{pipeline.applied}</span>
              </div>
              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-center">
                <span className="text-[11px] text-blue-300 block mb-1">2. Shortlisted</span>
                <span className="text-lg font-bold text-blue-200">{pipeline.shortlisted}</span>
              </div>
              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 text-center">
                <span className="text-[11px] text-purple-300 block mb-1">3. Assessment</span>
                <span className="text-lg font-bold text-purple-200">{pipeline.assessment}</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 text-center">
                <span className="text-[11px] text-amber-300 block mb-1">4. Interview</span>
                <span className="text-lg font-bold text-amber-200">{pipeline.interview}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-center col-span-2 sm:col-span-1">
                <span className="text-[11px] text-emerald-300 block mb-1">5. Selected</span>
                <span className="text-lg font-bold text-emerald-200">{pipeline.selected}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Launch Action Cards */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Compass className="w-5 h-5 text-cyan-400" />
          <span>Recommended Placement Preparation Modules</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: AI Interview Prep */}
          <div
            onClick={() => onNavigate('interview')}
            className="group cursor-pointer p-5 rounded-2xl bg-[#0f1b3b] hover:bg-[#13234d] border border-slate-800 hover:border-cyan-500/50 transition-all shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Mic className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">
                AI Mock Interview
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Simulate Technical & HR rounds with live AI scoring, question hints, and feedback.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-cyan-400 font-semibold">
              <span>Start Session</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: ATS Resume Scanner */}
          <div
            onClick={() => onNavigate('resume')}
            className="group cursor-pointer p-5 rounded-2xl bg-[#0f1b3b] hover:bg-[#13234d] border border-slate-800 hover:border-blue-500/50 transition-all shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-950 text-blue-400 border border-blue-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base group-hover:text-blue-300 transition-colors">
                ATS Resume Audit
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Scan resume text or PDF against top tech recruiters with keyword gap analysis.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-blue-400 font-semibold">
              <span>Audit Resume</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: DSA Coding Arena */}
          <div
            onClick={() => onNavigate('coding')}
            className="group cursor-pointer p-5 rounded-2xl bg-[#0f1b3b] hover:bg-[#13234d] border border-slate-800 hover:border-purple-500/50 transition-all shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-950 text-purple-400 border border-purple-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base group-hover:text-purple-300 transition-colors">
                DSA Coding Arena
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Practice LeetCode-style data structures with live code execution and test cases.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-purple-400 font-semibold">
              <span>Solve Problems</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: AI Career Mentor */}
          <div
            onClick={() => onNavigate('assistant')}
            className="group cursor-pointer p-5 rounded-2xl bg-[#0f1b3b] hover:bg-[#13234d] border border-slate-800 hover:border-emerald-500/50 transition-all shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">
                AI Career Mentor
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Ask anything about company interview rounds, placement roadmaps, and salary negotiation.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-emerald-400 font-semibold">
              <span>Chat With AI</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
