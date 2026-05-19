
import { 
  collection, 
  getDocs, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from './src/lib/firebase';
import { User, Worker, Shift, ShiftReport, Incident } from './types';
import { mockUsers, mockWorkers, mockIncidents } from './mockData';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const COLLECTIONS = {
  USERS: 'users',
  WORKERS: 'workers',
  INCIDENTS: 'incidents',
  REPORTS: 'shift_reports'
};

export const api = {
  async clearAllData() {
    // In a real Firebase app, we usually don't clear the whole DB from client
    // For this prototype, we'll just log that it's handled by Firebase now
    console.warn("clearAllData called: Data persistence is now managed by Firebase.");
  },

  async getUsers(): Promise<User[]> {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
      return snapshot.docs.map(doc => ({ ...doc.data() } as User));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.USERS);
      return [];
    }
  },

  async createUser(user: Partial<User>): Promise<User> {
    const id = user.id || `u${Date.now()}`;
    const newUser = { ...user, id } as User;
    try {
      await setDoc(doc(db, COLLECTIONS.USERS, id), newUser);
      return newUser;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.USERS}/${id}`);
      throw error;
    }
  },

  async getWorkers(): Promise<Worker[]> {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.WORKERS));
      return snapshot.docs.map(doc => ({ ...doc.data() } as Worker));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.WORKERS);
      return [];
    }
  },

  subscribeToWorkers(callback: (workers: Worker[]) => void) {
    const q = collection(db, COLLECTIONS.WORKERS);
    return onSnapshot(q, (snapshot) => {
      const workers = snapshot.docs.map(doc => ({ ...doc.data() } as Worker));
      callback(workers);
    }, (error) => {
      console.error("Firestore Subscribe Error:", error);
    });
  },

  async saveWorker(worker: Worker): Promise<Worker> {
    try {
      await setDoc(doc(db, COLLECTIONS.WORKERS, worker.id), worker);
      return worker;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.WORKERS}/${worker.id}`);
      throw error;
    }
  },

  async saveWorkers(workers: Worker[]): Promise<Worker[]> {
    try {
      for (const worker of workers) {
        await setDoc(doc(db, COLLECTIONS.WORKERS, worker.id), worker);
      }
      return workers;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.WORKERS);
      throw error;
    }
  },

  async getReports(): Promise<ShiftReport[]> {
    try {
      const q = query(collection(db, COLLECTIONS.REPORTS), orderBy('id', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data() } as ShiftReport));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.REPORTS);
      return [];
    }
  },

  async createReport(report: ShiftReport): Promise<ShiftReport> {
    try {
      await setDoc(doc(db, COLLECTIONS.REPORTS, report.id), report);
      return report;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.REPORTS}/${report.id}`);
      throw error;
    }
  },

  async deleteReport(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.REPORTS, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.REPORTS}/${id}`);
    }
  },

  async deleteUser(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.USERS, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.USERS}/${id}`);
    }
  },

  async getIncidents(): Promise<Incident[]> {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.INCIDENTS));
      return snapshot.docs.map(doc => ({ ...doc.data() } as Incident));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.INCIDENTS);
      return [];
    }
  }
};

