
import React, { useState, useMemo } from 'react';
import { Worker, Shift } from '../types';
import { optimizeSchedule } from '../services/gemini';
import { 
  BrainCircuit, Loader2, Zap, Target, 
  TrendingUp, BarChart3, Users, 
  ShieldCheck, ArrowRight, Gauge
} from 'lucide-react';

interface Props {
  workers: Worker[];
  shifts: Partial<Shift>[];
}

const ScheduleOptimizer: React.FC<Props> = ({ workers, shifts }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleOptimize = async () => {
    setLoading(true);
    try {
      const data = await optimizeSchedule(shifts, workers);
      setResult(data);
    } catch (e) {
      console.error(e);
      alert("AI optimization failed. Please check network connection.");
    } finally {
      setLoading(false);
    }
  };

  const currentProductivity = useMemo(() => {
    return Math.round(workers.reduce((acc, w) => acc + w.productivityScore, 0) / workers.length);
  }, [workers]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">AI Schedule Optimizer</h2>
          <p className="text-slate-500 text-sm font-medium">Maximizing OLFU Operational ROI through bio-metric productivity matching.</p>
        </div>
        <button
          onClick={handleOptimize}
          disabled={loading}
          className="flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl shadow-xl transition-all disabled:opacity-50 font-black text-xs uppercase tracking-widest active:scale-95"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} className="text-yellow-400" />}
          {loading ? 'Analyzing Productive Hours...' : 'Optimize Deployment'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Stats Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Gauge size={14} /> Productivity Baseline
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800">{currentProductivity}%</span>
              <span className="text-xs font-bold text-slate-400 uppercase">Current</span>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-black uppercase tracking-tight">
               <span className="text-slate-400">Projected Goal</span>
               <span className="text-green-600">+12% Gain</span>
            </div>
          </div>

          <div className="bg-indigo-700 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
             <div className="absolute -right-4 -top-4 opacity-10 rotate-12"><BrainCircuit size={100} /></div>
             <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-2">Optimization Rules</p>
             <ul className="space-y-3 relative z-10">
               <li className="flex items-start gap-2 text-[10px] font-bold">
                 <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1"></div>
                 Minimize Over-Fatigue Burnout
               </li>
               <li className="flex items-start gap-2 text-[10px] font-bold">
                 <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1"></div>
                 Maximize Role-Skill Match
               </li>
               <li className="flex items-start gap-2 text-[10px] font-bold">
                 <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1"></div>
                 Real-time Heat Response
               </li>
             </ul>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-3">
          {!result && !loading && (
            <div className="h-full min-h-[450px] flex flex-col items-center justify-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-400 p-12 text-center group">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center shadow-inner mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 size={40} className="opacity-20" />
              </div>
              <h4 className="text-slate-800 font-black uppercase text-sm tracking-widest mb-2">Awaiting Simulation</h4>
              <p className="text-xs max-w-sm font-medium text-slate-400 leading-relaxed italic">
                Launch the AI Optimizer to generate a productivity-first schedule. The engine will analyze individual performance scores against campus operational requirements.
              </p>
            </div>
          )}

          {loading && (
            <div className="h-full min-h-[450px] flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-12 text-center">
              <div className="relative mb-8">
                <div className="w-24 h-24 border-8 border-slate-100 border-t-green-600 rounded-full animate-spin"></div>
                <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-green-700" size={32} />
              </div>
              <p className="text-slate-800 font-black text-2xl uppercase tracking-tighter">Running Optimization Delta...</p>
              <p className="text-slate-400 text-xs mt-2 font-medium italic max-w-xs mx-auto">
                Comparing {workers.length} staff profiles against {shifts.length} operational zones for peak efficiency.
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-700 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:rotate-45 transition-transform"><TrendingUp size={120}/></div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-200 mb-2">Total Productivity Gain</p>
                  <p className="text-5xl font-black tracking-tighter">+{result.totalProductivityGain || 12.5}%</p>
                  <p className="text-[11px] font-bold mt-4 text-green-100 leading-relaxed italic border-l-2 border-green-400 pl-4">
                    "{result.improvementSummary}"
                  </p>
                </div>
                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl border border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Staff Utilization Strategy</p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Skill Matching</span>
                       <span className="text-xs font-black text-green-400">OPTIMAL</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-green-500 w-[94%]"></div>
                    </div>
                    <div className="flex items-center justify-between mt-6">
                       <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Fatigue Mitigation</span>
                       <span className="text-xs font-black text-blue-400">ACTIVE</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500 w-[88%]"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                {result.schedules.map((sched: any, idx: number) => (
                  <div key={idx} className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden hover:border-green-200 transition-colors">
                    <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex justify-between items-center">
                      <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight">{sched.shiftName}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-green-600 bg-green-50 px-4 py-1.5 rounded-full border border-green-100 uppercase tracking-widest">
                          {sched.projectedEfficiency || 88}% Efficiency Rating
                        </span>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {sched.assignments.map((assign: any, aIdx: number) => (
                        <div key={aIdx} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                          <div className="flex items-center gap-5">
                             <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 font-black text-lg uppercase">
                                {assign.workerName.charAt(0)}
                             </div>
                             <div>
                               <p className="font-black text-slate-900 text-base leading-none">{assign.workerName}</p>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                                 <Users size={12} className="text-indigo-500" /> {assign.role}
                               </p>
                             </div>
                          </div>
                          <div className="md:text-right flex-1 max-w-md bg-green-50/50 p-4 rounded-2xl border border-green-50">
                             <p className="text-[11px] text-green-800 leading-relaxed italic font-bold">
                               <ShieldCheck size={14} className="inline mr-2 text-green-600" />
                               AI Log: "{assign.reason}"
                             </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleOptimizer;
