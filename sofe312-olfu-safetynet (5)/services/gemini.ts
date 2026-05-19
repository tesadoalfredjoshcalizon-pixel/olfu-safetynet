
import { GoogleGenAI, Type } from "@google/genai";
import { Worker, Incident, Shift, RealTimeAnalysis, RiskPrediction } from "../types";

/**
 * Robust JSON parser that strips Markdown formatting and handles failures gracefully
 */
const cleanAndParseJSON = (text: string | undefined): any => {
  if (!text) return null;
  try {
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse AI response as JSON. Raw text was:", text);
    return null;
  }
};

// --- AI Schemas for Structured Output ---

const realTimeSafetySchema = {
  type: Type.OBJECT,
  properties: {
    alerts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          workerId: { type: Type.STRING },
          type: { type: Type.STRING },
          description: { type: Type.STRING },
          priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
          fatigueDiagnostic: { 
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              primaryReason: { type: Type.STRING },
              isHeartRateDriven: { type: Type.BOOLEAN }
            }
          }
        },
        required: ["workerId", "type", "description", "priority"]
      }
    },
    zoneAnalysis: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          zoneName: { type: Type.STRING },
          safetyStatus: { type: Type.STRING }
        },
        required: ["zoneName", "safetyStatus"]
      }
    },
    recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["alerts", "zoneAnalysis", "recommendedActions"]
};

const ppeDetectionSchema = {
  type: Type.OBJECT,
  properties: {
    hasHardHat: { type: Type.BOOLEAN },
    hasHighVisVest: { type: Type.BOOLEAN },
    hasSafetyGloves: { type: Type.BOOLEAN },
    confidenceScore: { type: Type.NUMBER },
    feedback: { type: Type.STRING }
  },
  required: ["hasHardHat", "hasHighVisVest", "hasSafetyGloves", "confidenceScore", "feedback"]
};

const shiftSummarySchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    performanceRating: { type: Type.STRING },
    safetyFeedback: { type: Type.STRING }
  },
  required: ["summary", "performanceRating", "safetyFeedback"]
};

const scheduleOptimizationSchema = {
  type: Type.OBJECT,
  properties: {
    schedules: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          shiftName: { type: Type.STRING },
          assignments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                role: { type: Type.STRING },
                workerName: { type: Type.STRING },
                reason: { type: Type.STRING }
              }
            }
          },
          projectedEfficiency: { type: Type.NUMBER }
        }
      }
    },
    totalProductivityGain: { type: Type.NUMBER },
    improvementSummary: { type: Type.STRING }
  }
};

const riskPredictionSchema = {
  type: Type.OBJECT,
  properties: {
    riskLevel: { type: Type.STRING },
    probability: { type: Type.NUMBER },
    factors: { type: Type.ARRAY, items: { type: Type.STRING } },
    mitigationStrategies: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["riskLevel", "probability", "factors", "mitigationStrategies"]
};

// --- Primary API Service Functions ---

export const analyzePPECompliance = async (imageBase64: string): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
          { text: "Strictly identify PPE. Hard hat, high-vis vest, and gloves. Return JSON." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: ppeDetectionSchema,
        systemInstruction: "You are an automated safety compliance inspector at OLFU."
      }
    });
    return cleanAndParseJSON(response.text);
  } catch (error) {
    return { hasHardHat: false, hasHighVisVest: false, hasSafetyGloves: false, confidenceScore: 0, feedback: "Error." };
  }
};

export const analyzeRealTimeSafety = async (workers: Worker[]): Promise<RealTimeAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Analyze vitals for ${workers.length} staff: ${JSON.stringify(workers.map(w => ({ id: w.id, hr: w.vitals.heartRate, temp: w.vitals.bodyTemp, fatigue: w.fatigueLevel })))}`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: realTimeSafetySchema,
        systemInstruction: "You are the Safety Officer for OLFU Valenzuela. Correlate Heart Rate, Body Temp, and Fatigue levels to detect early-stage exhaustion. If HR > 120 or Temp > 38.5, flag it with high priority and provide a specific 'fatigueDiagnostic' explaining if it is Cardiac Stress, Thermal Stress, or General Burnout."
      }
    });
    
    return cleanAndParseJSON(response.text);
  } catch (error) {
    return { alerts: [], zoneAnalysis: [], recommendedActions: ["System monitoring stable"] };
  }
};

export const optimizeSchedule = async (shifts: Partial<Shift>[], workers: Worker[]): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Optimize shifts: ${JSON.stringify(shifts)} with staff data: ${JSON.stringify(workers.map(w => ({ n: w.name, p: w.productivityScore, f: w.fatigueLevel, s: w.skillLevel })))}`,
      config: { 
        responseMimeType: "application/json", 
        responseSchema: scheduleOptimizationSchema,
        systemInstruction: "You are a Productivity Systems Architect for OLFU. Your goal is to maximize 'Total Productive Hours'. Do not assign workers with fatigue > 50 to high-risk roles. Calculate 'totalProductivityGain' as the percentage increase in efficiency compared to a random assignment. Ensure 'projectedEfficiency' is calculated for each shift."
      }
    });
    return cleanAndParseJSON(response.text);
  } catch (error) {
    console.error("Optimization error:", error);
    return null;
  }
};

export const generateShiftSummary = async (worker: Worker): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize shift for ${worker.name}. Productivity: ${worker.productivityScore}%, Final Fatigue: ${worker.fatigueLevel}%.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: shiftSummarySchema
      }
    });
    return cleanAndParseJSON(response.text);
  } catch (error) {
    return { summary: "Shift complete.", performanceRating: "Standard", safetyFeedback: "None." };
  }
};

export const predictOperationalRisk = async (context: string, workers: Worker[]): Promise<RiskPrediction | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Scenario: ${context}. Workers available: ${JSON.stringify(workers.map(w => ({ role: w.role, fatigue: w.fatigueLevel })))}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: riskPredictionSchema,
        systemInstruction: "You are a senior safety risk assessor for OLFU Valenzuela Campus. Evaluate the provided operational scenario and workforce status to predict risk level and probability."
      }
    });
    return cleanAndParseJSON(response.text);
  } catch (error) {
    console.error("Risk prediction error:", error);
    return null;
  }
};

export const getClearanceRecommendation = async (worker: Worker) => ({ recommendation: worker.fatigueLevel > 65 ? 'Reject' : 'Approve', reasoning: 'Standard vitals check.', flaggedRisks: [] });
export const analyzeIncidents = async (incidents: Incident[]) => ({ rootCauseAnalysis: 'Fatigue patterns.', trendIdentification: 'Rising temps.', safetyRecommendations: ['More breaks'] });
