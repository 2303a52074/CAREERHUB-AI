import React from 'react';
import { SectionId, DashboardOverview } from '../types';
import { 
  GraduationCap, 
  Sparkles, 
  Flame, 
  Target, 
  User as UserIcon, 
  LogOut,
  Bell
} from 'lucide-react';

interface NavbarProps {
  overview: DashboardOverview | null;
  activeSection: SectionId;
  onNavigate: (section: SectionId) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  overview,
  activeSection,
  onNavigate,
  onLogout
}) => {
  const readiness = overview?.readinessScore ?? 85;
  const candidateName = overview?.candidate?.name || 'Candidate';
  const targetRole = overview?.candidate?.targetRole || 'Full Stack Developer';

  return (
    <header className="h-16 bg-[#0f1b3b]/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                CareerHub <span className="text-cyan-400">AI</span>
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                Placement Cockpit
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              AI Placement & Career Intelligence
            </p>
          </div>
        </button>
      </div>

      {/* Center Target Role Pill */}
      <div className="hidden lg:flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-full px-4 py-1.5 text-xs text-slate-300 shadow-inner">
        <Target className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-slate-400">Target Role:</span>
        <span className="font-semibold text-white">{targetRole}</span>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Streak Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs font-semibold">
          <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
          <span>7-Day Streak</span>
        </div>

        {/* Readiness Badge */}
        <div 
          onClick={() => onNavigate('assessment')}
          className="cursor-pointer flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border border-emerald-500/30 hover:border-emerald-400/50 transition-all text-xs"
          title="Click to retake Readiness Diagnostic"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <div className="flex flex-col text-right sm:text-left">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider leading-none">Readiness</span>
            <span className="font-bold text-emerald-300 leading-tight">{readiness}% Ready</span>
          </div>
        </div>

        {/* Profile Button */}
        <button
          onClick={() => onNavigate('profile')}
          className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-200 transition-all"
        >
          <div className="w-7 h-7 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/50 flex items-center justify-center font-bold text-xs">
            {candidateName.charAt(0)}
          </div>
          <span className="hidden sm:inline text-xs font-medium text-slate-200 truncate max-w-[100px]">
            {candidateName}
          </span>
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          title="Reset session / logout"
          className="p-2 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 transition-all"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
