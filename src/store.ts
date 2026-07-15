import { create } from 'zustand';
import type { User } from './types';
import { getPortal, viewModeForPortal } from './portal';

interface RBACState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  viewMode: 'manager' | 'employee';
  setViewMode: (mode: 'manager' | 'employee') => void;
}

export const useRBACStore = create<RBACState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({
    currentUser: user,
    viewMode: user ? viewModeForPortal(getPortal()) : 'employee',
  }),
  viewMode: viewModeForPortal(getPortal()),
  setViewMode: (mode) => set({ viewMode: mode }),
}));

interface TimerState {
  activeTimers: Record<string, string>; // taskId -> startTime ISO string
  startTimer: (taskId: string) => void;
  stopTimer: (taskId: string) => number | null; // returns duration in ms
}

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  link?: string;
}

interface NotificationToastState {
  toasts: ToastNotification[];
  addToast: (toast: ToastNotification) => void;
  removeToast: (id: string) => void;
}

export const useNotificationToastStore = create<NotificationToastState>((set) => ({
  toasts: [],
  addToast: (toast) => set((state) => {
    if (state.toasts.some(t => t.id === toast.id)) return state;
    const next = [toast, ...state.toasts].slice(0, 4);
    return { toasts: next };
  }),
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id),
  })),
}));

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
