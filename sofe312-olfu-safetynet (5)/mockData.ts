
import { Worker, Incident, Shift, SkillLevel, User } from './types';

// Staff List:
// 1. Ethan Cloa
// 2. Tristan Cruz (Updated)
// 3. Basti Amizola
// 4. Lance Talampas
// 5. Josh Tesado (Updated Supervisor)
// 6. Ranz Sarabia
// 7. Delaney Ame
// 8. Joshua Asores
// 9. Dave Olile
// 10. Vincent Cenon
// 11. Marc Ayapana

export const mockUsers: User[] = [
  { id: 'u1', username: 'admin', name: 'System Administrator', role: 'Admin' },
  { id: 'u1-2', username: 'admin2', name: 'Secondary Administrator', role: 'Admin' },
  { id: 'u2', username: 'delaney', name: 'Delaney Ame', role: 'SafetyOfficer', workerId: '7' },
  { id: 'u3', username: 'josh', name: 'Josh Tesado', role: 'Supervisor', workerId: '5' },
  // Staff Accounts
  { id: 'u4', username: 'ethan', name: 'Ethan Cloa', role: 'Staff', workerId: '1' },
  { id: 'u5', username: 'tristan', name: 'Tristan Cruz', role: 'Staff', workerId: '2' },
  { id: 'u6', username: 'basti', name: 'Basti Amizola', role: 'Staff', workerId: '3' },
  { id: 'u7', username: 'lance', name: 'Lance Talampas', role: 'Staff', workerId: '4' },
  { id: 'u8', username: 'ranz', name: 'Ranz Sarabia', role: 'Staff', workerId: '6' },
  { id: 'u9', username: 'joshua', name: 'Joshua Asores', role: 'Staff', workerId: '8' },
  { id: 'u10', username: 'dave', name: 'Dave Olile', role: 'Staff', workerId: '9' },
  { id: 'u11', username: 'vincent', name: 'Vincent Cenon', role: 'Staff', workerId: '10' },
  { id: 'u12', username: 'marc', name: 'Marc Ayapana', role: 'Staff', workerId: '11' },
];

