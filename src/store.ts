import { create } from 'zustand';
import type { User } from './types';

interface RBACState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  viewMode: 'manager' | 'employee';
  setViewMode: (mode: 'manager' | 'employee') => void;
}

export const useRBACStore = create<RBACState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set((state) => ({ 
    currentUser: user,
    viewMode: user.role === 'admin' || user.role === 'manager' ? 'manager' : 'employee' 
  })),
  viewMode: 'employee',
  setViewMode: (mode) => set({ viewMode: mode }),
}));

interface TimerState {
  activeTimers: Record<string, string>; // taskId -> startTime ISO string
  startTimer: (taskId: string) => void;
  stopTimer: (taskId: string) => number | null; // returns duration in ms
}

export const useTimerStore = create<TimerState>((set, get) => ({
  activeTimers: {},
  startTimer: (taskId: string) => set((state) => ({
    activeTimers: {
      ...state.activeTimers,
      [taskId]: new Date().toISOString()
    }
  })),
  stopTimer: (taskId: string) => {
    const startTime = get().activeTimers[taskId];
    if (!startTime) return null;
    const duration = new Date().getTime() - new Date(startTime).getTime();
    set((state) => {
      const newTimers = { ...state.activeTimers };
      delete newTimers[taskId];
      return { activeTimers: newTimers };
    });
    return duration;
  }
}));
