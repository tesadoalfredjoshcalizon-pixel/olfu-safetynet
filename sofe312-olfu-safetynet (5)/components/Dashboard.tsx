
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Legend, AreaChart, Area } from 'recharts';
import { Worker, Incident, User } from '../types';
import { AlertTriangle, TrendingUp, Users, Activity, Calendar, ShieldCheck, Zap } from 'lucide-react';

interface DashboardProps {
  workers: Worker[];
  incidents: Incident[];
  user: User;
  setView: (view: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ workers, incidents, user, setView }) => {
  
  const stats = useMemo(() => {
    const avgProd = workers.length > 0 ? workers.reduce((acc, w) => acc + w.productivityScore, 0) / workers.length : 0;
    const avgFatigue = workers.length > 0 ? workers.reduce((acc, w) => acc + w.fatigueLevel, 0) / workers.length : 0;
    const openRisks = incidents.filter(i => i.severity === 'High' || i.severity === 'Critical').length;
    const deployedCount = workers.filter(w => w.safetyStatus === 'Deployed').length;
    
    return {
      avgProd: Math.round(avgProd),
      avgFatigue: Math.round(avgFatigue),
      openRisks,
      totalWorkers: workers.length,
      deployedCount
    };
  }, [workers, incidents]);

  const productivityGapData = useMemo(() => {
    return [
      { name: 'Potential', efficiency: 100, color: '#f1f5f9' },
      { name: 'Current', efficiency: stats.avgProd, color: '#16a34a' },
      { name: 'Risk Loss', efficiency: Math.max(0, 100 - stats.avgProd - (stats.avgFatigue * 0.2)), color: '#ef4444' }
    ];
  }, [stats]);

  const weeklyPerformanceData = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const isToday = i === 0;
      data.push({
        date: dateLabel,
        productivity: isToday ? stats.avgProd : 0,
        fatigue: isToday ? stats.avgFatigue : 0,
      });
    }
    return data;
  }, [stats]);

  const productivityVsFatigue = useMemo(() => {
    return workers.map(w => ({
      name: w.name,
      productivity: w.productivityScore,
      fatigue: w.fatigueLevel,
      score: (w.productivityScore - (w.fatigueLevel * 0.5)).toFixed(1)
    }));
  }, [workers]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Operational Command Center</h2>
          <p className="text-slate-500 text-sm font-medium">OLFU Valenzuela Campus • Strategic Workforce Intelligence</p>
        </div>
        <div className="text-[10px] bg-green-700 text-white px-4 py-2 rounded-xl font-black flex items-center gap-2 shadow-lg shadow-green-900/10 tracking-widest uppercase">
          <Activity size={14} className="animate-pulse" /> LIVE TELEMETRY
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-green-50 rounded-2xl text-green-700">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Efficiency</p>
            <p className="text-2xl font-black text-slate-800">{stats.avgProd}%</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-green-100/30 rounded-2xl text-green-700">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avg Fatigue</p>
            <p className={`text-2xl font-black ${stats.avgFatigue > 40 ? 'text-orange-600' : 'text-green-700'}`}>
              {stats.avgFatigue}%
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-red-50 rounded-2xl text-red-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">High Risks</p>
            <p className="text-2xl font-black text-slate-800">{stats.openRisks}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-green-700 text-white rounded-2xl shadow-lg shadow-green-700/20">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Deployed</p>
            <p className="text-2xl font-black text-slate-800">{stats.deployedCount}/{stats.totalWorkers}</p>
          </div>
        </div>
      </div>

      {/* Analytics Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter">
              <Zap size={22} className="text-green-700"/> Productivity Optimization Gap
            </h3>
            <span className="text-[9px] uppercase font-black text-slate-400 tracking-[0.2em]">Efficiency Analysis</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyPerformanceData}>
                <defs>
                  <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" style={{ fontSize: '10px', fontWeight: 800, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis style={{ fontSize: '10px', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="productivity" stroke="#16a34a" fillOpacity={1} fill="url(#colorProd)" name="Productivity Score" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase">Optimization Delta</p>
                <p className="text-xl font-black text-green-700">+{Math.round((100 - stats.avgProd) * 0.4)}%</p>
                <p className="text-[8px] text-slate-400 italic">Projected gain from AI scheduling</p>
             </div>
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase">Fatigue Friction</p>
                <p className="text-xl font-black text-red-500">-{Math.round(stats.avgFatigue * 0.15)}%</p>
                <p className="text-[8px] text-slate-400 italic">Loss due to bio-metric strain</p>
             </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter">
              <ShieldCheck size={22} className="text-green-700"/> Safety-Output Heatmap
            </h3>
            <span className="text-[9px] uppercase font-black text-slate-400 tracking-[0.2em]">Bio-Metric Heatmap</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" dataKey="fatigue" name="Fatigue" unit="%" label={{ value: 'Fatigue', position: 'bottom', fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                <YAxis type="number" dataKey="productivity" name="Productivity" unit="%" label={{ value: 'Efficiency', angle: -90, position: 'left', fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                <ZAxis type="number" range={[150, 600]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Workers" data={productivityVsFatigue} fill="#16a34a" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-green-50 p-4 rounded-2xl mt-4 border border-green-100 text-center">
             <p className="text-[10px] text-green-700 font-black uppercase tracking-widest">
               High Efficiency Zone Detected
             </p>
             <p className="text-[9px] text-green-600/70 font-bold italic mt-1">
               Personnel in the upper left quadrant show optimal readiness.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
