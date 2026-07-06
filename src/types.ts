export interface User {
  id: string;
  name: string;
  points: number;
  role: 'employee' | 'manager' | 'admin';
  department: string;
  status?: string;
  email?: string;
  phone?: string;
  projects?: string[];
  title?: string;
  joinDate?: string;
}

export interface Task {
  id: string;
  title: string;
  ownerId: string;
  status: 'pending' | 'marketplace' | 'claimed' | 'in_progress' | 'under_review' | 'completed' | 'failed';
  timeStarted?: string;
  timeSpent?: number;
  claimedById?: string;
  value: number; 
  deadline: string;
  referenceLink?: string;
  category?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  timestamp: string;
}

