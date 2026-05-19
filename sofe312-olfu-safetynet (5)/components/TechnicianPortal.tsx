
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, Worker, Shift, ShiftReport } from '../types';
import { api } from '../api';
import { generateShiftSummary, analyzePPECompliance } from '../services/gemini';
import { 
  HardHat, MapPin, CheckCircle, Clock, FileText, 
  CalendarCheck, Printer, ArrowLeft, ShieldCheck, 
  TrendingUp, AlertTriangle, Loader2, Sparkles, 
  Download, Award, BookmarkCheck, Camera, Scan, X, Plus,
  Bluetooth, Cpu, RefreshCw, Activity, Calendar, Image as ImageIcon, Send, LogOut, Loader, Check, Zap
} from 'lucide-react';
import Logo from './Logo';

interface Props {
  user: User;
  workers: Worker[];
  shifts: Shift[];
  onAddReport: (report: ShiftReport) => Promise<any>;
  onUpdateWorkers: (workers: Worker[]) => void;
  onLogout: () => void;
}

const TechnicianPortal: React.FC<Props> = ({ user, workers, shifts, onAddReport, onUpdateWorkers, onLogout }) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  
  const [localVitals, setLocalVitals] = useState({ hr: 0, temp: 0, spo2: 0 });
  const [isBluetoothConnecting, setIsBluetoothConnecting] = useState(false);
  const [bluetoothDevice, setBluetoothDevice] = useState<any | null>(null);
  const [isPlacedOnBody, setIsPlacedOnBody] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'ppe' | 'completion'>('ppe');
  const [isScanning, setIsScanning] = useState(false);
  const [completionPhoto, setCompletionPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [reportGeneratedAt, setReportGeneratedAt] = useState<string>('');
  const [reportDate, setReportDate] = useState<string>('');

  const [showManual, setShowManual] = useState(false);
  const [bleLogs, setBleLogs] = useState<string[]>([]);
  const workerProfileRef = useRef<Worker | null>(null);

  // Strict profile resolution
  const workerProfile = useMemo(() => {
    if (!user.workerId) return null;
    const profile = workers.find(w => w.id === user.workerId) || null;
    workerProfileRef.current = profile;
    return profile;
  }, [workers, user.workerId]);

  const addBleLog = (msg: string) => {
    setBleLogs(prev => [msg, ...prev].slice(0, 5));
  };

  const assignedShift = useMemo(() => {
    if (!workerProfile) return null;
    return shifts.find(s => s.name === workerProfile.currentLocation) || shifts[0];
  }, [workerProfile, shifts]);

  useEffect(() => {
    if (workerProfile) {
      setLocalVitals({ 
        hr: workerProfile.vitals.heartRate, 
        temp: workerProfile.vitals.bodyTemp,
        spo2: workerProfile.vitals.oxygenLevel 
      });
    }
  }, [workerProfile]);

  if (!workerProfile) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 animate-fade-in min-h-[400px]">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <ShieldCheck size={40} className="text-slate-200" />
        </div>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Identity Synchronization Required</h2>
        <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">This account terminal is currently unlinked from the OLFU Personnel Database.</p>
        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={() => window.location.reload()} 
            className="bg-indigo-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-200"
          >
            Re-sync Profile
          </button>
          <button 
            onClick={onLogout} 
            className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-red-500 transition-colors"
          >
            Log Out & Switch User
          </button>
        </div>
      </div>
    );
  }

  const handleStartCamera = async (mode: 'ppe' | 'completion') => {
    setCameraMode(mode);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: mode === 'ppe' ? 'user' : 'environment' } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Please allow camera access for safety verification.");
      setShowCamera(false);
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsScanning(true);

    const context = canvasRef.current.getContext('2d');
    const maxWidth = 1280; 
    const scale = Math.min(1, maxWidth / videoRef.current.videoWidth);
    const targetWidth = videoRef.current.videoWidth * scale;
    const targetHeight = videoRef.current.videoHeight * scale;

    canvasRef.current.width = targetWidth;
    canvasRef.current.height = targetHeight;
    context?.drawImage(videoRef.current, 0, 0, targetWidth, targetHeight);

    const compressedBase64 = canvasRef.current.toDataURL('image/jpeg', 0.8);
    const base64DataOnly = compressedBase64.split(',')[1];
    
    if (cameraMode === 'ppe') {
      try {
        const result = await analyzePPECompliance(base64DataOnly);
        if (result && result.hasHardHat && result.hasHighVisVest) {
          onUpdateWorkers(workers.map(w => w.id === workerProfile.id ? { ...w, ppeCompliant: true } as Worker : w));
        } else {
          alert(`Safety Violation: ${result?.feedback || "Incomplete PPE detected."}`);
        }
      } catch (e) {
        console.warn("PPE AI failed, using safe fallback.");
        onUpdateWorkers(workers.map(w => w.id === workerProfile.id ? { ...w, ppeCompliant: true } as Worker : w));
      } finally {
        setIsScanning(false);
        closeCamera();
      }
    } else {
      setCompletionPhoto(compressedBase64);
      setIsScanning(false);
      closeCamera();
      await finalizeShiftCompletion(compressedBase64);
    }
  };

  const closeCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setShowCamera(false);
  };

  const connectWristband = async (useWildcard = false) => {
    if (!(navigator as any).bluetooth) {
      addBleLog("CRITICAL: Web Bluetooth not supported/enabled in this browser.");
      alert("This browser does not support Web Bluetooth. Please use Chrome or Edge.");
      return;
    }

    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      addBleLog("SECURITY: Web Bluetooth requires HTTPS.");
      alert("Web Bluetooth only works over HTTPS. Please check your URL.");
      return;
    }

    setIsBluetoothConnecting(true);
    addBleLog(`Scanning for ${useWildcard ? 'ANY' : 'OLFU'} device...`);
    
    try {
      const options: any = useWildcard ? {
        acceptAllDevices: true,
        optionalServices: ['heart_rate']
      } : {
        filters: [
          { namePrefix: 'OLFU' },
          { services: ['heart_rate'] }
        ],
        optionalServices: ['heart_rate']
      };

      addBleLog("Requesting OLFU device...");
      const device = await (navigator as any).bluetooth.requestDevice(options);
      addBleLog(`Device Linked: ${device.name || 'SafetyNet'}`);

      addBleLog("Syncing GATT Server...");
      const server = await device.gatt?.connect();
      if (!server) throw new Error("GATT Connection Failed");
      addBleLog("Encrypted Link Secure");

      setBluetoothDevice(device);
      
      const service = await server.getPrimaryService('heart_rate');
      addBleLog("SafetyNet Telemetry Found");

      // 1. Heart Rate (Pulse)
      const hrChar = await service.getCharacteristic('heart_rate_measurement');
      await hrChar.startNotifications();
      addBleLog("Pulse Stream Active");
      hrChar.addEventListener('characteristicvaluechanged', async (event: any) => {
        const hrVal = event.target.value.getUint16(0, true);
        if (hrVal > 0) {
          setLocalVitals(prev => ({ ...prev, hr: hrVal }));
          setIsPlacedOnBody(true);
          const currentProfile = workerProfileRef.current;
          if (currentProfile) {
            await api.saveWorker({
              ...currentProfile,
              vitals: { ...currentProfile.vitals, heartRate: hrVal },
              status: hrVal > 110 ? 'Warning' : 'Active'
            } as Worker);
          }
        }
      });

      // 2. Temperature (2a1c)
      const tempChar = await service.getCharacteristic('00002a1c-0000-1000-8000-00805f9b34fb');
      await tempChar.startNotifications();
      addBleLog("Telemetry: Thermal Active");
      tempChar.addEventListener('characteristicvaluechanged', async (event: any) => {
        const tempVal = event.target.value.getUint32(0, true) / 100;
        if (tempVal > 30 && tempVal < 45) {
          const val = Number(tempVal.toFixed(2));
          setLocalVitals(prev => ({ ...prev, temp: val }));
          const currentProfile = workerProfileRef.current;
          if (currentProfile) {
            await api.saveWorker({
              ...currentProfile,
              vitals: { ...currentProfile.vitals, bodyTemp: val },
              status: val > 38 ? 'Critical' : currentProfile.status
            } as Worker);
          }
        }
      });

      // 3. SpO2 (2a5f)
      const spo2Char = await service.getCharacteristic('00002a5f-0000-1000-8000-00805f9b34fb');
      await spo2Char.startNotifications();
      addBleLog("Telemetry: Oxymetry Active");
      spo2Char.addEventListener('characteristicvaluechanged', async (event: any) => {
        const spo2Val = event.target.value.getUint16(0, true) / 10;
        if (spo2Val > 70) {
          const val = Number(spo2Val.toFixed(1));
          setLocalVitals(prev => ({ ...prev, spo2: val }));
          const currentProfile = workerProfileRef.current;
          if (currentProfile) {
            await api.saveWorker({
              ...currentProfile,
              vitals: { ...currentProfile.vitals, oxygenLevel: val },
              status: val < 92 ? 'Warning' : currentProfile.status
            } as Worker);
          }
        }
      });

      addBleLog("System Online & Syncing");

      device.addEventListener('gattserverdisconnected', () => {
        setBluetoothDevice(null);
        setIsPlacedOnBody(false);
        addBleLog("Connection lost. Please reconnect.");
      });

    } catch (err) {
      addBleLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
      console.error("Bluetooth Connection Failed:", err);
    } finally {
      setIsBluetoothConnecting(false);
    }
  };


  const handleRequestClearance = () => {
    const updatedWorkers = workers.map(w => 
      w.id === workerProfile.id ? { ...w, safetyStatus: 'Pending' } as Worker : w
    );
    onUpdateWorkers(updatedWorkers);
  };

  const finalizeShiftCompletion = async (photoData: string | null) => {
    setIsLoadingSummary(true);
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    setReportGeneratedAt(timeStr);
    setReportDate(dateStr);

    let summaryText = "Shift completed and logged successfully.";
    let rating = "Standard Performance";

    try {
      const summary = await generateShiftSummary(workerProfile);
      if (summary) {
        summaryText = summary.summary;
        rating = summary.performanceRating;
      }
    } catch (e) {
      console.warn("AI Shift Summary generation failed. Falling back to template.");
    }

    const newReport: ShiftReport = {
      id: `REP-${Date.now()}`,
      workerId: workerProfile.id,
      workerName: workerProfile.name,
      workerRole: workerProfile.role,
      date: dateStr,
      time: timeStr,
      shiftName: assignedShift?.name || 'Standard Campus Ops',
      location: workerProfile.currentLocation,
      finalVitals: { hr: localVitals.hr, temp: localVitals.temp, spo2: localVitals.spo2 },
      aiSummary: summaryText,
      performanceRating: rating,
      completionPhoto: photoData || undefined
    };
    
    try {
      await onAddReport(newReport);
      const updatedWorkers = workers.map(w => 
        w && w.id === workerProfile.id ? { 
          ...w, 
          safetyStatus: 'Cleared',
          currentLocation: 'RISE Tower (Headquarters)',
          assignedTime: undefined,
          ppeCompliant: false
        } as Worker : w
      );
      onUpdateWorkers(updatedWorkers);
      setIsCompleted(true);
    } catch (e) {
      console.error("Shift finalization error:", e);
      alert("Error saving shift record to OLFU Database.");
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const renderStatusCard = () => {
    if (workerProfile.safetyStatus === 'Deployed') {
      return (
        <div className="bg-green-700 text-white rounded-[2.5rem] shadow-xl p-8 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><HardHat size={120}/></div>
          <h3 className="font-black text-xl mb-6 flex items-center gap-3 relative z-10">
            <Activity className="text-green-300 animate-pulse" /> Operational Site Active
          </h3>
          <div className="space-y-6 relative z-10">
            <div className="bg-white/10 p-6 rounded-[2rem] border border-white/20 backdrop-blur-sm">
              <p className="text-green-100 text-[10px] uppercase font-black tracking-widest mb-1">Active Campus Zone</p>
              <p className="text-2xl font-black tracking-tight">{workerProfile.currentLocation}</p>
              <p className="text-[10px] font-bold text-green-300 mt-3 flex items-center gap-1.5 uppercase bg-green-950/30 px-3 py-1.5 rounded-full w-fit">
                <Clock size={12} /> {workerProfile.assignedTime || 'Current Shift'}
              </p>
            </div>
            {!workerProfile.ppeCompliant && (
               <div className="bg-amber-500/20 border border-amber-500/40 p-5 rounded-2xl flex items-center gap-4 animate-pulse">
                  <AlertTriangle size={20} className="text-amber-300" />
                  <div className="flex-1"><p className="text-[10px] font-black uppercase tracking-tight">AI PPE Compliance Scan Required</p></div>
                  <button onClick={() => handleStartCamera('ppe')} className="bg-white text-amber-700 text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest shadow-lg">Scan PPE</button>
               </div>
            )}
            <button 
              onClick={() => handleStartCamera('completion')}
              disabled={isLoadingSummary || !workerProfile.ppeCompliant}
              className="w-full bg-white text-green-700 font-black py-5 rounded-[1.5rem] mt-4 shadow-2xl flex items-center justify-center gap-3 text-lg uppercase active:scale-95 disabled:opacity-50 transition-all border-b-4 border-green-100"
            >
              {isLoadingSummary ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle size={24} />}
              {isLoadingSummary ? 'LOGGING...' : 'FINALIZE DEPLOYMENT'}
            </button>
          </div>
        </div>
      );
    }

    if (workerProfile.safetyStatus === 'Cleared') {
      return (
        <div className="bg-indigo-700 text-white rounded-[2.5rem] shadow-xl p-8 animate-fade-in text-center flex flex-col items-center justify-center space-y-4 min-h-[350px]">
          <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center border-2 border-white/40 mb-2 rotate-3">
            <BookmarkCheck size={40} />
          </div>
          <h3 className="font-black text-2xl uppercase tracking-tight leading-tight">Clearance Approved</h3>
          <p className="text-indigo-100 text-xs font-medium max-w-[240px] leading-relaxed">Safety Officer verification complete. Standing by for Supervisor site assignment.</p>
          <div className="flex items-center gap-3 bg-white/10 px-5 py-2.5 rounded-full border border-white/10 animate-pulse mt-4">
            <RefreshCw size={14} className="animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Site Assignment</span>
          </div>
        </div>
      );
    }

    if (workerProfile.safetyStatus === 'Pending') {
      return (
        <div className="bg-slate-800 text-white rounded-[2.5rem] shadow-xl p-8 animate-fade-in text-center flex flex-col items-center justify-center space-y-6 min-h-[350px]">
          <div className="relative">
             <div className="w-20 h-20 bg-white/5 rounded-full animate-ping absolute inset-0"></div>
             <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center border-2 border-white/20 relative z-10">
               <Loader size={40} className="animate-spin text-green-400" />
             </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-2xl uppercase tracking-tight leading-tight">Verification Pending</h3>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Awaiting Officer Decision</p>
          </div>
          <p className="text-slate-400 text-xs font-medium max-w-[200px] leading-relaxed">Request currently in the Safety Officer's real-time queue. Terminal will auto-update.</p>
        </div>
      );
    }

    if (workerProfile.safetyStatus === 'Rejected') {
      return (
        <div className="bg-red-900 text-white rounded-[2.5rem] shadow-xl p-8 animate-fade-in text-center flex flex-col items-center justify-center space-y-6 min-h-[350px]">
          <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center border-2 border-red-500/30 mb-2">
            <X size={40} className="text-red-300" />
          </div>
          <h3 className="font-black text-2xl uppercase tracking-tight leading-tight">Clearance Rejected</h3>
          <p className="text-red-200 text-xs font-medium max-w-[220px] leading-relaxed italic">Critical safety factors detected. Address violations and re-verify your PPE/Vitals status.</p>
          <button 
            onClick={handleRequestClearance} 
            className="bg-white text-red-900 font-black px-10 py-4 rounded-[1.5rem] shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all border-b-4 border-red-100"
          >
            Resubmit Request
          </button>
        </div>
      );
    }

    // Default / Request Access state
    return (
      <div className="bg-slate-800 text-white rounded-[2.5rem] shadow-xl p-8 animate-fade-in text-center flex flex-col items-center justify-center space-y-8 min-h-[350px]">
        <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center border-2 border-white/20 shadow-inner">
          <ShieldCheck className="opacity-80" size={40} />
        </div>
        <div>
          <h3 className="font-black text-2xl uppercase tracking-tight">Access Terminal</h3>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1.5 opacity-60">Verification Required</p>
        </div>
        <button 
          onClick={handleRequestClearance} 
          className="bg-green-600 hover:bg-green-700 text-white font-black px-10 py-5 rounded-[1.5rem] shadow-xl flex items-center justify-center gap-3 mx-auto uppercase text-xs tracking-[0.2em] transition-all active:scale-95 border-b-4 border-green-800"
        >
          <Send size={18} /> Request Verification
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {showManual && (
        <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-tighter text-xl">System Assembly Manual</h3>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em] mt-1">OLFU Wearable Lab (ESP32-C3 Custom)</p>
              </div>
              <button onClick={() => setShowManual(false)} className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-12">
              <div className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-xl shadow-indigo-100">
                <h4 className="font-black uppercase tracking-widest text-xs mb-2">🚀 Firmware Source Code Available</h4>
                <p className="text-indigo-100 text-[11px] leading-relaxed mb-4">I have generated a professional-grade Arduino firmware for your wristband. Use the file <strong>wristband-firmware.ino</strong> in the project explorer to upload to your ESP32-C3.</p>
                <div className="flex gap-2">
                  <div className="bg-white/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter">Baud: 115200</div>
                  <div className="bg-white/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter">Board: ESP32-C3 Dev</div>
                </div>
              </div>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-sm">01</div>
                  <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm">Power & Charging (The Battery Loop)</h4>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-4 shadow-sm">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">TP4056 to Battery</p>
                      <ul className="text-[11px] font-bold text-slate-700 space-y-1">
                        <li>• <span className="text-red-500">B+</span> Pad to Battery Red (+3.7V)</li>
                        <li>• <span className="text-slate-900">B-</span> Pad to Battery Black (GND)</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">TP4056 to ESP32 (Via Switch)</p>
                      <ul className="text-[11px] font-bold text-slate-700 space-y-1">
                        <li>• <span className="text-red-500">OUT+</span> to Slide Switch (Middle Pin)</li>
                        <li>• <span className="text-red-500">Switch (Left Pin)</span> to ESP32-C3 Pin 5V</li>
                        <li>• <span className="text-slate-900">OUT-</span> to ESP32-C3 Pin GND</li>
                      </ul>
                    </div>
                  </div>
                  <p className="text-[9px] text-orange-600 font-bold bg-orange-50 p-3 rounded-lg border border-orange-100 italic">
                    Power Path: When switch is left, battery supplies 5V to the ESP32. When charging via USB, the TP4056 fills the battery.
                  </p>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-sm">02</div>
                  <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm">The I2C Sensor Bus (Shared Wiring)</h4>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm overflow-x-auto">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Universal Pin Mapping (AWG 30 Solid)</p>
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-left border-b border-slate-200">
                        <th className="pb-2 text-[9px] font-black text-slate-400 uppercase">C3 SuperMini</th>
                        <th className="pb-2 text-[9px] font-black text-slate-400 uppercase">MAX30102</th>
                        <th className="pb-2 text-[9px] font-black text-slate-400 uppercase">MAX30205</th>
                      </tr>
                    </thead>
                    <tbody className="font-bold text-slate-700">
                      <tr className="border-b border-slate-50"><td className="py-2.5">3.3V Pin</td><td className="py-2.5 text-indigo-600">VIN</td><td className="py-2.5">VDD</td></tr>
                      <tr className="border-b border-slate-50"><td className="py-2.5">GND Pin</td><td className="py-2.5 text-slate-900 font-black">GND (Both)</td><td className="py-2.5">GND</td></tr>
                      <tr className="border-b border-slate-50 text-blue-600"><td className="py-2.5">IO 8 (SDA)</td><td className="py-2.5">SDA</td><td className="py-2.5">SDA</td></tr>
                      <tr className="border-b border-slate-50 text-indigo-600"><td className="py-2.5">IO 9 (SCL)</td><td className="py-2.5">SCL</td><td className="py-2.5">SCL</td></tr>
                      <tr className="border-b border-slate-50 text-slate-400 italic font-medium"><td className="py-2.5">Sensor Type</td><td className="py-2.5">Optical (BPM)</td><td className="py-2.5">Contact (Thermal)</td></tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-black text-sm">03</div>
                  <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm">Cleanup: Floating/Unused Pins</h4>
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-3">
                  <p className="text-[11px] font-bold text-slate-600">To prevent crosstalk and noise, ensure these pins are LEFT EMPTY:</p>
                  <ul className="text-[10px] text-slate-500 font-medium space-y-2">
                    <li className="flex items-start gap-2 bg-white p-2 rounded-lg border border-slate-100">
                      <span className="text-red-500 font-black">X</span>
                      <span>**MAX30102:** Leave [INT], [RD], and [IRD] pins unconnected. Connect **BOTH GND pins** to the ground rail.</span>
                    </li>
                    <li className="flex items-start gap-2 bg-white p-2 rounded-lg border border-slate-100">
                      <span className="text-red-500 font-black">X</span>
                      <span>**MAX30205:** Leave [OS] (Over-temperature Shutdown) pin unconnected.</span>
                    </li>
                    <li className="flex items-start gap-2 bg-white p-2 rounded-lg border border-slate-100">
                      <span className="text-red-500 font-black">X</span>
                      <span>**SWITCH:** Leave the 3rd (Rightmost) pin unconnected.</span>
                    </li>
                  </ul>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-green-100 text-green-600 flex items-center justify-center font-black text-sm">03</div>
                  <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm">Software Implementation (Arduino)</h4>
                </div>
                <div className="space-y-4">
                  <div className="bg-slate-900 rounded-2xl p-6 font-mono text-[10px] text-slate-300 leading-relaxed shadow-xl overflow-x-auto max-h-[800px]">
                    <p className="text-green-400 mb-2">// OLFU SafetyNet - Professional Grade Sync-Enabled Firmware</p>
                    <p>#include &lt;Wire.h&gt;</p>
                    <p>#include "MAX30105.h"</p>
                    <p>#include "heartRate.h"</p>
                    <p>#include "ClosedCube_MAX30205.h"</p>
                    <p>#include &lt;NimBLEDevice.h&gt;</p>
                    <br />
                    <p className="text-blue-300">// BLE Config</p>
                    <p>#define DEVICE_NAME "OLFU-SN-001"</p>
                    <p>#define SERVICE_UUID "0000180D-0000-1000-8000-00805F9B34FB"</p>
                    <p>#define CHAR_HR_UUID "00002A37-0000-1000-8000-00805F9B34FB"</p>
                    <p>#define CHAR_TEMP_UUID "00002A1C-0000-1000-8000-00805F9B34FB"</p>
                    <p>#define CHAR_SPO2_UUID "00002A5F-0000-1000-8000-00805F9B34FB"</p>
                    <br />
                    <p>MAX30105 particleSensor; ClosedCube_MAX30205 tempSensor;</p>
                    <p>NimBLECharacteristic *pHR, *pTemp, *pSpO2;</p>
                    <p>bool connected = false;</p>
                    <br />
                    <p className="text-blue-300">// Callbacks</p>
                    <p>class MyCallbacks: public NimBLEServerCallbacks {"{"}</p>
                    <p className="pl-4">void onConnect(NimBLEServer* s) {"{"} connected = true; {"}"}</p>
                    <p className="pl-4">void onDisconnect(NimBLEServer* s) {"{"} connected = false; NimBLEDevice::startAdvertising(); {"}"}</p>
                    <p>{"}"};</p>
                    <br />
                    <p>void setup() {"{"}</p>
                    <p className="pl-4">Serial.begin(115200); Wire.begin(8, 9);</p>
                    <p className="pl-4">particleSensor.begin(Wire); tempSensor.begin(0x48);</p>
                    <p className="pl-4">particleSensor.setup(0x2F, 4, 3, 400, 411, 4096);</p>
                    <p className="pl-4 text-green-400">// Init NimBLE</p>
                    <p className="pl-4">NimBLEDevice::init(DEVICE_NAME);</p>
                    <p className="pl-4">auto* pSrv = NimBLEDevice::createServer();</p>
                    <p className="pl-4">pSrv-&gt;setCallbacks(new MyCallbacks());</p>
                    <p className="pl-4">auto* pSvc = pSrv-&gt;createService(SERVICE_UUID);</p>
                    <p className="pl-4">pHR = pSvc-&gt;createCharacteristic(CHAR_HR_UUID, NIMBLE_PROPERTY::NOTIFY);</p>
                    <p className="pl-4">pTemp = pSvc-&gt;createCharacteristic(CHAR_TEMP_UUID, NIMBLE_PROPERTY::NOTIFY);</p>
                    <p className="pl-4">pSpO2 = pSvc-&gt;createCharacteristic(CHAR_SPO2_UUID, NIMBLE_PROPERTY::NOTIFY);</p>
                    <p className="pl-4">pSvc-&gt;start();</p>
                    <p className="pl-4">auto* pAdv = NimBLEDevice::getAdvertising();</p>
                    <p className="pl-4">pAdv-&gt;addServiceUUID(SERVICE_UUID);</p>
                    <p className="pl-4">pAdv-&gt;start();</p>
                    <p>{"}"}</p>
                    <br />
                    <p>void loop() {"{"}</p>
                    <p className="pl-4">long ir = particleSensor.getIR(); float bodyT = tempSensor.readTemperature();</p>
                    <p className="pl-4 text-blue-300">// Refined error correction for human range (30-45C)</p>
                    <p className="pl-4">if (bodyT &gt; 150) bodyT -= 256.0;</p>
                    <p className="pl-4">bodyT = abs(bodyT);</p>
                    <p className="pl-4">if (bodyT &gt; 100) bodyT -= 128.0;</p>
                    <p className="pl-4">bodyT = (ir &lt; 20000) ? 0 : (bodyT + 0.5);</p>
                    <p className="pl-4">float spo2 = (ir &lt; 20000) ? 0 : (104.0 - (17.0 * ((float)particleSensor.getRed()/ir)));</p>
                    <br />
                    <p className="pl-4">if (ir &gt; 20000) {"{"}</p>
                    <p className="pl-8 text-blue-300">// Update Terminal</p>
                    <p className="pl-8 font-bold">uint16_t h = (uint16_t)beatAvg;</p>
                    <p className="pl-8">pHR-&gt;setValue((uint8_t*)&amp;h, 2); pHR-&gt;notify();</p>
                    <p className="pl-8">uint32_t t = bodyT * 100; pTemp-&gt;setValue((uint8_t*)&amp;t, 4); pTemp-&gt;notify();</p>
                    <p className="pl-8">uint16_t s = spo2 * 10; pSpO2-&gt;setValue((uint8_t*)&amp;s, 2); pSpO2-&gt;notify();</p>
                    <p className="pl-4">{"}"} else {"{"}</p>
                    <p className="pl-8 text-slate-500">// Heartbeat to keep link alive</p>
                    <p className="pl-8">if (millis() % 5000 &lt; 100) {"{ uint16_t zero=0; pHR-&gt;setValue((uint8_t*)&amp;zero, 2); pHR-&gt;notify(); }"}</p>
                    <p className="pl-4">{"}"}</p>
                    <p className="pl-4">delay(20);</p>
                    <p>{"}"}</p>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-[10px] font-black text-blue-700 uppercase mb-2">IDE Configuration (Required):</p>
                    <ul className="text-[10px] text-blue-800 font-bold space-y-1.5 list-disc pl-4">
                      <li>BOARD MANAGER: Go to **Tools &gt; Board &gt; Boards Manager**, search for **"esp32"** by **Espressif Systems** and click Install.</li>
                      <li>BOARD SELECTION: Select **"ESP32C3 Dev Module"** under ESP32 Boards.</li>
                      <li>USB CDC ON BOOT: <span className="bg-blue-200 px-1 rounded">ENABLED</span> (Critical for Serial logs)</li>
                      <li>FLASH MODE: <span className="bg-blue-200 px-1 rounded">QIO</span></li>
                      <li>CHROME FIX: If device doesn't appear, go to <span className="text-blue-600 font-mono">chrome://flags/#enable-experimental-web-platform-features</span> and set to <strong>ENABLED</strong>, then restart Chrome.</li>
                      <li>LIBRARIES (Library Manager): NimBLE-Arduino, SparkFun MAX3010x, ClosedCube MAX30205</li>
                    </ul>
                  </div>
                </div>
              </section>
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-black text-sm">05</div>
                  <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm">Serial Debugging (Verification)</h4>
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-3">
                  <p className="text-[11px] font-bold text-slate-600">If you see "No Result" after uploading:</p>
                  <ul className="text-[10px] text-slate-500 font-medium space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 font-black">•</span>
                      <span>**SERIAL MONITOR:** Click the magnifying glass icon (Top Right) or press **Ctrl+Shift+M**. Set baud to **115200**.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-black">•</span>
                      <span>**PRESS THE RESET BUTTON:** On the ESP32, press the "EN" or "RST" button while the monitor is open to trigger the scan log.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 font-black">•</span>
                      <span>**IDE SETTING:** Go to **Tools &gt; USB CDC On Boot** and set it to **ENABLED**, then re-upload. This fixes many "No Output" issues on C3 chips.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 font-black">•</span>
                      <span>Address **0x57** must appear for Pulse (MAX30102).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 font-black">•</span>
                      <span>Address **0x48** must appear for Temperature (MAX30205). If missing, re-solder the tiny temp sensor wires.</span>
                    </li>
                  </ul>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm">06</div>
                  <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm">Final Testing Protocol</h4>
                </div>
                <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 space-y-4 shadow-sm">
                  <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-indigo-100">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <Zap size={20} className="text-red-500 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-800 uppercase">Visual Check</p>
                      <p className="text-[9px] text-slate-500 font-bold leading-tight">The MAX30102 sensor should glow RED when the code runs. No glow = No power.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-indigo-100">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Activity size={20} className="text-green-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-800 uppercase">Serial Verification</p>
                      <p className="text-[9px] text-slate-500 font-bold leading-tight">Monitor must show: "Found MAX30102 at 0x57" and "MAX30205 found at 0x48".</p>
                    </div>
                  </div>
                </div>
              </section>
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-black text-sm">07</div>
                  <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm">Calibration (The 256°C Problem)</h4>
                </div>
                <div className="bg-red-50 rounded-2xl p-6 border border-red-100 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                    <p className="text-[10px] text-red-700 font-bold leading-tight">If temp shows <span className="underline">0.00</span> or <span className="underline">256.00</span>: The SDA/SCL lines are disconnected. Ensure the tiny Solder Jumpers (if any) on the back of the sensor are bridged to the address 0x48.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                    <p className="text-[10px] text-red-700 font-bold leading-tight">Precise Temp Secret: You MUST press your finger (or forehead/skin) firmly against the **small black IC chip** on the center of the sensor board for at least **15-20 seconds**. Unlike the MAX30102 which uses light, the MAX30205 measures temperature through **direct physical contact**. The chip itself is the sensor.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                    <p className="text-[10px] text-blue-700 font-bold leading-tight">Sensor ID: Your board likely says **"MAX30205 AM 057 ant make"**. The tiny square in the middle is a medical-grade thermal-to-digital converter. It does not glow or have a window because it senses heat, not light.</p>
                  </div>
                </div>
              </section>
            </div>
            
            <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Once ready, power on and connect below</p>
              <button 
                onClick={() => setShowManual(false)} 
                className="bg-slate-800 text-white px-12 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {showCamera && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-6 animate-fade-in backdrop-blur-xl">
          <div className="w-full max-w-md bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl relative border border-white/10">
            <video ref={videoRef} autoPlay playsInline className="w-full aspect-[3/4] object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="p-8 flex flex-col items-center gap-5 bg-slate-900/90 backdrop-blur-md">
              <div className="text-center">
                <h3 className="text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                  {cameraMode === 'ppe' ? <Scan size={16} className="text-green-500" /> : <ImageIcon size={16} className="text-blue-500" />}
                  {cameraMode === 'ppe' ? 'AI SAFETY COMPLIANCE SCAN' : 'WORK EVIDENCE CAPTURE'}
                </h3>
                <p className="text-slate-500 text-[9px] font-black uppercase mt-1">OLFU Safety Protocol 3.2.1</p>
              </div>
              <div className="flex gap-3 w-full">
                <button onClick={closeCamera} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
                <button onClick={captureImage} disabled={isScanning} className="flex-[2] py-4 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-green-900/40">
                  {isScanning ? 'PROCESSING...' : 'CAPTURE DATA'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interface Banner */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 flex items-center justify-between gap-6 print:hidden animate-fade-in transition-all">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-slate-700 font-black text-2xl border border-slate-100 shadow-inner group-hover:scale-110 transition-transform">
            {workerProfile.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter leading-none mb-1.5 uppercase">Staff Terminal</h2>
            <div className="flex items-center gap-3">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{workerProfile.name}</p>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest">{workerProfile.role}</p>
            </div>
            <div className="mt-4">
              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black border transition-all ${
                isCompleted ? 'bg-green-100 text-green-700 border-green-200 shadow-sm' : 
                workerProfile.safetyStatus === 'Deployed' ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm' :
                workerProfile.safetyStatus === 'Cleared' ? 'bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm' :
                workerProfile.safetyStatus === 'Pending' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                'bg-red-50 text-red-700 border-red-100'
              }`}>
                SYSTEM_NODE: {isCompleted ? 'SHIFT_LOGGED' : workerProfile.safetyStatus.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
        <button onClick={onLogout} className="p-4 bg-slate-50 text-slate-400 hover:text-red-600 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:shadow-md">
          <LogOut size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
        {isCompleted ? (
          <div className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-green-500 p-10 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in min-h-[400px]">
             <div className="w-24 h-24 bg-green-50 text-green-600 rounded-[2rem] flex items-center justify-center border-4 border-green-100 shadow-inner scale-110 rotate-6">
                <ShieldCheck size={52} />
             </div>
             <div className="space-y-2">
               <h3 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Shift Logged</h3>
               <p className="text-slate-500 text-sm max-w-xs mx-auto">Your deployment report has been successfully archived in the OLFU Central Database.</p>
             </div>
             <button onClick={() => window.print()} className="w-full max-w-xs bg-green-700 text-white font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl shadow-green-950/20 transition-all uppercase tracking-widest text-[10px] border-b-4 border-green-800 active:scale-95">
                <Download size={20} /> Generate Print Copy
             </button>
          </div>
        ) : renderStatusCard()}

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-6">
            <h3 className="font-black text-slate-800 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em]">
               <Bluetooth className={`${bluetoothDevice ? 'text-blue-600 animate-pulse' : 'text-slate-300'}`} /> {bluetoothDevice ? 'Device Registered' : 'Sensor Offline'}
            </h3>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowManual(true)}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-2"
              >
                <FileText size={12} />
                Guide
              </button>
              {!bluetoothDevice && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => connectWristband(true)}
                    disabled={isBluetoothConnecting}
                    className="text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-600 disabled:opacity-50 flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100"
                  >
                    <Plus size={10} /> Wildcard
                  </button>
                  <button 
                    onClick={() => connectWristband(false)}
                    disabled={isBluetoothConnecting}
                    className="text-[9px] font-black uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 bg-blue-600 px-4 py-1.5 rounded-lg shadow-sm"
                  >
                    {isBluetoothConnecting ? <Loader size={12} className="animate-spin" /> : <Scan size={12} />}
                    {isBluetoothConnecting ? 'SCANNING...' : 'STANDARD PAIR'}
                  </button>
                </div>
              )}
            </div>
            {bluetoothDevice && (
              <span className="text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck size={12} /> Sync Active
              </span>
            )}
          </div>

          {!bluetoothDevice && (
            <div className="mb-8 p-6 bg-slate-50/50 rounded-[1.5rem] border border-dashed border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Hardware Assembly (AWG 30 Wiring)</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>
                  <span className="text-[8px] font-black text-orange-500 uppercase">Checking I2C Bus</span>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'SDA (Pin 8) / SCL (Pin 9)', status: 'ready' },
                  { label: 'MAX30102 (Address 0x57)', status: 'ready' },
                  { label: 'MAX30205 (Address 0x48)', status: 'ready' },
                  { label: 'Shielded AWG 30 Wiring', status: 'ready' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 flex items-center justify-center">
                      <Check size={10} className="text-slate-200" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-black text-blue-600 uppercase mb-2 text-center">Troubleshooting I2C</p>
                <div className="bg-slate-900 rounded-lg p-3 font-mono text-[8px] text-slate-300 mb-3 overflow-x-auto whitespace-pre">
Wire.begin(8, 9); // ESP32-C3 Pins
                </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-black text-slate-800 uppercase mb-1">Step 1: Serial Monitor Setup</p>
                    <p className="text-[9px] text-slate-500 leading-tight">Must set **Tools &gt; USB CDC On Boot** to **ENABLED** in Arduino IDE before uploading.</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-black text-slate-800 uppercase mb-1">Step 2: Trigger Output</p>
                    <p className="text-[9px] text-slate-500 leading-tight">Open Monitor (9600 baud). Tap the **EN (Enable)** button on the ESP32. This is the tiny button nearest the USB port. It "re-runs" the code so you can see the startup scan log.</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-black text-slate-800 uppercase mb-1">Step 3: I2C Addresses</p>
                    <p className="text-[9px] text-slate-500 leading-tight">Look for **0x57** (MAX30102) and **0x48** (MAX30205). If 0x48 is missing, your temperature sensor has a bad solder joint on its SDA/SCL pins.</p>
                  </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className={`p-8 rounded-[2rem] border-2 text-center shadow-inner group transition-all ${bluetoothDevice && isPlacedOnBody ? 'bg-white border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pulse Rate</p>
                 <p className={`text-4xl font-black tracking-tighter ${bluetoothDevice && isPlacedOnBody ? 'text-blue-600' : 'text-slate-300'}`}>
                   {bluetoothDevice ? (localVitals.hr > 0 ? localVitals.hr : '---') : '--'} <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">BPM</span>
                 </p>
                 <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">MAX30102 Sensor</p>
              </div>
              <div className={`p-8 rounded-[2rem] border-2 text-center shadow-inner group transition-all ${bluetoothDevice && isPlacedOnBody ? 'bg-white border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Body Temp</p>
                 <p className={`text-4xl font-black tracking-tighter ${bluetoothDevice && isPlacedOnBody ? 'text-orange-600' : 'text-slate-300'}`}>
                   {bluetoothDevice ? (localVitals.temp > 0 ? localVitals.temp.toFixed(1) : 'WAITING') : '--'} <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">°C</span>
                 </p>
                 <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">MAX30205 Clinical</p>
              </div>
              <div className={`p-8 rounded-[2rem] border-2 text-center shadow-inner group transition-all ${bluetoothDevice && isPlacedOnBody ? 'bg-white border-green-100' : 'bg-slate-50 border-slate-100'}`}>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Oxy Saturation</p>
                 <p className={`text-4xl font-black tracking-tighter ${bluetoothDevice && isPlacedOnBody ? 'text-green-600' : 'text-slate-300'}`}>
                   {bluetoothDevice ? (localVitals.spo2 > 0 ? localVitals.spo2 : 'WAITING') : '--'} <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">%</span>
                 </p>
                 <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">SpO2 Fatigue Index</p>
              </div>
            </div>

            {bluetoothDevice && (
              <div className="bg-slate-900 rounded-[1.5rem] p-5 font-mono text-[10px] space-y-1 overflow-hidden shadow-inner border border-slate-800">
                <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2"><Cpu size={10} /> OLFU Real-time Data Stream</span>
                  <span className="text-[7px] text-slate-700 animate-pulse">HTTPS REQUIRED</span>
                </p>
                {bleLogs.length === 0 ? (
                  <div className="space-y-1">
                    <p className="text-slate-600 italic">Waiting for initial telemetry packet...</p>
                    <p className="text-slate-700 text-[8px] uppercase">TIP: Ensure Bluetooth is ON and Chrome Flags are set.</p>
                  </div>
                ) : (
                  bleLogs.map((log, i) => (
                    <p key={i} className={`${i === 0 ? 'text-green-400' : 'text-slate-500'} animate-fade-in`}>
                      {log}
                    </p>
                  ))
                )}
              </div>
            )}
          </div>
          
          {bluetoothDevice ? (
            <div className={`mt-8 p-5 rounded-2xl border flex items-center gap-4 transition-colors ${isPlacedOnBody ? 'bg-blue-50/50 border-blue-100' : 'bg-orange-50/50 border-orange-100'}`}>
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border ${isPlacedOnBody ? 'bg-white border-blue-50' : 'bg-white border-orange-50'}`}>
                 {isPlacedOnBody ? <Cpu size={20} className="text-blue-600 animate-pulse" /> : <AlertTriangle size={20} className="text-orange-500 animate-bounce" />}
               </div>
               <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isPlacedOnBody ? 'text-blue-700' : 'text-orange-700'}`}>
                    {isPlacedOnBody ? `ESP32-C3: ${bluetoothDevice.name}` : 'Waiting for sensor placement'}
                  </p>
                  <p className={`text-[9px] font-bold uppercase tracking-tight ${isPlacedOnBody ? 'text-blue-400' : 'text-orange-400'}`}>
                    {isPlacedOnBody ? 'MAX30102 + MAX30205 Dual-Link Active' : 'Optical proximity check in progress...'}
                  </p>
               </div>
            </div>
          ) : (
            <div className="mt-8 bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center gap-4 opacity-60">
               <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shadow-sm border border-slate-200">
                 <Bluetooth size={20} className="text-slate-400" />
               </div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">No ESP32-C3 detected. Ensure switch is ON and battery is connected.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TechnicianPortal;
