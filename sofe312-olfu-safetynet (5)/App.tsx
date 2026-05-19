
import React, { useState, useEffect, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import Dashboard from './components/Dashboard';
import IncidentAnalysis from './components/IncidentAnalysis';
import SafetyMonitoring from './components/SafetyMonitoring';
import WorkforceDeployment from './components/WorkforceDeployment';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import TechnicianPortal from './components/TechnicianPortal';
import ScheduleOptimizer from './components/ScheduleOptimizer';
import Logo from './components/Logo';
import { api } from './api';
import { mockShifts, mockUsers } from './mockData';
import { auth, db } from './src/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User, UserRole, Worker, Shift, ShiftReport, Incident } from './types';
import { 
  LayoutDashboard, Users, ShieldAlert, FileWarning, 
  Menu, LogOut, HardHat, Activity, ClipboardCheck, 
  UserCog, Wifi, WifiOff, Battery, ShieldCheck, Zap,
  AlertOctagon, RefreshCcw, Home
} from 'lucide-react';

// --- Error Boundary Component ---
interface EBProps { children?: ReactNode; }
interface EBState { hasError: boolean; error: Error | null; }

/**
 * GlobalErrorBoundary handles top-level React errors to prevent app crashes.
 * Fix: Explicitly use React.Component to ensure generic props are recognized by the TS compiler
 * and remove the redundant state property declaration that could shadow the base class.
 */
class GlobalErrorBoundary extends React.Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("OLFU SafetyNet Kernel Panic:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-[2.5rem] p-10 shadow-2xl shadow-red-950/20 text-center animate-fade-in">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <AlertOctagon size={40} className="text-red-500" />
            </div>
            <h1 className="text-white font-black text-2xl uppercase tracking-tighter mb-2">System Diagnostic Alert</h1>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              An unexpected kernel error occurred. This is usually caused by corrupted local browser storage or an API handshake failure.
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-white text-slate-900 font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase text-xs tracking-widest hover:bg-slate-100 transition-all"
              >
                <RefreshCcw size={18} /> Hot Reload System
              </button>
              <button 
                onClick={() => { localStorage.clear(); window.location.href = '/'; }}
                className="w-full bg-red-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase text-xs tracking-widest hover:bg-red-700 transition-all"
              >
                <RefreshCcw size={18} /> Clear Cache & Reset
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

type View = 'dashboard' | 'monitoring' | 'deployment' | 'incidents' | 'users' | 'portal' | 'optimizer';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [globalWorkers, setGlobalWorkers] = useState<Worker[]>([]);
  const [globalUsers, setGlobalUsers] = useState<User[]>(mockUsers);
  const [shiftReports, setShiftReports] = useState<ShiftReport[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const userRef = React.useRef<User | null>(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const syncDatabase = useCallback(async (activeUserOverride?: User | null) => {
    const activeUser = activeUserOverride !== undefined ? activeUserOverride : userRef.current;
    try {
      const [usersData, workersData, reportsData, incidentsData] = await Promise.all([
        api.getUsers(),
        api.getWorkers(),
        api.getReports(),
        api.getIncidents()
      ]);
      // Merge mock users with DB users to ensure default admins are always accessible
      const mergedUsers = [...(usersData || [])];
      mockUsers.forEach(mu => {
        if (!mergedUsers.find(u => u.username.toLowerCase() === mu.username.toLowerCase())) {
          mergedUsers.push(mu);
        }
      });
      setGlobalUsers(mergedUsers);
      setGlobalWorkers(workersData && workersData.length > 0 ? workersData : []);
      setShiftReports(reportsData || []);
      setIncidents(incidentsData || []);

      // Bootstrap and maintenance - only if we have an Admin user (activeUser)
      if (activeUser?.role === 'Admin') {
        // Bootstrap users if Firestore is empty or missing admin
        const dbIsEmpty = !usersData || usersData.length === 0;
        if (dbIsEmpty) {
          console.log("Bootstrapping mock users to Firestore...");
          for (const u of mockUsers) {
            await api.createUser(u).catch(e => console.error("Bootstrap user failed:", u.username, e));
          }
          const updatedUsers = await api.getUsers();
          if (updatedUsers.length > 0) {
             const finalMerged = [...updatedUsers];
             mockUsers.forEach(mu => {
                if (!finalMerged.find(u => u.username.toLowerCase() === mu.username.toLowerCase())) {
                  finalMerged.push(mu);
                }
              });
             setGlobalUsers(finalMerged);
          }
        }

        // Ensure admin2 exists for user testing
        const admin2Exists = (usersData || []).some(u => u.username === 'admin2');
        if (!admin2Exists && usersData && usersData.length > 0) {
          await api.createUser({
            id: 'u-admin2',
            username: 'admin2',
            name: 'Secondary Admin Account',
            role: 'Admin'
          }).catch(e => console.error("Admin2 bootstrap failed:", e));
          const updatedUsers = await api.getUsers();
          setGlobalUsers(updatedUsers);
        }
      }
    } catch (err) {
      console.error("Database sync sequence failed:", err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        // Try to fetch the user profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', fUser.uid));
          let finalUser: User;
          if (userDoc.exists()) {
            finalUser = userDoc.data() as User;
            setUser(finalUser);
            if (finalUser.role === 'Staff') setCurrentView('portal');
            else setCurrentView('dashboard');
          } else {
            // New user - create a default profile
            const isAdminEmail = fUser.email === 'tesadoalfredjoshcalizon@gmail.com';
            finalUser = {
              id: fUser.uid,
              username: fUser.email?.split('@')[0] || 'user',
              name: fUser.displayName || 'Anonymous User',
              role: isAdminEmail ? 'Admin' : 'Staff',
              avatar: fUser.photoURL || undefined
            };
            await setDoc(doc(db, 'users', fUser.uid), finalUser);
            setUser(finalUser);
            if (finalUser.role === 'Staff') setCurrentView('portal');
            else setCurrentView('dashboard');
          }
          await syncDatabase(finalUser);
        } catch (error) {
          console.error("Error fetching user profile:", error);
          await syncDatabase(null);
        }
      } else {
        // Only wipe user if we don't have a local session (or if we explicitly want to sign out)
        // We check if the current user is NOT a firebase user (meaning it's a local login)
        // For simplicity, we only clear if there is no userRef.current or if explicitly handled by logout
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [syncDatabase]);

  const handleLogin = async (loggedInUser: User) => {
    // This handles the transition from the UI
    setUser(loggedInUser);
    if (loggedInUser.role === 'Staff') setCurrentView('portal');
    else setCurrentView('dashboard');
    await syncDatabase(loggedInUser);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setCurrentView('dashboard');
  };

  const handleUpdateWorkers = async (updatedWorkers: Worker[]) => {
    setGlobalWorkers(updatedWorkers);
    await api.saveWorkers(updatedWorkers);
  };

  const handleAddReport = async (report: ShiftReport) => {
    try {
      const savedReport = await api.createReport(report);
      // Immediately refresh the reports state from the database
      await syncDatabase();
      return savedReport;
    } catch (err) {
      console.error("Critical: Failed to record shift report:", err);
      throw err;
    }
  };

  const renderContent = () => {
    if (!user) return null;
    switch (currentView) {
      case 'dashboard': return <Dashboard workers={globalWorkers} incidents={incidents} user={user} setView={setCurrentView} />;
      case 'monitoring': return <SafetyMonitoring initialWorkers={globalWorkers} />;
      case 'deployment': return <WorkforceDeployment workers={globalWorkers} onUpdateWorkers={handleUpdateWorkers} shifts={mockShifts} userRole={user.role} reports={shiftReports} />;
      case 'optimizer': return <ScheduleOptimizer workers={globalWorkers} shifts={mockShifts} />;
      case 'incidents': return <IncidentAnalysis incidents={incidents} />;
      case 'users': return <UserManagement users={globalUsers} onAddUser={async (u) => { const r = await api.createUser(u); setGlobalUsers(prev => [...prev.filter(x => x.id !== r.id), r]); }} onEditUser={async (u) => { await api.createUser(u); setGlobalUsers(prev => prev.map(x => x.id === u.id ? u : x)); }} onAddWorker={async (w) => { const newWorkers = [...globalWorkers, w]; setGlobalWorkers(newWorkers); await api.saveWorkers(newWorkers); }} onDeleteUser={async (id) => { await api.deleteUser(id); setGlobalUsers(prev => prev.filter(u => u.id !== id)); }} />;
      case 'portal': return <TechnicianPortal user={user} workers={globalWorkers} shifts={mockShifts as Shift[]} onAddReport={handleAddReport} onUpdateWorkers={handleUpdateWorkers} onLogout={handleLogout} />;
      default: return <Dashboard workers={globalWorkers} incidents={incidents} user={user} setView={setCurrentView} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_20px_rgba(34,197,94,0.3)]"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">System Handshake...</p>
      </div>
    );
  }

  if (!user) return <Login onLogin={handleLogin} users={globalUsers} />;

  const NavItem = ({ view, label, icon: Icon, allowedRoles }: { view: View; label: string; icon: any; allowedRoles?: UserRole[] }) => {
    if (allowedRoles && !allowedRoles.includes(user.role)) return null;
    return (
      <button
        onClick={() => { setCurrentView(view); setIsSidebarOpen(false); }}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${
          currentView === view ? 'bg-white text-green-800 font-black shadow-lg shadow-green-950/20' : 'text-white/60 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon size={18} />
        <span className="text-xs font-bold uppercase tracking-tight">{label}</span>
      </button>
    );
  };

  return (
    <GlobalErrorBoundary>
      <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans text-slate-900 overflow-hidden">
        <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-green-800 text-white transform transition-transform duration-300 lg:translate-x-0 lg:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-8 border-b border-white/10 flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl p-1 shadow-2xl"><Logo /></div>
            <div>
              <span className="font-black text-lg tracking-tighter uppercase leading-none block">SafetyNet</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-green-200 opacity-60">Valenzuela Ops</span>
            </div>
          </div>
          <nav className="p-4 mt-4 space-y-2">
            <NavItem view="dashboard" label="Command Hub" icon={LayoutDashboard} allowedRoles={['Admin', 'Supervisor', 'SafetyOfficer']} />
            <NavItem view="deployment" label="Deployment" icon={ClipboardCheck} allowedRoles={['Admin', 'SafetyOfficer', 'Supervisor']} />
            <NavItem view="optimizer" label="AI Optimizer" icon={Zap} allowedRoles={['Admin', 'Supervisor']} />
            <NavItem view="monitoring" label="Live Telemetry" icon={Activity} allowedRoles={['Admin', 'SafetyOfficer', 'Supervisor']} />
            <NavItem view="incidents" label="Risk History" icon={FileWarning} allowedRoles={['Admin', 'SafetyOfficer']} />
            <NavItem view="users" label="User Management" icon={UserCog} allowedRoles={['Admin']} />
            <NavItem view="portal" label="Worker Deck" icon={HardHat} allowedRoles={['Staff']} />
          </nav>
          <div className="absolute bottom-0 w-full p-6">
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 py-4 bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all">
              <LogOut size={16} /> Log Out
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center z-10">
            <div className="flex items-center gap-4">
              <button className="lg:hidden p-2 bg-slate-100 rounded-xl" onClick={() => setIsSidebarOpen(true)}><Menu size={20}/></button>
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl">
                {isOnline ? <Wifi size={14} className="text-green-600"/> : <WifiOff size={14} className="text-orange-500"/>}
                <span className={`text-[10px] font-black uppercase tracking-widest ${isOnline ? 'text-green-700' : 'text-orange-600'}`}>
                  {isOnline ? 'Intelligence Active' : 'Offline Mode'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span className="hidden sm:flex items-center gap-2"><Battery size={16} className="text-green-600"/> High Power</span>
              <span className="hidden sm:flex items-center gap-2"><ShieldCheck size={16} className="text-green-600"/> Encrypted</span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50/5">
            {renderContent()}
          </div>
        </main>
      </div>
    </GlobalErrorBoundary>
  );
};

export default App;
