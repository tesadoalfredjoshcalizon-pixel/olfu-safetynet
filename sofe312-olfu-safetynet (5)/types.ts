
export enum SkillLevel {
  Junior = 'Junior',
  Mid = 'Mid',
  Senior = 'Senior',
  Expert = 'Expert'
}

export type UserRole = 'Admin' | 'SafetyOfficer' | 'Supervisor' | 'Staff';

export interface User {
  id: string;
  username: string;
  password?: string; // Optional password for authentication
  name: string;
  role: UserRole;
  avatar?: string;
  workerId?: string; // Link to worker profile if applicable
}

export type WorkerStatus = 'Active' | 'Warning' | 'Critical' | 'Offline';
export type SafetyClearanceStatus = 'Pending' | 'Cleared' | 'Rejected' | 'Deployed';

export interface Worker {
  id: string;
  name: string;
  role: string;
  skillLevel: SkillLevel;
  certifications: string[];
  productivityScore: number; // 0-100
  fatigueLevel: number; // 0-100 (Higher is more tired)
  lastIncidentDate?: string;
  
  // Real-time Monitoring Data
  currentLocation: string;
  assignedTime?: string; // e.g., "08:00 AM - 05:00 PM"
  deviceId?: string; // Connected wristband ID
  vitals: {
    heartRate: number; // bpm
    bodyTemp: number; // celsius
    oxygenLevel: number; // %
  };
  ppeCompliant: boolean;
  status: WorkerStatus;
  
  // Workflow Status
  safetyStatus: SafetyClearanceStatus;
  assignedShiftId?: string;
}

export interface Shift {
  id: string;
  name: string;
  time: string;
  requiredRoles: string[];
  assignedWorkers: Worker[];
  riskScore: number; // Predicted by AI
}

export interface ShiftReport {
  id: string;
  workerId: string;
  workerName: string;
  workerRole?: string; // Added for designation tracking
  date: string;
  time: string;
  shiftName: string;
  location: string;
  finalVitals: {
    hr: number;
    temp: number;
    spo2: number;
  };
  aiSummary?: string;
  performanceRating?: string;
  completionPhoto?: string; // Base64 work evidence photo
}

export interface Incident {
  id: string;
  date: string;
  type: 'Near Miss' | 'Injury' | 'Equipment Failure' | 'Protocol Violation';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  location: string;
}

export interface OptimizationResult {
  schedules: {
    shiftName: string;
    assignments: {
      role: string;
      workerName: string;
      reason: string;
    }[];
  }[];
  improvementSummary: string;
}

export interface RealTimeAnalysis {
  alerts: {
    workerId: string;
    type: string;
    description: string;
    priority: 'High' | 'Medium' | 'Low';
    fatigueDiagnostic?: {
      score: number;
      primaryReason: string;
      isHeartRateDriven: boolean;
    };
  }[];
  zoneAnalysis: {
    zoneName: string;
    safetyStatus: string;
  }[];
  recommendedActions: string[];
}

export interface SafetyChecklist {
  ppeCheck: boolean;
  trainingValid: boolean; // Optional: Medical/Specialized cert
  healthCheck: boolean;   // Mandatory: Vitals check
  siteInduction: boolean; // Mandatory: Site safety briefing
  equipmentSafety: boolean; // Mandatory: Tool inspection
}

// Add RiskPrediction interface for AI risk assessment
export interface RiskPrediction {
  riskLevel: string;
  probability: number;
  factors: string[];
  mitigationStrategies: string[];
}
