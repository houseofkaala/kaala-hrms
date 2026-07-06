import { useQuery } from '@tanstack/react-query';
import { fetcher } from '../utils';

export interface PerformanceData {
  goals: { id: string; title: string; progress: number; target: number; quarter: string }[];
  reviews: { id: string; rating: number; feedback: string; period: string; status: string }[];
  skills: { id: string; name: string; level: number; maxLevel: number }[];
  productivity: { tasksCompleted: number; avgHours: number; qualityScore: number };
  teamStats: { directReports: number; pendingReviews: number } | null;
}

export function usePerformanceData() {
  return useQuery<PerformanceData>({
    queryKey: ['performance'],
    queryFn: () => fetcher('/api/performance'),
  });
}