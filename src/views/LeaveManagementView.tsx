import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fetcher, cn } from '../utils';
import { useRBACStore } from '../store';

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  employee?: { name: string };
}

const leaveSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  type: z.enum(['Sick Leave', 'Vacation', 'Personal']),
  reason: z.string().min(5, 'Please provide a valid reason'),
}).refine(d => d.endDate >= d.startDate, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
});
type LeaveFormValues = z.infer<typeof leaveSchema>;

export function LeaveManagementView() {
  const { currentUser, viewMode } = useRBACStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  const { data: requests = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['leave-requests'],
    queryFn: () => fetcher('/api/leave-requests'),
  });

  const { data: balance } = useQuery<{ annual: number; sick: number; used: number; sickUsed: number; sickRemaining: number; pending: number }>({
    queryKey: ['leave-balance'],
    queryFn: () => fetcher('/api/leave-balance'),
  });

  const remainingAnnual = (balance?.annual ?? 0) - (balance?.used ?? 0);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: { type: 'Vacation' },
  });

  const onSubmit = async (data: LeaveFormValues) => {
    setSubmitError('');
    try {
      await fetcher('/api/leave-requests', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      reset();
      setShowForm(false);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to submit leave request');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetcher(`/api/leave-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Leave Management</h2>
          <p className="text-sm text-gray-500 mt-1">Request time off and track leave balances</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); reset(); }}
          className="bg-gray-900 text-white px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-gray-800 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Request Time Off
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Annual Leave</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{remainingAnnual} <span className="text-sm font-normal text-gray-400">days</span></p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Sick Leave</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{(balance?.sickRemaining ?? (balance?.sick ?? 0) - (balance?.sickUsed ?? 0))} <span className="text-sm font-normal text-gray-400">days</span></p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pending Requests</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{balance?.pending ?? requests.filter(r => r.status === 'Pending').length}</p>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900">New Leave Request</h3>
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700">Start Date</label>
              <input type="date" {...register('startDate')} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              {errors.startDate && <p className="text-[10px] text-red-500">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">End Date</label>
              <input type="date" {...register('endDate')} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              {errors.endDate && <p className="text-[10px] text-red-500">{errors.endDate.message}</p>}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Type</label>
            <select {...register('type')} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="Sick Leave">Sick Leave</option>
              <option value="Vacation">Vacation</option>
              <option value="Personal">Personal</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Reason</label>
            <textarea {...register('reason')} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[80px]" placeholder="Details..." />
            {errors.reason && <p className="text-[10px] text-red-500">{errors.reason.message}</p>}
          </div>
          <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700">Submit Request</button>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Leave Requests
          </h3>
        </div>
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <p className="p-6 text-sm text-gray-500">Loading...</p>
          ) : requests.length === 0 ? (
            <p className="p-6 text-sm text-gray-400 text-center">No leave requests yet</p>
          ) : (
            requests.map(req => (
              <div key={req.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">
                    {req.type} ({req.days} {req.days === 1 ? 'day' : 'days'})
                    {isManager && viewMode === 'manager' && req.employee && (
                      <span className="text-gray-500 font-normal"> — {req.employee.name}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {req.startDate} to {req.endDate} · {req.reason}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'px-2.5 py-1 text-[10px] font-semibold uppercase rounded-md border',
                    req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    req.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                    'bg-amber-50 text-amber-600 border-amber-100',
                  )}>{req.status}</span>
                  {isManager && viewMode === 'manager' && req.status === 'Pending' && (
                    <>
                      <button onClick={() => updateStatus(req.id, 'Approved')} className="text-xs text-emerald-600 font-semibold hover:underline">Approve</button>
                      <button onClick={() => updateStatus(req.id, 'Rejected')} className="text-xs text-red-600 font-semibold hover:underline">Reject</button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}