import { MessageSquare, Star, Shield } from 'lucide-react';
import { usePerformanceData } from '../../hooks/usePerformanceData';

export function ReviewsTab() {
  const { data, isLoading } = usePerformanceData();
  const reviews = data?.reviews ?? [];

  if (isLoading) return <p className="text-sm text-gray-500">Loading reviews...</p>;

  return (
    <div className="space-y-6">
      {reviews.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
          <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No performance reviews yet.</p>
        </div>
      ) : (
        reviews.map(review => (
          <div key={review.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{review.period} Review</h4>
                  <p className="text-xs text-gray-500">{review.status}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-sm font-bold text-amber-900">{review.rating}/5</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{review.feedback}</p>
          </div>
        ))
      )}
    </div>
  );
}