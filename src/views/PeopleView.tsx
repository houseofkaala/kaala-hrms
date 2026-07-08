import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, X, Mail, Phone, Folder, MessageSquare } from 'lucide-react';
import { cn, fetcher } from '../utils';
import type { User } from '../types';
import { useQuery } from '@tanstack/react-query';

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
