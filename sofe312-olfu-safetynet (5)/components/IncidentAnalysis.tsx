import React, { useState, useEffect } from 'react';
import { Incident } from '../types';
import { analyzeIncidents } from '../services/gemini';
import { FileText, Search, Microscope, AlertOctagon, Lightbulb } from 'lucide-react';

interface Props {
  incidents: Incident[];
}

const IncidentAnalysis: React.FC<Props> = ({ incidents }) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Automatically run analysis on mount or when data changes
  useEffect(() => {
    const runAnalysis = async () => {
      setLoading(true);
      try {
        const result = await analyzeIncidents(incidents);
        setAnalysis(result);
      } catch (e) {
        console.error("Analysis failed");
      } finally {
        setLoading(false);
      }
    };
    runAnalysis();
  }, [incidents]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Incident Logs & Analysis</h2>
          <p className="text-slate-500">Historical review and AI-powered root cause detection.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident List */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <FileText size={18} /> Recent Logs
            </h3>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {incidents.map((incident) => (
              <div key={incident.id} className="p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    incident.severity === 'High' ? 'bg-red-100 text-red-700' :
                    incident.severity === 'Medium' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {incident.severity}
                  </span>
                  <span className="text-xs text-slate-400">{incident.date}</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{incident.type}</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{incident.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Analysis Panel */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
             <div className="h-full bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 p-8">
               <Microscope className="animate-bounce mb-4 text-green-600" size={32} />
               <p>Analyzing incident patterns...</p>
             </div>
          ) : analysis ? (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Microscope className="text-green-600" size={20} />
                  Root Cause Analysis
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {analysis.rootCauseAnalysis}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <AlertOctagon className="text-orange-500" size={20} />
                    Identified Trends
                  </h3>
                  <p className="text-sm text-slate-600">
                    {analysis.trendIdentification}
                  </p>
                </div>

                <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                  <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                    <Lightbulb className="text-green-600" size={20} />
                    Safety Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {analysis.safetyRecommendations?.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-green-800">
                        <span className="mt-1.5 w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400">
              Analysis unavailable
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentAnalysis;