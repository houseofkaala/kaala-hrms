import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ticket, Plus, Search, Filter, AlertCircle, Clock, CheckCircle2, Paperclip, MoreVertical } from 'lucide-react';
import { cn, fetcher } from '../utils';
import { useRBACStore } from '../store';

interface TicketRecord {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  date: string;
  user: string;
}

interface HelpDeskData {
  tickets: TicketRecord[];
  stats: { total: number; open: number; inProgress: number; resolved: number };
}

export function HelpDeskView() {
  const { currentUser, viewMode } = useRBACStore();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('IT Support');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');

  const isManager = (currentUser?.role === 'manager' || currentUser?.role === 'admin') && viewMode === 'manager';

  const { data } = useQuery<HelpDeskData>({
    queryKey: ['helpdesk-tickets'],
    queryFn: () => fetcher('/api/helpdesk/tickets'),
  });

  const tickets = data?.tickets ?? [];
  const stats = data?.stats ?? { total: 0, open: 0, inProgress: 0, resolved: 0 };

  const filteredTickets = tickets.filter(t => {
    const matchesFilter = filter === 'All' || t.status === filter;
    const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await fetcher('/api/helpdesk/tickets', {
      method: 'POST',
      body: JSON.stringify({ title, category, priority, description }),
    });
    qc.invalidateQueries({ queryKey: ['helpdesk-tickets'] });
    qc.invalidateQueries({ queryKey: ['notifications'] });
    setTitle(''); setDescription(''); setShowCreate(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await fetcher(`/api/helpdesk/tickets/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    qc.invalidateQueries({ queryKey: ['helpdesk-tickets'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Help Desk</h2>
          <p className="text-gray-500 mt-1">Raise and track internal queries and requests.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-sm"
        >
          {showCreate ? 'Cancel' : <><Plus className="w-4 h-4" /> Raise Ticket</>}
        </button>
      </div>

      {showCreate && (
        <div className="bg-white p-6 border border-gray-200 rounded-2xl shadow-sm mb-6 max-w-3xl">
          <h3 className="font-semibold text-gray-900 mb-6 text-lg">Create New Ticket</h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Ticket Title</label>
              <input required value={title} onChange={e => setTitle(e.target.value)} type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300" placeholder="Brief description of the issue" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300">
                  <option>IT Support</option>
                  <option>HR Queries</option>
                  <option>Finance</option>
                  <option>Facilities</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High (Urgent)</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Description</label>
              <textarea required value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 min-h-[120px] resize-none" placeholder="Provide detailed information about your request..." />
            </div>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-gray-50">
              <Paperclip className="w-5 h-5 text-gray-400 mb-2" />
              <p className="text-xs text-gray-500">Attachments coming soon</p>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm">
                Submit Ticket
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tickets', value: String(stats.total), icon: Ticket, color: 'text-gray-900', bg: 'bg-gray-100' },
          { label: 'Open', value: String(stats.open), icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'In Progress', value: String(stats.inProgress), icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Resolved', value: String(stats.resolved), icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm flex items-center gap-4">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', stat.bg)}>
              <stat.icon className={cn('w-6 h-6', stat.color)} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex gap-2">
            {['All', 'Open', 'In Progress', 'Resolved'].map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                  filter === tab ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Search tickets..." className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 w-64" />
            </div>
            <button className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 bg-white">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-[10px] uppercase font-semibold tracking-wider text-gray-400">
              <tr>
                <th className="px-6 py-4">Ticket ID</th>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Requester</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTickets.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-400">No tickets found</td></tr>
              ) : filteredTickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{ticket.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 font-medium">{ticket.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{ticket.category}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      'px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md border',
                      ticket.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' :
                      ticket.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-gray-50 text-gray-600 border-gray-200',
                    )}>{ticket.priority}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      'px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md border inline-flex items-center gap-1.5',
                      ticket.status === 'Open' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      ticket.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      'bg-emerald-50 text-emerald-600 border-emerald-100',
                    )}>
                      {ticket.status === 'Open' && <AlertCircle className="w-3 h-3" />}
                      {ticket.status === 'In Progress' && <Clock className="w-3 h-3" />}
                      {ticket.status === 'Resolved' && <CheckCircle2 className="w-3 h-3" />}
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{ticket.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{ticket.user}</td>
                  <td className="px-6 py-4 text-right">
                    {isManager && ticket.status !== 'Resolved' ? (
                      <button onClick={() => updateStatus(ticket.id, ticket.status === 'Open' ? 'In Progress' : 'Resolved')} className="text-xs text-emerald-600 font-semibold hover:underline mr-2">
                        {ticket.status === 'Open' ? 'Start' : 'Resolve'}
                      </button>
                    ) : (
                      <button className="text-gray-400 hover:text-gray-900 p-1 rounded-md hover:bg-gray-100">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}