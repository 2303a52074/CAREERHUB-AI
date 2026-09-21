import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SkillGapData } from '../types';
import { 
  GitFork, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Sparkles, 
  Target, 
  ChevronRight, 
  Layers, 
  Zap,
  Check
} from 'lucide-react';

export const SkillGapView: React.FC = () => {
  const [targetRole, setTargetRole] = useState('Full Stack Developer');
  const [data, setData] = useState<SkillGapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedMilestones, setCompletedMilestones] = useState<Record<number, boolean>>({});

  const roles = [
    'Full Stack Developer',
    'Frontend Developer',
    'Backend Systems Engineer',
    'Data Scientist / AI Engineer',
    'DevOps & Cloud Engineer',
  ];

  useEffect(() => {
    loadSkillGap(targetRole);
  }, [targetRole]);

  const loadSkillGap = async (role: string) => {
    setLoading(true);
    try {
      const res = await api.getSkillGap(role);
      setData(res);
    } catch (err) {
      console.warn('Failed to load skill gap from server:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMilestone = (idx: number) => {
    setCompletedMilestones((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const roadmapPhases = [
    {
      phase: 'Phase 1: CS Fundamentals & Language Depth',
      timeline: 'Weeks 1-2',
      focus: 'Data structures, algorithm complexity analysis, JavaScript / TypeScript strict typing.',
      icon: Layers,
    },
    {
      phase: 'Phase 2: Modern Full-Stack Frameworks',
      timeline: 'Weeks 3-4',
      focus: 'React state architecture, Node.js event-loop asynchronous programming, RESTful API design.',
      icon: Zap,
    },
    {
      phase: 'Phase 3: Database Optimization & System Design',
      timeline: 'Weeks 5-6',
      focus: 'Indexing strategies, Docker containerization, connection pooling, Redis caching.',
      icon: GitFork,
    },
    {
      phase: 'Phase 4: Capstone Engineering & ATS Resume Polish',
      timeline: 'Weeks 7-8',
      focus: 'Production deployments, quantifiable impact metrics, GitHub documentation.',
      icon: BookOpen,
    },
    {
      phase: 'Phase 5: Mock Interview Simulations & Campus Placement',
      timeline: 'Weeks 9-10',
      focus: 'Live DSA problem execution, behavioral STAR responses, technical HR rounds.',
      icon: Target,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Role Switcher */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-[#101e40] to-slate-900 border border-slate-800 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950 border border-cyan-800/60 text-cyan-300 text-xs font-semibold">
            <GitFork className="w-3.5 h-3.5" />
            <span>Curriculum & Competency Matrix</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Skill Gap & Learning Roadmap
          </h1>
          <p className="text-sm text-slate-300 max-w-xl">
            Compare your profile against recruiter requirements for top tech firms and follow an actionable milestone roadmap.
          </p>
        </div>

        {/* Role Selector */}
        <div className="space-y-1.5 shrink-0">
          <label className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
            Target Career Track:
          </label>
          <select
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className="w-full sm:w-64 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-semibold text-white focus:border-cyan-500 focus:outline-none transition-all cursor-pointer shadow-inner"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-[#0f1b3b] border border-slate-800">
          <Sparkles className="w-8 h-8 text-cyan-400 mx-auto animate-spin mb-3" />
          <p className="text-white font-semibold">Analyzing target role curriculum...</p>
        </div>
      ) : data ? (
        <>
          {/* Match Score & Gap Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-3xl bg-[#0f1b3b] border border-slate-800 p-6 flex flex-col justify-between shadow-lg">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Curriculum Competency Match
              </span>
              <div className="my-4 text-center">
                <span className="text-5xl font-extrabold text-cyan-400">
                  {data.matchPercentage}%
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  {data.acquiredCount} of {data.totalSkillsRequired} core skills acquired
                </p>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-cyan-400 h-full rounded-full"
                  style={{ width: `${data.matchPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Missing High-Priority Skills */}
            <div className="lg:col-span-2 rounded-3xl bg-[#0f1b3b] border border-slate-800 p-6 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <span className="text-amber-400">⚠️</span>
                  <span>Missing High-Priority Skills ({data.missingSkills.length})</span>
                </h3>
                <span className="text-xs text-slate-400">Recruiter must-haves</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {data.missingSkills.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs sm:text-sm">{item.skill}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                        {item.priority} Priority
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Acquired Skills Pills */}
          <div className="rounded-3xl bg-[#0f1b3b] border border-slate-800 p-6 space-y-3 shadow-lg">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Verified Acquired Competencies ({data.matchedSkills.length})</span>
            </h3>
            <div className="flex flex-wrap gap-2.5 pt-1">
              {data.matchedSkills.map((sk, idx) => (
                <div
                  key={idx}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-semibold flex items-center gap-2"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{sk.skill}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 5-Phase Structured Learning Roadmap */}
          <div className="rounded-3xl bg-[#0f1b3b] border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <Target className="w-4 h-4" />
                <span>Actionable Milestones</span>
              </div>
              <h2 className="text-xl font-extrabold text-white">
                5-Phase Placement Preparation Progression
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Step-by-step milestones to transition from student fundamentals to Tier-1 campus placement ready.
              </p>
            </div>

            <div className="space-y-4">
              {roadmapPhases.map((phase, idx) => {
                const isChecked = !!completedMilestones[idx];
                const Icon = phase.icon;
                return (
                  <div
                    key={idx}
                    className={`p-5 rounded-2xl border transition-all ${
                      isChecked
                        ? 'bg-emerald-950/20 border-emerald-700/50'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleMilestone(idx)}
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all mt-0.5 ${
                            isChecked
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-cyan-500'
                          }`}
                        >
                          {isChecked ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4
                              className={`font-bold text-sm sm:text-base ${
                                isChecked ? 'line-through text-slate-400' : 'text-white'
                              }`}
                            >
                              {phase.phase}
                            </h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              {phase.timeline}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">{phase.focus}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleMilestone(idx)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
                          isChecked
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                      >
                        {isChecked ? 'Completed' : 'Mark Done'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
