
import React, { useState, useEffect, useMemo } from 'react';
import { Worker, SafetyChecklist, Shift, UserRole, ShiftReport } from '../types';
import { api } from '../api';
import { 
  ClipboardCheck, ShieldCheck, UserCheck, AlertTriangle, 
  Briefcase, FileSignature, CheckCircle2, XCircle, 
  BrainCircuit, ArrowRight, RotateCcw, MapPin, 
  FileSearch, Activity, Calendar, History, TrendingUp, Search,
  Sparkles, Loader2, Clock, Map, ClipboardList, Download, Printer, X, Database, Trash2, RefreshCw
} from 'lucide-react';
import Logo from './Logo';

interface Props {
  workers: Worker[];
  onUpdateWorkers: (workers: Worker[]) => void;
  shifts: Partial<Shift>[];
  userRole: UserRole;
  reports: ShiftReport[];
}

const OLFU_LOCATIONS = [
  "RISE Tower (Headquarters)",
  "Carlo Acutis Building",
  "College of Medicine Building",
  "St. Martin de Porres Building",
  "Fatima University Medical Center (FUMC)",
  "Dambana Area (National Shrine)",
  "OLFU Galleria/CCJ Building",
  "Tamaraw Hills Campus (SBB Building)"
];

const formatTo12Hr = (time24: string) => {
  if (!time24) return "";
  const [hours, minutes] = time24.split(':');
  let h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h.toString().padStart(2, '0')}:${minutes} ${ampm}`;
};

const WorkforceDeployment: React.FC<Props> = ({ workers, onUpdateWorkers, shifts, userRole, reports }) => {
  const [activeView, setActiveView] = useState<'SafetyOfficer' | 'Supervisor' | 'Archives'>(
    userRole === 'Supervisor' ? 'Supervisor' : 'SafetyOfficer'
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [viewingReport, setViewingReport] = useState<ShiftReport | null>(null);
  const [deploymentInputs, setDeploymentInputs] = useState<Record<string, { location: string, startTime: string, endTime: string }>>({});
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date().toLocaleTimeString());
  
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    ppeCheck: false,
    healthCheck: false,
    siteInduction: false,
    equipmentSafety: false
  });

  useEffect(() => {
    if (userRole === 'Supervisor') setActiveView('Supervisor');
    else if (userRole === 'SafetyOfficer') setActiveView('SafetyOfficer');
  }, [userRole]);

  useEffect(() => {
    const initialInputs: Record<string, { location: string, startTime: string, endTime: string }> = {};
    workers.filter(w => w.safetyStatus === 'Cleared').forEach(w => {
      initialInputs[w.id] = { location: OLFU_LOCATIONS[0], startTime: "08:00", endTime: "17:00" };
    });
    setDeploymentInputs(prev => {
        const next = { ...initialInputs };
        Object.keys(prev).forEach(key => {
            if (prev[key]) next[key] = prev[key];
        });
        return next;
    });
  }, [workers]);

  const filteredReports = useMemo(() => reports.filter(r => 
    r.workerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.workerRole || "").toLowerCase().includes(searchTerm.toLowerCase())
  ), [reports, searchTerm]);

  const archiveStats = useMemo(() => ({
    total: reports.length,
    locations: new Set(reports.map(r => r.location)).size,
    avgHr: reports.length ? Math.round(reports.reduce((acc, r) => acc + r.finalVitals.hr, 0) / reports.length) : 0
  }), [reports]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    // Force a small delay for visual feedback
    setTimeout(() => {
      window.dispatchEvent(new Event('storage'));
      setLastSynced(new Date().toLocaleTimeString());
      setIsRefreshing(false);
    }, 800);
  };

  const handleDeleteReport = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this database record?")) {
      await api.deleteReport(id);
      window.dispatchEvent(new Event('storage')); 
    }
  };

  const handleOpenChecklist = (worker: Worker) => {
    setSelectedWorker(worker);
    setChecklist({ ppeCheck: false, healthCheck: false, siteInduction: false, equipmentSafety: false });
  };

  const submitSafetyDecision = (status: 'Cleared' | 'Rejected') => {
    if (!selectedWorker) return;
    onUpdateWorkers(workers.map(w => w.id === selectedWorker.id ? { ...w, safetyStatus: status } : w));
    setSelectedWorker(null);
  };

  const updateDeploymentInput = (workerId: string, field: 'location' | 'startTime' | 'endTime', value: string) => {
    setDeploymentInputs(prev => ({ ...prev, [workerId]: { ...(prev[workerId] || { location: OLFU_LOCATIONS[0], startTime: '08:00', endTime: '17:00' }), [field]: value } }));
  };

  const handleDeploy = (workerId: string) => {
    const input = deploymentInputs[workerId];
    if (!input) return;
    const formattedTime = `${formatTo12Hr(input.startTime)} - ${formatTo12Hr(input.endTime)}`;
    onUpdateWorkers(workers.map(w => w.id === workerId ? { 
      ...w, safetyStatus: 'Deployed', status: 'Active', currentLocation: input.location, assignedTime: formattedTime 
    } as Worker : w));
  };

  const handleRecall = (workerId: string) => {
    onUpdateWorkers(workers.map(w => w.id === workerId ? { 
      ...w, safetyStatus: 'Cleared', status: 'Active', currentLocation: 'RISE Tower (Headquarters)', assignedTime: undefined 
    } as Worker : w));
  };

  const renderSafetyOfficerView = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-start gap-3">
        <ClipboardCheck className="text-green-600 mt-1" />
        <div>
          <h3 className="font-bold text-green-800">Safety Officer Dashboard</h3>
          <p className="text-sm text-green-600">Review and clear staff based on bio-metric readiness.</p>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700">Worker</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Health Status</th>
              <th className="px-6 py-4 font-semibold text-slate-700 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {workers.filter(w => w.safetyStatus === 'Pending' || w.safetyStatus === 'Rejected').map(worker => (
              <tr key={worker.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-bold text-slate-900">{worker.name}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${worker.fatigueLevel > 30 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                    Fatigue: {worker.fatigueLevel}%
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleOpenChecklist(worker)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase shadow-sm hover:bg-green-700">Verify</button>
                </td>
              </tr>
            ))}
            {workers.filter(w => w.safetyStatus === 'Pending' || w.safetyStatus === 'Rejected').length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-medium italic">No personnel awaiting clearance.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSupervisorView = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 shadow-inner flex flex-col h-[650px] overflow-hidden">
          <div className="p-8 bg-white/90 backdrop-blur-sm border-b border-slate-100 flex justify-between items-center">
            <div>
              <h4 className="font-black text-slate-800 uppercase tracking-tight text-lg">Ready Personnel</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Cleared for Deployment</p>
            </div>
            <span className="bg-green-600 text-white px-4 py-1.5 rounded-full text-xs font-black shadow-lg shadow-green-900/10">
              {workers.filter(w => w.safetyStatus === 'Cleared').length} Staff
            </span>
          </div>
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {workers.filter(w => w.safetyStatus === 'Cleared').map(worker => (
              <div key={worker.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start border-b border-slate-50 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center font-black text-sm border border-green-100">
                      {worker.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 leading-none">{worker.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{worker.role}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Deployment Zone</label>
                    <select 
                      className="w-full bg-white text-xs font-bold border-2 border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/5 transition-all appearance-none cursor-pointer shadow-sm text-slate-700" 
                      value={deploymentInputs[worker.id]?.location || OLFU_LOCATIONS[0]} 
                      onChange={(e) => updateDeploymentInput(worker.id, 'location', e.target.value)}
                    >
                      {OLFU_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Duty Start</label>
                      <input 
                        type="time" 
                        className="w-full bg-white text-xs font-bold border-2 border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/5 transition-all shadow-sm text-slate-700"
                        value={deploymentInputs[worker.id]?.startTime || "08:00"}
                        onChange={(e) => updateDeploymentInput(worker.id, 'startTime', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Duty End</label>
                      <input 
                        type="time" 
                        className="w-full bg-white text-xs font-bold border-2 border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/5 transition-all shadow-sm text-slate-700"
                        value={deploymentInputs[worker.id]?.endTime || "17:00"}
                        onChange={(e) => updateDeploymentInput(worker.id, 'endTime', e.target.value)}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeploy(worker.id)} 
                    className="w-full bg-green-700 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-green-900/10 hover:bg-green-800 transition-all active:scale-95"
                  >
                    Confirm Deployment
                  </button>
                </div>
              </div>
            ))}
            {workers.filter(w => w.safetyStatus === 'Cleared').length === 0 && (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                    <UserCheck className="text-slate-400" size={32} />
                  </div>
                  <p className="text-slate-400 text-sm font-medium italic">No personnel ready for deployment.</p>
                </div>
            )}
          </div>
        </div>

        <div className="bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 shadow-inner flex flex-col h-[650px] overflow-hidden">
          <div className="p-8 bg-white/80 backdrop-blur-sm border-b border-slate-100 flex justify-between items-center">
            <div>
              <h4 className="font-black text-slate-800 uppercase tracking-tight text-lg">Active Sites</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Live Campus Operations</p>
            </div>
            <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-black shadow-lg shadow-blue-900/10">
              {workers.filter(w => w.safetyStatus === 'Deployed').length} Active
            </span>
          </div>
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {workers.filter(w => w.safetyStatus === 'Deployed').map(worker => (
              <div key={worker.id} className="bg-white p-6 rounded-[2rem] border-2 border-blue-50 shadow-sm flex justify-between items-center hover:border-blue-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl border border-blue-100">
                    {worker.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 leading-none">{worker.name}</p>
                    <div className="mt-2 flex flex-col gap-1">
                      <p className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1.5">
                        <MapPin size={10} /> {worker.currentLocation}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase">
                        <Clock size={10} /> {worker.assignedTime}
                      </p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleRecall(worker.id)} 
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm"
                >
                  Recall
                </button>
              </div>
            ))}
            {workers.filter(w => w.safetyStatus === 'Deployed').length === 0 && (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                    <Activity className="text-slate-400" size={32} />
                  </div>
                  <p className="text-slate-400 text-sm font-medium italic">No active campus deployments.</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderArchivesView = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Database size={20}/></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Database Volume</p>
            <p className="text-xl font-black text-slate-800">{archiveStats.total} Records</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl"><Map size={20}/></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Campus Coverage</p>
            <p className="text-xl font-black text-slate-800">{archiveStats.locations} Zones</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><Activity size={20}/></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Pulse Rate</p>
            <p className="text-xl font-black text-slate-800">{archiveStats.avgHr} BPM</p>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-100 p-6 rounded-[2rem] shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 text-white rounded-2xl">
            <History size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 leading-none">Shift Report Archives</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Synchronized Local Instance • Last Updated: {lastSynced}
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Filter archives..." 
              className="bg-slate-50 border-2 border-slate-100 rounded-xl pl-11 pr-4 py-3 text-sm outline-none w-full md:w-80 focus:ring-4 focus:ring-green-500/10 focus:border-green-500/50 transition-all font-bold text-slate-700 placeholder-slate-300" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <button 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50"
            title="Force Database Sync"
          >
            <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest">Report ID</th>
              <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest">Personnel</th>
              <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest">Date / Time</th>
              <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest">Location</th>
              <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest">Vitals</th>
              <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredReports.map((report) => (
              <tr key={report.id} className="hover:bg-slate-50 group transition-colors">
                <td className="px-6 py-4 font-mono font-bold text-slate-400">#{report.id.includes('-') ? report.id.split('-')[1].substring(0, 8) : report.id}</td>
                <td className="px-6 py-4 font-black text-slate-800">
                  {report.workerName}
                  <span className="block text-[9px] text-indigo-500 uppercase tracking-widest font-bold mt-0.5">{report.workerRole || 'Personnel'}</span>
                </td>
                <td className="px-6 py-4 text-slate-500 font-medium">{report.date}<br/>{report.time}</td>
                <td className="px-6 py-4 font-bold text-slate-600">{report.location}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100 font-black">{report.finalVitals.hr} HR</span>
                    <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded border border-orange-100 font-black">{report.finalVitals.temp}°C</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setViewingReport(report)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100 shadow-sm"><FileSearch size={16}/></button>
                    <button onClick={() => handleDeleteReport(report.id)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100 shadow-sm"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredReports.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic font-medium">
                  {isRefreshing ? 'Polling OLFU Database...' : 'No historical records found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
           <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Operational Force Dashboard</h2>
           <p className="text-slate-500 text-sm font-medium italic">OLFU Valenzuela Campus • Relational Database View</p>
        </div>
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-1.5 flex gap-1.5 shadow-sm">
          {userRole !== 'Staff' && (
            <>
              {(userRole === 'Admin' || userRole === 'SafetyOfficer') && (
                <button onClick={() => setActiveView('SafetyOfficer')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'SafetyOfficer' ? 'bg-green-100 text-green-700 border border-green-200 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}>Clearance</button>
              )}
              {(userRole === 'Admin' || userRole === 'Supervisor') && (
                <>
                  <button onClick={() => setActiveView('Supervisor')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'Supervisor' ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}>Deployment</button>
                  <button onClick={() => setActiveView('Archives')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'Archives' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}>Database Archives</button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {activeView === 'SafetyOfficer' && renderSafetyOfficerView()}
      {activeView === 'Supervisor' && renderSupervisorView()}
      {activeView === 'Archives' && renderArchivesView()}

      {selectedWorker && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="bg-green-700 p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black uppercase tracking-widest flex items-center gap-3 text-lg"><FileSignature size={24}/> Clearance Review</h3>
                <p className="text-green-200 text-[10px] font-black uppercase tracking-widest mt-1">OLFU Safety Protocol Verification</p>
              </div>
              <button onClick={() => setSelectedWorker(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={24}/></button>
            </div>
            <div className="p-8 space-y-4">
              <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 rounded-xl bg-green-100 text-green-700 flex items-center justify-center font-black text-xl border border-green-200">
                  {selectedWorker.name.charAt(0)}
                </div>
                <div>
                  <p className="font-black text-slate-800 uppercase tracking-tight">{selectedWorker.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedWorker.role}</p>
                </div>
              </div>
              {Object.keys(checklist).map((key) => (
                <label key={key} className={`flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${checklist[key] ? 'border-green-500 bg-green-50' : 'border-slate-100 hover:bg-slate-50'}`}>
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-green-700 rounded border-slate-300 focus:ring-green-500" 
                    checked={checklist[key]} 
                    onChange={e => setChecklist(prev => ({...prev, [key]: e.target.checked}))} 
                  />
                  <span className={`text-[11px] font-black uppercase tracking-widest ${checklist[key] ? 'text-green-700' : 'text-slate-500'}`}>{key.replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}
            </div>
            <div className="p-8 bg-slate-50 border-t flex gap-4">
              <button onClick={() => submitSafetyDecision('Rejected')} className="flex-1 bg-white border-2 border-red-100 text-red-600 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-red-50 transition-colors">Reject</button>
              <button 
                onClick={() => submitSafetyDecision('Cleared')} 
                disabled={!Object.values(checklist).every(v => v)} 
                className="flex-[2] bg-green-700 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest disabled:opacity-50 transition-all shadow-xl shadow-green-900/20 active:scale-95"
              >
                Approve & Clear Personnel
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingReport && (
        <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-lg animate-fade-in">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
              <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                 <div>
                    <h3 className="font-black uppercase tracking-widest text-lg">Historical Record Data</h3>
                    <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase mt-1">OLFU SafetyNet Core Record</p>
                 </div>
                 <button onClick={() => setViewingReport(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={28} /></button>
              </div>
              <div className="p-10 space-y-8 overflow-y-auto">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-100 shadow-inner">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Personnel Profile</p>
                       <p className="text-2xl font-black text-slate-800 tracking-tighter">{viewingReport.workerName}</p>
                       <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 inline-block mt-2">{viewingReport.workerRole || 'Personnel'}</p>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-100 shadow-inner">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Telemetry Log</p>
                       <div className="space-y-2">
                          <p className="text-sm font-black text-slate-800 flex items-center gap-2"><Activity size={14} className="text-green-600"/> {viewingReport.finalVitals.hr} BPM</p>
                          <p className="text-sm font-black text-slate-800 flex items-center gap-2"><TrendingUp size={14} className="text-orange-600"/> {viewingReport.finalVitals.temp}°C Thermal</p>
                       </div>
                       <p className="text-[10px] text-slate-400 mt-6 font-bold uppercase tracking-widest border-t border-slate-200 pt-3">{viewingReport.date} @ {viewingReport.time}</p>
                    </div>
                 </div>
                 {viewingReport.completionPhoto && (
                   <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Work Evidence Capture</p>
                      <img src={viewingReport.completionPhoto} className="w-full h-80 object-cover rounded-[2rem] border-4 border-white shadow-2xl" alt="Evidence" />
                   </div>
                 )}
                 {viewingReport.aiSummary && (
                    <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                       <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Sparkles size={14} /> Performance AI Summary</p>
                       <p className="text-slate-700 text-sm leading-relaxed italic">"{viewingReport.aiSummary}"</p>
                    </div>
                 )}
              </div>
              <div className="p-8 bg-slate-50 border-t flex gap-4">
                 <button onClick={() => setViewingReport(null)} className="flex-1 py-5 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-white rounded-2xl transition-all">Close Terminal</button>
                 <button onClick={() => window.print()} className="flex-[2] bg-slate-900 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-slate-400 active:scale-95"><Printer size={20} /> Print Physical Record</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default WorkforceDeployment;
