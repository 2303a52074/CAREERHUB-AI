import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DiagnosticQuestion, DiagnosticResult } from '../types';
import confetti from 'canvas-confetti';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  Award, 
  Sparkles, 
  BrainCircuit, 
  AlertTriangle 
} from 'lucide-react';

interface AssessmentViewProps {
  onAssessmentCompleted?: (score: number) => void;
}

export const AssessmentView: React.FC<AssessmentViewProps> = ({ onAssessmentCompleted }) => {
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAssessmentQuestions();
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      }
    } catch (err: any) {
      console.warn('Failed to load questions from server:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionIndex,
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    // Format answers array: array of selected option indices (0-3)
    const answersArray = questions.map((_, idx) => {
      return selectedAnswers[idx] !== undefined ? selectedAnswers[idx] : -1;
    });

    try {
      const res = await api.submitAssessment(answersArray, 'Full Stack Developer');
      setResult(res);
      if (onAssessmentCompleted) {
        onAssessmentCompleted(res.overallReadiness);
      }
      // Confetti burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to submit diagnostic assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setCurrentIndex(0);
    setResult(null);
  };

  if (loading) {
    return (
      <div className="p-12 text-center rounded-3xl bg-[#0f1b3b] border border-slate-800 space-y-4">
        <BrainCircuit className="w-10 h-10 text-cyan-400 mx-auto animate-spin" />
        <p className="text-white font-semibold">Generating Placement Diagnostic Assessment...</p>
        <p className="text-xs text-slate-400">Loading multi-disciplinary question bank</p>
      </div>
    );
  }

  // RESULT VIEW
  if (result) {
    const scores = result.scores || { aptitude: 80, technical: 80, problemSolving: 80, communication: 80, roleSpecific: 80 };
    return (
      <div className="space-y-6">
        {/* Results Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-[#101f42] via-slate-900 to-[#101f42] border border-slate-800 p-6 sm:p-8 relative overflow-hidden shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-700/50 text-emerald-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Diagnostic Assessment Complete</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Readiness Evaluation Report
              </h1>
              <p className="text-sm text-slate-300 max-w-xl">
                Here is your multidimensional evaluation across Quantitative Aptitude, Technical Fundamentals, Problem Solving, and Communication.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shrink-0">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Score</span>
              <span className="text-4xl sm:text-5xl font-extrabold text-cyan-400 my-1">
                {result.overallReadiness}%
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                {result.overallReadiness >= 80 ? 'Placement Ready' : 'In Preparation'}
              </span>
            </div>
          </div>
        </div>

        {/* 5-Pillar Score Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-[#0f1b3b] border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block mb-1">Aptitude</span>
            <span className="text-2xl font-bold text-white">{scores.aptitude}%</span>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${scores.aptitude}%` }}></div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0f1b3b] border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block mb-1">Technical CS</span>
            <span className="text-2xl font-bold text-white">{scores.technical}%</span>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-blue-400 h-full rounded-full" style={{ width: `${scores.technical}%` }}></div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0f1b3b] border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block mb-1">Problem Solving</span>
            <span className="text-2xl font-bold text-white">{scores.problemSolving}%</span>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-purple-400 h-full rounded-full" style={{ width: `${scores.problemSolving}%` }}></div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0f1b3b] border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block mb-1">Communication</span>
            <span className="text-2xl font-bold text-white">{scores.communication}%</span>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${scores.communication}%` }}></div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0f1b3b] border border-slate-800 text-center col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-400 block mb-1">Role-Specific</span>
            <span className="text-2xl font-bold text-white">{scores.roleSpecific}%</span>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-amber-400 h-full rounded-full" style={{ width: `${scores.roleSpecific}%` }}></div>
            </div>
          </div>
        </div>

        {/* Strengths & Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-[#0f1b3b] border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" />
              <span>Verified Strengths</span>
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              {result.strengths.map((str, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 rounded-3xl bg-[#0f1b3b] border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span>Recommended Role Alignments</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {result.suitableRoles.map((role, i) => (
                <span key={i} className="px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-800 text-cyan-300 text-xs font-semibold">
                  {role}
                </span>
              ))}
            </div>

            <h4 className="font-bold text-white text-sm pt-2">Recommended Focus Skills:</h4>
            <div className="flex flex-wrap gap-2">
              {result.recommendedSkills.map((sk, i) => (
                <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs">
                  {sk}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Question Review Accordion/List */}
        <div className="p-6 rounded-3xl bg-[#0f1b3b] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">Question-by-Question Audit</h3>
            <button
              onClick={handleRetake}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-2 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Diagnostic</span>
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {result.breakdown.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border text-xs sm:text-sm space-y-2 ${
                  item.isCorrect
                    ? 'bg-emerald-950/20 border-emerald-800/40'
                    : 'bg-rose-950/20 border-rose-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold text-white flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{item.question}</span>
                  </div>
                  {item.isCorrect ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-bold shrink-0">
                      Correct
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[11px] font-bold shrink-0">
                      Incorrect
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-300 pl-7 space-y-1">
                  <div>
                    <span className="text-slate-400">Your Answer: </span>
                    <span className={item.isCorrect ? 'text-emerald-300 font-medium' : 'text-rose-300 font-medium'}>
                      {item.userAnswer}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Explanation: </span>
                    <span className="text-slate-200">{item.explanation}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE QUESTION VIEW
  const currentQ = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const isSelected = (idx: number) => selectedAnswers[currentIndex] === idx;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header with progress */}
      <div className="rounded-3xl bg-[#0f1b3b] border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ClipboardCheck className="w-5 h-5 text-cyan-400" />
              <h2 className="font-extrabold text-white text-lg sm:text-xl">
                Placement Readiness Diagnostic
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Evaluates quantitative aptitude, computer science fundamentals, and role competencies
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Progress:</span>
            <span className="text-sm font-bold text-cyan-400">
              {answeredCount} of {totalQuestions} answered
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
          ></div>
        </div>

        {/* Question Selector Numbers */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto pt-1 no-scrollbar">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-8 h-8 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center justify-center ${
                currentIndex === i
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 font-extrabold'
                  : selectedAnswers[i] !== undefined
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Question Card */}
      {currentQ && (
        <div className="rounded-3xl bg-[#0f1b3b] border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800">
              Category: {currentQ.category}
            </span>
            <span className="text-xs text-slate-400">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
            {currentQ.question}
          </h3>

          {/* Options Grid */}
          <div className="space-y-3">
            {currentQ.options.map((opt, optIdx) => {
              const optionLetters = ['A', 'B', 'C', 'D'];
              const active = isSelected(optIdx);
              return (
                <div
                  key={optIdx}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                    active
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-500/10'
                      : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                      active
                        ? 'bg-cyan-400 text-slate-950 font-extrabold'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {optionLetters[optIdx]}
                  </div>
                  <span className="text-sm font-medium">{opt}</span>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {currentIndex === totalQuestions - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <BrainCircuit className="w-4 h-4 animate-spin" />
                    <span>Evaluating Answers...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Assessment</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-cyan-500/25 transition-all flex items-center gap-2"
              >
                <span>Next Question</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
