import React from 'react';
import { SectionId } from '../types';
import { 
  LayoutDashboard, 
  Bot, 
  ClipboardCheck, 
  GitFork, 
  Briefcase, 
  FileSpreadsheet, 
  FileText, 
  Mic, 
  Code2, 
  UserSquare2
} from 'lucide-react';

interface SidebarProps {
  activeSection: SectionId;
  onNavigate: (section: SectionId) => void;
  activeApplicationsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onNavigate,
  activeApplicationsCount = 0,
}) => {
  const navItems = [
    {
      id: 'dashboard' as SectionId,
      label: 'Placement Cockpit',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'assistant' as SectionId,
      label: 'AI Career Mentor',
      icon: Bot,
      badge: 'AI',
    },
    {
      id: 'assessment' as SectionId,
      label: 'Readiness Diagnostic',
      icon: ClipboardCheck,
      badge: 'Test',
    },
    {
      id: 'skillgap' as SectionId,
      label: 'Skill Gap & Roadmap',
      icon: GitFork,
      badge: null,
    },
    {
      id: 'opportunities' as SectionId,
      label: 'Curated Opportunities',
      icon: Briefcase,
      badge: 'Hot',
    },
    {
      id: 'applications' as SectionId,
      label: 'Application Pipeline',
      icon: FileSpreadsheet,
      badge: activeApplicationsCount > 0 ? `${activeApplicationsCount}` : null,
    },
    {
      id: 'resume' as SectionId,
      label: 'ATS Resume Scanner',
      icon: FileText,
      badge: null,
    },
    {
      id: 'interview' as SectionId,
      label: 'AI Mock Interview',
      icon: Mic,
      badge: 'Prep',
    },
    {
      id: 'coding' as SectionId,
      label: 'DSA Coding Arena',
      icon: Code2,
      badge: null,
    },
    {
      id: 'profile' as SectionId,
      label: 'Placement Profile',
      icon: UserSquare2,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-[#0d1630] border-r border-slate-800/80 shrink-0 hidden md:flex flex-col justify-between p-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="space-y-6">
        {/* Navigation Group */}
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Career Preparation
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-cyan-400 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Placement Tip Box */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900/60 to-blue-950/40 border border-cyan-800/40 text-xs">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-1">
            <span className="text-sm">💡</span> Pro Placement Tip
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Candidates who complete 2 mock interviews and solve 5 DSA problems weekly increase their placement offer rate by 3.4x.
          </p>
        </div>
      </div>

      {/* Footer System Status */}
      <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          AI Engine Online
        </span>
        <span className="text-slate-400">v2.4 LTS</span>
      </div>
    </aside>
  );
};