export const mockWorkers: Worker[] = [
  { 
    id: '1', 
    name: 'Ethan Cloa', 
    role: 'HVAC Specialist', 
    skillLevel: SkillLevel.Expert, 
    certifications: ['Heavy Machinery', 'HVAC Lvl 3'], 
    productivityScore: 92, 
    fatigueLevel: 0,
    currentLocation: 'RISE Tower (Headquarters)',
    vitals: { heartRate: 0, bodyTemp: 0, oxygenLevel: 0 },
    ppeCompliant: true,
    status: 'Active',
    safetyStatus: 'Pending'
  },
  { 
    id: '2', 
    name: 'Tristan Cruz', 
    role: 'Senior Electrician', 
    skillLevel: SkillLevel.Senior, 
    certifications: ['Electrical', 'High Voltage'], 
    productivityScore: 88, 
    fatigueLevel: 0,
    currentLocation: 'Carlo Acutis Building',
    vitals: { heartRate: 0, bodyTemp: 0, oxygenLevel: 0 },
    ppeCompliant: true,
    status: 'Active',
    safetyStatus: 'Cleared'
  },
  { 
    id: '3', 
    name: 'Basti Amizola', 
    role: 'Sanitation Lead', 
    skillLevel: SkillLevel.Junior, 
    certifications: ['HazMat Handling'], 
    productivityScore: 75, 
    fatigueLevel: 0,
    currentLocation: 'Tamaraw Hills Campus (SBB Building)',
    vitals: { heartRate: 0, bodyTemp: 0, oxygenLevel: 0 },
    ppeCompliant: false,
    status: 'Active',
    safetyStatus: 'Rejected'
  },
  { 
    id: '4', 
    name: 'Lance Talampas', 
    role: 'Facility Maintenance Lead', 
    skillLevel: SkillLevel.Mid, 
    certifications: ['Structural Integrity'], 
    productivityScore: 81, 
    fatigueLevel: 0,
    currentLocation: 'College of Medicine Building',
    vitals: { heartRate: 0, bodyTemp: 0, oxygenLevel: 0 },
    ppeCompliant: true,
    status: 'Active',
    safetyStatus: 'Pending'
  },
  { 
    id: '5', 
    name: 'Josh Tesado', 
    role: 'Supervisor & Logistics Manager', 
    skillLevel: SkillLevel.Senior, 
    certifications: ['Supply Chain', 'Operations'], 
    productivityScore: 95, 
    fatigueLevel: 0,
    currentLocation: 'RISE Tower (Headquarters)',
    vitals: { heartRate: 0, bodyTemp: 0, oxygenLevel: 0 },
    ppeCompliant: true,
    status: 'Active',
    safetyStatus: 'Deployed'
  },
  { 
    id: '6', 
    name: 'Ranz Sarabia', 
    role: 'Landscape Specialist', 
    skillLevel: SkillLevel.Mid, 
    certifications: ['Horticulture'], 
    productivityScore: 80, 
    fatigueLevel: 0,
    currentLocation: 'Dambana Area (National Shrine)',
    vitals: { heartRate: 0, bodyTemp: 0, oxygenLevel: 0 },
    ppeCompliant: true,
    status: 'Active',
    safetyStatus: 'Rejected'
  },
  { 
    id: '7', 
    name: 'Delaney Ame', 
    role: 'Safety Officer', 
    skillLevel: SkillLevel.Senior, 
    certifications: ['Data Safety', 'OSHA Certified'], 
    productivityScore: 94, 
    fatigueLevel: 0,
    currentLocation: 'RISE Tower (Headquarters)',
    vitals: { heartRate: 0, bodyTemp: 0, oxygenLevel: 0 },
    ppeCompliant: true,
    status: 'Active',
    safetyStatus: 'Cleared'
  },
  { 
    id: '8', 
    name: 'Joshua Asores', 
    role: 'Security Operations Lead', 
    skillLevel: SkillLevel.Expert, 
    certifications: ['Site Security', 'Crisis Mgmt'], 
    productivityScore: 98, 
    fatigueLevel: 0,
    currentLocation: 'Fatima University Medical Center (FUMC)',
    vitals: { heartRate: 0, bodyTemp: 0, oxygenLevel: 0 },
    ppeCompliant: true,
    status: 'Active',
    safetyStatus: 'Deployed'
  },
  { 
    id: '9', 
    name: 'Dave Olile', 
    role: 'Master Plumber', 
    skillLevel: SkillLevel.Senior, 
    certifications: ['Plumbing', 'Pipefitting'], 
    productivityScore: 85, 
    fatigueLevel: 0,
    currentLocation: 'St. Martin de Porres Building',
    vitals: { heartRate: 0, bodyTemp: 0, oxygenLevel: 0 },
    ppeCompliant: true,
    status: 'Active',
    safetyStatus: 'Pending'
  },
  { 
    id: '10', 
    name: 'Vincent Cenon', 
    role: 'Fire Safety Technician', 
    skillLevel: SkillLevel.Mid, 
    certifications: ['Fire Systems', 'Electrical'], 
    productivityScore: 78, 
    fatigueLevel: 0,
    currentLocation: 'OLFU Galleria/CCJ Building',
    vitals: { heartRate: 0, bodyTemp: 0, oxygenLevel: 0 },
    ppeCompliant: true,
    status: 'Active',
    safetyStatus: 'Cleared'
  },
  { 
    id: '11', 
    name: 'Marc Ayapana', 
    role: 'Heavy Equipment Operator', 
    skillLevel: SkillLevel.Expert, 
    certifications: ['Heavy Machinery', 'Forklift'], 
    productivityScore: 90, 
    fatigueLevel: 0,
    currentLocation: 'Tamaraw Hills Campus (SBB Building)',
    vitals: { heartRate: 0, bodyTemp: 0, oxygenLevel: 0 },
    ppeCompliant: true,
    status: 'Active',
    safetyStatus: 'Pending'
  },
];

export const mockIncidents: Incident[] = [
  { id: 'i1', date: '2023-10-15', type: 'Near Miss', severity: 'Medium', description: 'Ladder slip in CAS Library renovation zone.', location: 'Carlo Acutis Building' },
  { id: 'i2', date: '2023-10-22', type: 'Equipment Failure', severity: 'High', description: 'Pressure washer malfunction caused minor laceration.', location: 'Main Quadrangle' },
  { id: 'i3', date: '2023-11-05', type: 'Protocol Violation', severity: 'Low', description: 'Staff entered chemical storage without mask.', location: 'RISE Tower (Headquarters)' },
  { id: 'i4', date: '2023-11-12', type: 'Injury', severity: 'Low', description: 'Minor slip on wet floor during mopping.', location: 'FUMC Cafeteria' },
  { id: 'i5', date: '2023-11-20', type: 'Near Miss', severity: 'High', description: 'Falling debris from roof maintenance narrowly missed bystander.', location: 'St. Martin de Porres Building' },
];

export const mockShifts: Partial<Shift>[] = [
  { name: 'Morning Ops (RISE)', requiredRoles: ['Facility Maintenance Lead', 'Master Plumber', 'Senior Electrician', 'Sanitation Lead', 'Sanitation Lead'] },
  { name: 'Afternoon Ops (FUMC)', requiredRoles: ['HVAC Specialist', 'Fire Safety Technician', 'Sanitation Lead', 'Security Operations Lead'] },
  { name: 'Night Watch (Dambana Area)', requiredRoles: ['Facility Maintenance Lead', 'Security Operations Lead', 'Sanitation Lead'] },
];
