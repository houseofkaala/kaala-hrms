import { useQuery } from '@tanstack/react-query';
import { fetcher } from '../utils';

export interface PerformanceBreakdown {
  attendance: number;
  taskDelivery: number;
  onTimeDelivery: number;
  goals: number;
  reviews: number;
  overduePenalty: number;
}

export interface PerformanceCounts {
  marketplaceCompleted: number;
  kanbanCompleted: number;
  kanbanOverdue: number;
  kanbanOnTime: number;
  kanbanOpen: number;
  projectCompleted: number;
  projectOverdue: number;
  daysPresent: number;
  avgHours: number;
  lateArrivals: number;
  goalsTotal: number;
  goalsAvgProgress: number;
  reviewsCount: number;
  avgReviewRating: number;
  onTimeRate: number;
}

export interface PerformanceMetrics {
  userId: string;
  name: string;
  department: string;
  score: number;
  grade: string;
  breakdown: PerformanceBreakdown;
  counts: PerformanceCounts;
  period: string;
}

export interface PerformanceData {
  goals: { id: string; title: string; progress: number; target: number; quarter: string }[];
  reviews: { id: string; rating: number; feedback: string; period: string; status: string }[];
  skills: { id: string; name: string; level: number; maxLevel: number }[];
  metrics: PerformanceMetrics | null;
  trend: { period: string; score: number; recordedAt: string }[];
  productivity: {
    tasksCompleted: number;
    marketplaceCompleted: number;
    kanbanCompleted: number;
    projectCompleted: number;
    kanbanOverdue: number;
    onTimeRate: number;
    avgHours: number;
    qualityScore: number;
    performanceScore: number;
    grade: string;
    breakdown?: PerformanceBreakdown;
  };
  teamStats: { directReports: number; pendingReviews: number; lowPerformers: number } | null;
}

export function usePerformanceData(period = '90d') {
  return useQuery<PerformanceData>({
    queryKey: ['performance', period],
    queryFn: () => fetcher(`/api/performance?period=${period}`),
  });
}