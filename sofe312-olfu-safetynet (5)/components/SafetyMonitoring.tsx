
import React, { useState, useEffect } from 'react';
import { Worker } from '../types';
import { api } from '../api';
import { 
  Heart, Thermometer, User, MapPin, ShieldCheck, 
  Activity, Radio, AlertTriangle, 
  Phone, Siren, Cpu, Settings, Zap, Clock, TrendingDown
} from 'lucide-react';

interface Props {
  initialWorkers: Worker[];
}

const SafetyMonitoring: React.FC<Props> = ({ initialWorkers }) => {
  const [workers, setWorkers] = useState<Worker[]>(initialWorkers);
  const [showHardwareGuide, setShowHardwareGuide] = useState(false);
  const [port, setPort] = useState<any>(null);
  const [reader, setReader] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const parseSerialData = (data: string) => {
    // Expected format: BPM: 72 | SpO2: 98.5% | T: 36.50C
    try {
      const bpmMatch = data.match(/BPM:\s*(\d+)/);
      const spo2Match = data.match(/SpO2:\s*([\d.]+)/);
      const tempMatch = data.match(/T:\s*([\d.]+)/);

      if (bpmMatch || spo2Match || tempMatch) {
        setWorkers(prev => {
          const newWorkers = [...prev];
          // We'll update the first worker for demonstration, or one named "Hardware Node"
          const targetIndex = newWorkers.findIndex(w => w.id === '1') !== -1 ? newWorkers.findIndex(w => w.id === '1') : 0;
          
          if (newWorkers[targetIndex]) {
            const vitals = { ...newWorkers[targetIndex].vitals };
            if (bpmMatch) vitals.heartRate = parseInt(bpmMatch[1]);
            if (tempMatch) vitals.bodyTemp = parseFloat(tempMatch[1]);
            if (spo2Match) vitals.oxygenLevel = parseFloat(spo2Match[1]);
            
            newWorkers[targetIndex] = {
              ...newWorkers[targetIndex],
              vitals: vitals,
              status: (vitals.bodyTemp > 38 || vitals.oxygenLevel < 90) ? 'Critical' : vitals.heartRate > 100 ? 'Warning' : 'Active'
            };
          }
          return newWorkers;
        });
      }
    } catch (e) {
      console.error("Hardware Parsing Error:", e);
    }
  };

  const connectDevice = async () => {
    if (!('serial' in navigator)) {
      alert("Web Serial API not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    try {
      setIsConnecting(true);
      const selectedPort = await (navigator as any).serial.requestPort();
      await selectedPort.open({ baudRate: 115200 });
      setPort(selectedPort);

      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = selectedPort.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      setReader(reader);

      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        
        // Handle line by line
        if (buffer.includes('\n')) {
          const lines = buffer.split('\n');
          // Process all complete lines
          for (let i = 0; i < lines.length - 1; i++) {
            if (lines[i].trim()) parseSerialData(lines[i]);
          }
          buffer = lines[lines.length - 1];
        }
      }
    } catch (err) {
      console.error("Serial Connection Failed:", err);
      setIsConnecting(false);
    }
  };

  const disconnectDevice = async () => {
    if (reader) {
      await reader.cancel();
      setReader(null);
    }
    if (port) {
      await port.close();
      setPort(null);
    }
    setIsConnecting(false);
  };

  useEffect(() => {
    // REAL-TIME SYNC: Listen for actual hardware updates from Firestore
    const unsubscribe = api.subscribeToWorkers((updatedWorkers) => {
      setWorkers(updatedWorkers);
    });

    return () => unsubscribe();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Warning': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200 animate-pulse';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Real-Time Protection</h2>
          <p className="text-slate-500 text-sm font-medium italic">OLFU Valenzuela Campus • Bio-Metric Intelligence Stream</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={port ? disconnectDevice : connectDevice}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all ${
              port ? 'bg-green-600 text-white border-green-500' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            {port ? <ShieldCheck size={16} /> : <Radio size={16} />}
            {port ? 'NODE CONNECTED' : 'LINK BIO-BANDS'}
          </button>
          <button
            onClick={() => setShowHardwareGuide(!showHardwareGuide)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all ${
              showHardwareGuide ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            <Cpu size={16} /> SCHEMATIC
          </button>
          <div className="px-4 py-2.5 bg-green-50 text-green-700 rounded-xl border border-green-200 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
            <Activity size={14} className="animate-pulse" /> Live Telemetry Online
          </div>
        </div>
      </div>

      {showHardwareGuide && (
        <div className="bg-slate-900 rounded-2xl p-6 text-white border border-indigo-500/30 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <Cpu className="text-indigo-400" size={20} />
            <h3 className="font-black uppercase tracking-widest text-sm text-indigo-100">Bio-Metric Node V1.4 (Calibrated)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-[10px]">
             <div className="bg-white/5 p-4 rounded-xl border border-white/10">
               <p className="text-indigo-400 font-bold mb-2">I2C BUS MAP</p>
               <p>SDA: PIN 8 (ESP32-C3)</p>
               <p>SCL: PIN 9 (ESP32-C3)</p>
               <p className="text-slate-500 mt-2">// Wire colors: SCL=Yellow, SDA=Blue</p>
             </div>
             <div className="bg-white/5 p-4 rounded-xl border border-white/10">
               <p className="text-red-400 font-bold mb-2">SENSOR ARRAY</p>
               <p>BPM/SpO2: MAX30102 (Ox)</p>
               <p>TEMP: MAX30205 (Medical)</p>
               <p className="text-slate-500 mt-2">// Accuracy: +/- 0.1C (37-39C)</p>
             </div>
             <div className="bg-white/5 p-4 rounded-xl border border-white/10">
               <p className="text-orange-400 font-bold mb-2">SYSTEM INSTRUCTIONS</p>
               <p>1. Open Live Telemetry view</p>
               <p>2. Click "LINK BIO-BANDS"</p>
               <p>3. Select COM Port @ 9600 Baud</p>
             </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workers.map((worker) => (
          <div key={worker.id} className={`p-5 rounded-2xl border-2 bg-white transition-all ${
            worker.status === 'Critical' ? 'border-red-500 shadow-xl' : 
            worker.status === 'Warning' ? 'border-orange-300 shadow-sm' : 'border-slate-100'
          }`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black ${
                  worker.status === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                }`}>
                  {worker.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{worker.name}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{worker.role}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-[10px] font-black border ${getStatusColor(worker.status)}`}>
                {worker.status.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Heart</p>
                <p className={`text-lg font-black ${worker.vitals.heartRate > 110 ? 'text-orange-600' : 'text-slate-800'}`}>
                  {Math.round(worker.vitals.heartRate)} <span className="text-[8px] opacity-50">BPM</span>
                </p>
              </div>
              <div className="text-center border-l border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Temp</p>
                <p className={`text-lg font-black ${worker.vitals.bodyTemp > 38 ? 'text-red-600' : 'text-slate-800'}`}>
                  {worker.vitals.bodyTemp}°C
                </p>
              </div>
              <div className="text-center border-t border-slate-200 pt-3 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">SpO2</p>
                <p className={`text-lg font-black ${worker.vitals.oxygenLevel < 94 ? 'text-orange-600' : 'text-slate-800'}`}>
                  {worker.vitals.oxygenLevel}%
                </p>
              </div>
              <div className="text-center border-t border-l border-slate-200 pt-3 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Fatigue</p>
                <p className={`text-lg font-black ${worker.fatigueLevel > 70 ? 'text-red-600' : 'text-slate-800'}`}>
                  {worker.fatigueLevel}%
                </p>
              </div>
            </div>

            {/* Fatigue Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Physical Reserve</span>
                <span className="text-[10px] font-black text-slate-800">{100 - worker.fatigueLevel}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                 <div 
                  className={`h-full transition-all duration-1000 ${worker.fatigueLevel > 80 ? 'bg-red-500' : worker.fatigueLevel > 50 ? 'bg-orange-500' : 'bg-green-500'}`} 
                  style={{ width: `${100 - worker.fatigueLevel}%` }}
                 ></div>
              </div>
            </div>

            {worker.status === 'Critical' && (
              <button className="w-full mt-4 bg-red-600 text-white py-2.5 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-red-900/20">
                <Phone size={16} /> EMERGENCY DISPATCH
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SafetyMonitoring;
