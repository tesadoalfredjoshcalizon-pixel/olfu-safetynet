import React, { useState } from 'react';
import { predictOperationalRisk } from '../services/gemini';
import { Worker, RiskPrediction } from '../types';
import { ShieldAlert, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface Props {
  workers: Worker[];
}

const RiskAssessment: React.FC<Props> = ({ workers }) => {
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<RiskPrediction | null>(null);

  const predefinedScenarios = [
    "Heavy rain forecast, outdoor rooftop maintenance, 2 staff on site.",
    "Major event in Fatima Gymnasium, crowd control required.",
    "Night shift, multiple staff reports high fatigue levels (>60%)."
  ];

  const handlePredict = async () => {
    if (!context.trim()) return;
    setLoading(true);
    setPrediction(null);
    try {
      const data = await predictOperationalRisk(context, workers);
      // Defensive: only set if data looks like a valid object
      if (data && typeof data === 'object') {
        setPrediction(data);
      } else {
        throw new Error("Invalid AI response");
      }
    } catch (error) {
      console.error("Risk Assessment error:", error);
      alert("AI was unable to generate a risk score. Using default campus protocols.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    const l = (level || '').toLowerCase();
    if (l.includes('low')) return 'text-green-600 bg-green-50 border-green-200';
    if (l.includes('medium')) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (l.includes('high')) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (l.includes('critical')) return 'text-red-600 bg-red-50 border-red-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Predictive Risk Assessment</h2>
        <p className="text-slate-500">AI-driven analysis for the OLFU Valenzuela Campus safety protocols.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">Operational Context</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="E.g., Heavy rain, roof repair, midnight shift..."
              className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none text-slate-700"
            />
            
            <div className="mt-4">
              <p className="text-xs text-slate-500 mb-2 font-semibold">Common OLFU Scenarios:</p>
              <div className="flex flex-wrap gap-2">
                {predefinedScenarios.map((scen, i) => (
                  <button 
                    key={i} 
                    onClick={() => setContext(scen)}
                    className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full transition-colors border border-slate-200 text-left"
                  >
                    {scen.substring(0, 35)}...
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handlePredict}
              disabled={loading || !context.trim()}
              className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <ShieldAlert size={20} />}
              {loading ? 'AI is Processing...' : 'Run Risk Assessment'}
            </button>
          </div>
        </div>

        <div className="space-y-6 min-h-[400px]">
          {!prediction && !loading && (
             <div className="h-full flex flex-col items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 p-8 text-center">
                <ShieldAlert size={48} className="mb-4 opacity-20" />
                <p className="font-medium">No Prediction Data</p>
                <p className="text-sm mt-1">Describe a campus scenario and run the assessment.</p>
             </div>
          )}

          {loading && (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
              <div className="w-16 h-16 border-4 border-green-100 border-t-green-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600 font-medium">Analyzing campus safety history...</p>
              <p className="text-xs text-slate-400 mt-2">Checking worker fatigue and environmental variables.</p>
            </div>
          )}

          {prediction && (
            <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-slate-100 animate-fade-in">
              <div className={`p-6 border-b-4 ${getRiskColor(prediction.riskLevel)}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Risk Severity</h3>
                    <p className="text-4xl font-black">{prediction.riskLevel || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Probability</p>
                    <p className="text-4xl font-black">{prediction.probability || 0}%</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-8">
                <div>
                  <h4 className="text-slate-900 font-bold mb-4 flex items-center gap-2">
                    <AlertTriangle size={20} className="text-orange-500"/> Critical Risk Factors
                  </h4>
                  <ul className="grid grid-cols-1 gap-3">
                    {/* Safeguard: use empty array if factors is missing */}
                    {(prediction.factors || []).length > 0 ? (prediction.factors || []).map((factor, i) => (
                      <li key={i} className="flex items-center gap-3 text-slate-700 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0"></div>
                        {factor}
                      </li>
                    )) : (
                      <li className="text-slate-400 text-sm italic">No specific risk factors flagged.</li>
                    )}
                  </ul>
                </div>

                <div>
                  <h4 className="text-slate-900 font-bold mb-4 flex items-center gap-2">
                    <CheckCircle size={20} className="text-green-600"/> Mitigation Strategies
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {(prediction.mitigationStrategies || []).length > 0 ? (prediction.mitigationStrategies || []).map((strat, i) => (
                      <div key={i} className="flex items-start gap-3 text-slate-700 text-sm bg-green-50/50 p-4 rounded-lg border border-green-100">
                        <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 flex-shrink-0">
                          {i + 1}
                        </div>
                        {strat}
                      </div>
                    )) : (
                      <p className="text-slate-400 text-sm italic">Standard safety guidelines apply.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiskAssessment;