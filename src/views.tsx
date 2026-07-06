import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, Plus, Calendar, Clock,
  Users, FileText,
  X, Mail, Phone, Folder, MessageSquare, AlertCircle, CheckCircle2,
  ChevronLeft, ChevronRight, ArrowRight
} from 'lucide-react';
import { cn, fetcher } from './utils';
import type { User } from './types';
import { useQuery } from '@tanstack/react-query';
import { useRBACStore } from './store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function LeaderboardView({ users }: { users: User[] }) {
  const sorted = [...users].sort((a, b) => b.points - a.points);
  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl flex flex-col shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Points Leaderboard</h2>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {sorted.map((u, i) => (
            <div key={u.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-5">
                <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center font-medium text-gray-500 text-sm">
                  {i + 1}
                </div>
                <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 text-gray-600 flex items-center justify-center font-semibold text-lg uppercase">
                  {u.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{u.name}</h4>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">{u.department || 'General'} &bull; {u.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-200">
                <span className="font-semibold text-gray-900">{u.points}</span>
                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">KP</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface UserDetail extends User {
  employmentType?: string;
  emergencyContact?: string;
}

export function PeopleView() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => fetcher<User[]>('/api/users'),
  });

  const { data: userDetail } = useQuery<UserDetail>({
    queryKey: ['user-detail', selectedUser?.id],
    queryFn: () => fetcher<UserDetail>(`/api/users/${selectedUser!.id}`),
    enabled: !!selectedUser,
  });

  const detail = userDetail || selectedUser;

  const departments = ['All', ...Array.from(new Set(users.map(u => u.department || 'General')))];

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'All' || (u.department || 'General') === selectedDept;
    return matchesSearch && matchesDept;
  });

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading people directory...</div>;
  }

  return (
    <div className="relative flex gap-6">
      <div className={cn("space-y-6 flex-1 transition-all duration-300", selectedUser ? "lg:mr-[380px]" : "")}>
        <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">People Directory</h2>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search employees..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-gray-400" 
              />
            </div>
            <select 
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700 rounded-lg px-4 py-2 focus:outline-none cursor-pointer outline-none hover:bg-gray-100 transition-colors w-full sm:w-auto"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredUsers.length === 0 ? (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 bg-white border border-gray-200 rounded-2xl shadow-sm">
              <Users className="w-10 h-10 mb-4 text-gray-300" />
              <p className="text-sm font-medium">No employees found matching your criteria.</p>
            </div>
          ) : (
            filteredUsers.map(u => (
              <div 
                key={u.id} 
                onClick={() => setSelectedUser(u)}
                className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col shadow-sm hover:border-gray-400 hover:shadow-md transition-all group relative overflow-hidden cursor-pointer"
              >
                <div className="absolute top-3 right-3 flex items-center">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    u.status === 'Active' ? "bg-emerald-500" : 
                    u.status === 'On Leave' ? "bg-amber-500" : "bg-gray-400"
                  )} title={u.status || 'Offline'}></span>
                </div>
                <div className="flex flex-col items-center text-center mt-2">
                  <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 text-gray-600 flex items-center justify-center font-semibold text-lg mb-3 group-hover:scale-105 transition-transform uppercase">
                    {u.name.charAt(0)}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm mb-1 truncate w-full">{u.name}</p>
                  <p className="text-[10px] text-gray-500 font-medium mb-3 truncate w-full">{u.department || 'General'}</p>
                  
                  <div className="w-full flex items-center gap-2 mt-auto">
                    <span className="flex-1 px-2 py-1 bg-gray-50 border border-gray-100 text-gray-600 rounded text-[9px] uppercase tracking-wider font-semibold truncate">
                      {u.role}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/chat', { state: { userId: u.id } });
                      }}
                      className="p-1.5 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                      title="Quick Chat"
                    >
                      <MessageSquare className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Side Panel Overlay on Mobile */}
      {selectedUser && (
        <div 
          className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSelectedUser(null)}
        />
      )}

      {/* Side Panel */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-full sm:w-[380px] bg-white border-l border-gray-200 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
        selectedUser ? "translate-x-0" : "translate-x-full"
      )}>
        {selectedUser && (
           <div className="p-8 flex flex-col h-full overflow-y-auto">
             <div className="flex justify-between items-start mb-8">
               <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-200 text-gray-600 flex items-center justify-center font-semibold text-xl uppercase shadow-sm">
                 {selectedUser.name.charAt(0)}
               </div>
               <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                 <X className="w-5 h-5 text-gray-500" />
               </button>
             </div>
             
             <h2 className="text-2xl font-semibold text-gray-900 mb-1">{selectedUser.name}</h2>
             <p className="text-sm text-gray-500 font-medium mb-6">
               {selectedUser.department || 'General'} 
               <span className="mx-2">&bull;</span>
               <span className="uppercase tracking-wider text-[10px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md font-semibold">{selectedUser.role}</span>
             </p>

             <div className="flex items-center gap-2 mb-8 bg-gray-50 self-start px-3 py-1.5 rounded-lg border border-gray-100">
                <span className={cn(
                  "w-2.5 h-2.5 rounded-full shadow-sm",
                  selectedUser.status === 'Active' ? "bg-emerald-500" : 
                  selectedUser.status === 'On Leave' ? "bg-amber-500" : "bg-gray-400"
                )}></span>
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{selectedUser.status || 'Offline'}</span>
             </div>

             <div className="space-y-4 mb-8">
               <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Information</h3>
               {selectedUser.email && (
                 <div className="flex items-center gap-3 text-sm text-gray-700 font-medium bg-white border border-gray-100 p-3 rounded-xl shadow-sm">
                   <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                     <Mail className="w-4 h-4 text-gray-500" />
                   </div>
                   {selectedUser.email}
                 </div>
               )}
               {selectedUser.phone && (
                 <div className="flex items-center gap-3 text-sm text-gray-700 font-medium bg-white border border-gray-100 p-3 rounded-xl shadow-sm">
                   <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                     <Phone className="w-4 h-4 text-gray-500" />
                   </div>
                   {selectedUser.phone}
                 </div>
               )}
             </div>

             {selectedUser.projects && selectedUser.projects.length > 0 && (
               <div className="space-y-4 mb-8">
                 <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Projects</h3>
                 <div className="space-y-3">
                   {selectedUser.projects.map((proj, i) => (
                     <div key={i} className="flex items-center gap-3 bg-white border border-gray-100 p-3 rounded-xl shadow-sm hover:border-gray-200 transition-colors cursor-pointer group">
                       <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 group-hover:bg-gray-100 transition-colors">
                         <Folder className="w-4 h-4 text-gray-500" />
                       </div>
                       <span className="text-sm font-medium text-gray-700">{proj}</span>
                     </div>
                   ))}
                 </div>
               </div>
             )}

             <div className="space-y-4 mb-8">
               <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Employment Details</h3>
               <div className="bg-white border border-gray-100 rounded-xl shadow-sm divide-y divide-gray-50">
                 <div className="p-3 flex justify-between items-center text-sm">
                   <span className="text-gray-500">Date of Joining</span>
                   <span className="font-medium text-gray-900">{detail?.joinDate ? new Date(detail.joinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                 </div>
                 <div className="p-3 flex justify-between items-center text-sm">
                   <span className="text-gray-500">Employment Type</span>
                   <span className="font-medium text-gray-900">{detail?.employmentType || 'Full-Time'}</span>
                 </div>
                 <div className="p-3 flex justify-between items-center text-sm">
                   <span className="text-gray-500">Title</span>
                   <span className="font-medium text-gray-900">{detail?.title || '—'}</span>
                 </div>
               </div>
             </div>

             {detail?.emergencyContact && (
               <div className="space-y-4 mb-8">
                 <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Emergency Contact</h3>
                 <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
                   <p className="text-sm text-gray-700">{detail.emergencyContact}</p>
                 </div>
               </div>
             )}

             <div className="mt-auto pt-8">
               <button
                 onClick={() => navigate('/chat', { state: { userId: selectedUser!.id } })}
                 className="w-full bg-gray-900 text-white font-semibold text-sm py-3.5 rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
               >
                 Send Message
               </button>
             </div>
           </div>
        )}
      </div>
    </div>
  );
}

function AttendanceLogs({ viewMode, checkedIn }: { viewMode: string, checkedIn?: boolean }) {
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<'date' | 'status'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 5;
  const { currentUser } = useRBACStore();

  const { data: rawData = [] } = useQuery<any[]>({
    queryKey: ['attendance-logs', viewMode, currentUser?.id, checkedIn],
    queryFn: () => {
      const url = viewMode === 'manager' ? '/api/attendance/logs' : `/api/attendance/logs/${currentUser!.id}`;
      return fetcher<any[]>(url);
    },
    enabled: !!currentUser,
  });
  
  const sortedData = [...rawData].sort((a, b) => {
    if (sortField === 'date') {
      const aDate = new Date(a.date).getTime();
      const bDate = new Date(b.date).getTime();
      return sortDir === 'asc' ? aDate - bDate : bDate - aDate;
    } else {
      const cmp = a.status.localeCompare(b.status);
      return sortDir === 'asc' ? cmp : -cmp;
    }
  });

  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const currentData = sortedData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'late': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'ontime': return 'text-gray-600 bg-gray-100 border-gray-200';
      case 'absent': return 'text-red-600 bg-red-50 border-red-100';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const handleSort = (field: 'date' | 'status') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          {viewMode === 'manager' ? 'Team Attendance Logs' : 'My Recent Logs'}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600 whitespace-nowrap">
          <thead className="bg-gray-50 text-[10px] uppercase font-semibold tracking-wider text-gray-400">
            <tr>
              {viewMode === 'manager' && <th className="px-5 py-3">Employee</th>}
              <th className="px-5 py-3 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('date')}>
                Date {sortField === 'date' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-5 py-3">Clock In</th>
              <th className="px-5 py-3">Clock Out</th>
              <th className="px-5 py-3 text-right">Total Hours</th>
              <th className="px-5 py-3 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('status')}>
                Status {sortField === 'status' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentData.map(log => (
              <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                {viewMode === 'manager' && (
                  <td className="px-5 py-3 font-medium text-gray-900">{log.name}</td>
                )}
                <td className="px-5 py-3">{log.date}</td>
                <td className="px-5 py-3 font-medium text-gray-900">
                  {log.rawClockIn ? new Date(log.rawClockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : log.in}
                </td>
                <td className="px-5 py-3 font-medium text-gray-900">
                  {log.rawClockOut ? new Date(log.rawClockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : log.out}
                </td>
                <td className="px-5 py-3 text-right font-semibold text-gray-900">{log.total}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-center">
                    <span className={cn("px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold min-w-[70px] text-center border", getStatusColor(log.statusType))}>
                      {log.status}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
        <span className="text-xs font-medium text-gray-500">
          Showing {sortedData.length === 0 ? 0 : (page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, sortedData.length)} of {sortedData.length} logs
        </span>
        <div className="flex gap-1">
          <button 
            disabled={page === 1} 
            onClick={() => setPage(page - 1)}
            className="p-1 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors bg-white shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            disabled={page === totalPages} 
            onClick={() => setPage(page + 1)}
            className="p-1 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors bg-white shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function AttendanceSummary() {
  const { data: summary } = useQuery<{ chart: { day: string; hours: number }[]; onTime: number; late: number }>({
    queryKey: ['attendance-summary'],
    queryFn: () => fetcher('/api/attendance/summary'),
  });

  const chartData = summary?.chart ?? [];

  return (
    <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Weekly Trends</h3>
      
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <Tooltip 
              cursor={{ fill: '#f9fafb' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
            />
            <Bar dataKey="hours" name="Hours Worked" fill="#111827" radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium mb-1">On Time</p>
          <p className="text-xl font-semibold text-gray-900">{summary?.onTime ?? 0} <span className="text-sm font-normal text-gray-400">days</span></p>
        </div>
        <div className="flex-1 bg-amber-50 rounded-xl p-4 border border-amber-100">
          <p className="text-xs text-amber-600 font-medium mb-1">Late</p>
          <p className="text-xl font-semibold text-amber-900">{summary?.late ?? 0} <span className="text-sm font-normal text-amber-600/70">days</span></p>
        </div>
      </div>
    </div>
  );
}

function LeaveQuickView() {
  const { data: balance } = useQuery<{ annual: number; sick: number; used: number; pending: number }>({
    queryKey: ['leave-balance'],
    queryFn: () => fetcher('/api/leave-balance'),
  });

  const { data: requests = [] } = useQuery<{ id: string; type: string; days: number; startDate: string; endDate: string; status: string }[]>({
    queryKey: ['leave-requests'],
    queryFn: () => fetcher('/api/leave-requests'),
  });

  const remaining = (balance?.annual ?? 0) - (balance?.used ?? 0);

  return (
    <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Leave Balance</h3>
        <Link to="/leave" className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1">
          Manage <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <p className="text-[10px] text-gray-500 uppercase">Remaining</p>
          <p className="text-lg font-bold text-gray-900">{remaining} <span className="text-xs font-normal text-gray-400">days</span></p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
          <p className="text-[10px] text-amber-600 uppercase">Pending</p>
          <p className="text-lg font-bold text-amber-900">{balance?.pending ?? 0}</p>
        </div>
      </div>
      <div className="space-y-2">
        {requests.slice(0, 3).map(req => (
          <div key={req.id} className="flex items-center justify-between p-2 border border-gray-100 bg-white rounded-lg text-xs">
            <span className="font-medium text-gray-900">{req.type} ({req.days}d)</span>
            <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold uppercase', req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600')}>{req.status}</span>
          </div>
        ))}
        {requests.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No leave requests</p>}
      </div>
    </div>
  );
}

import { AttendanceRegularization, ShiftRequests, OTDashboard, RemoteWorkRequests, BiometricDevices, AttendancePolicies } from './views/AttendanceEnhancements';

function AttendanceClock({ checkedIn, onToggle, isLoading }: { checkedIn: boolean, onToggle: () => void, isLoading?: boolean }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white p-5 border border-gray-200 rounded-2xl flex flex-col items-center justify-center shadow-sm text-center relative overflow-hidden">
      {/* Animated background when checked in */}
      {checkedIn && (
        <div className="absolute inset-0 bg-emerald-50 opacity-50 z-0"></div>
      )}
      
      <div className="relative z-10 w-full flex flex-col items-center">
        <div className={cn(
          "w-24 h-24 rounded-full border-4 shadow-sm flex items-center justify-center mb-4 transition-colors duration-500",
          checkedIn ? "border-emerald-100 bg-emerald-50" : "border-gray-50 bg-white"
        )}>
          <Clock className={cn(
            "w-8 h-8 transition-colors duration-500",
            checkedIn ? "text-emerald-500" : "text-gray-300"
          )} />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-1 tracking-tight tabular-nums">{formatTime(time)}</h2>
        <p className="text-xs text-gray-500 font-medium mb-2">{formatDate(time)}</p>
        
        <div className="mb-6 flex items-center gap-2">
          <span className={cn(
            "w-2 h-2 rounded-full",
            checkedIn ? "bg-emerald-500" : "bg-gray-300"
          )}></span>
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            {checkedIn ? "Working" : "Off Duty"}
          </span>
        </div>

        <button 
          onClick={onToggle}
          disabled={isLoading}
          className={cn(
            "w-full py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm",
            checkedIn ? "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50" : "bg-gray-900 text-white hover:bg-gray-800",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          {isLoading ? 'Processing...' : (checkedIn ? 'Check Out' : 'Check In')}
        </button>
      </div>
    </div>
  );
}

export function AttendanceView() {
  const { viewMode, currentUser, setCurrentUser } = useRBACStore();
  const [checkedIn, setCheckedIn] = useState(currentUser?.status === 'Active');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setCheckedIn(currentUser.status === 'Active');
    }
  }, [currentUser]);

  const handleToggleAttendance = async () => {
    try {
      if (currentUser) {
        setIsLoading(true);
        const res = await fetcher<{ success: boolean; checkedIn: boolean; user: any }>('/api/attendance/toggle', {
          method: 'POST',
        });
        
        if (res.success) {
          setCheckedIn(res.checkedIn);
          setCurrentUser(res.user);
          setToastMessage(res.checkedIn ? 'Successfully clocked in!' : 'Successfully clocked out!');
        } else {
          setToastMessage('Failed to update attendance status.');
        }
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (e) {
      setToastMessage('Failed to update attendance status.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex-1 min-w-0">
      {toastMessage && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 z-50 transition-all">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-2 gap-4 items-start">
        <div className="xl:col-span-1 lg:col-span-1 space-y-4 min-w-0">
          <AttendanceClock checkedIn={checkedIn} onToggle={handleToggleAttendance} isLoading={isLoading} />
          <AttendanceSummary />
          <LeaveQuickView />
        </div>
        
        <div className="xl:col-span-2 lg:col-span-1 space-y-4 min-w-0 flex-1">
          <AttendanceLogs viewMode={viewMode} checkedIn={checkedIn} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <OTDashboard />
            <ShiftRequests />
            <AttendanceRegularization />
            <RemoteWorkRequests />
            {viewMode === 'manager' && (
              <>
                <BiometricDevices />
                <AttendancePolicies />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { RecruitView } from './views/RecruitView';
export { PayrollView } from './views/PayrollView';
export { AssetsView } from './views/AssetsView';
export { ProjectsView } from './views/ProjectsView';
export { TasksView } from './views/TasksView';
export { LearningView } from './views/LearningView';
export { ChatViewWired as ChatView } from './views/ChatViewWired';
export { SurveyView } from './views/SurveyView';
export { FieldView } from './views/FieldView';
export { FinanceView } from './views/FinanceView';
export { AIViewWired as AIView } from './views/AIViewWired';
export { PerformanceView } from './views/Performance';
