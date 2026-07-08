import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, User } from 'lucide-react';
import { fetcher } from '../utils';
import { useRBACStore } from '../store';

interface FieldAgent {
  id: string;
  name: string;
  location: string;
  status: string;
  lat?: number;
  lng?: number;
}

const MAP_CENTER = { lat: 12.9716, lng: 77.5946 };

function agentPosition(agent: FieldAgent, index: number) {
  if (agent.lat && agent.lng) {
    const left = ((agent.lng - (MAP_CENTER.lng - 0.06)) / 0.12) * 100;
    const top = ((MAP_CENTER.lat + 0.05 - agent.lat) / 0.1) * 100;
    return {
      left: `${Math.min(92, Math.max(4, left))}%`,
      top: `${Math.min(88, Math.max(8, top))}%`,
    };
  }
  return { left: `${15 + index * 22}%`, top: `${25 + (index % 3) * 18}%` };
}

export function FieldView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const isSales = currentUser?.role === 'sales' || currentUser?.role === 'executive_assistant';
  const [showForm, setShowForm] = useState(false);
  const [checkInLoc, setCheckInLoc] = useState('');
  const [checkInNotes, setCheckInNotes] = useState('');
  const [form, setForm] = useState({ name: '', location: '', lat: '12.9716', lng: '77.5946', status: 'Active' });

  const { data } = useQuery<{ agents: FieldAgent[]; count: number }>({
    queryKey: ['field'],
    queryFn: () => fetcher('/api/field/agents'),
  });

  const agents = data?.agents || [];

  const handleCheckIn = async () => {
    if (!checkInLoc.trim()) return;
    let lat = 12.9716;
    let lng = 77.5946;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 }),
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch { /* use defaults */ }
    }
    await fetcher('/api/field/check-in', {
      method: 'POST',
      body: JSON.stringify({ location: checkInLoc.trim(), lat, lng, notes: checkInNotes }),
    });
    setCheckInLoc('');
    setCheckInNotes('');
    qc.invalidateQueries({ queryKey: ['field'] });
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    await fetcher('/api/field/agents', {
      method: 'POST',
      body: JSON.stringify({
        name: form.name.trim(),
        location: form.location.trim(),
        lat: Number(form.lat),
        lng: Number(form.lng),
        status: form.status,
      }),
    });
    setForm({ name: '', location: '', lat: '12.9716', lng: '77.5946', status: 'Active' });
    setShowForm(false);
    qc.invalidateQueries({ queryKey: ['field'] });
  };

  const tileUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${MAP_CENTER.lng - 0.06}%2C${MAP_CENTER.lat - 0.05}%2C${MAP_CENTER.lng + 0.06}%2C${MAP_CENTER.lat + 0.05}&layer=mapnik&marker=${MAP_CENTER.lat}%2C${MAP_CENTER.lng}`;

  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Field Operations</h2>
          <p className="text-sm text-gray-500 mt-1">Live tracking of {data?.count || 0} active field agents across Bangalore</p>
        </div>
        <div className="flex gap-2">
          {isSales && (
            <div className="flex gap-2 items-center">
              <input value={checkInLoc} onChange={e => setCheckInLoc(e.target.value)} placeholder="Visit location" className="input-field text-xs w-40" />
              <button onClick={handleCheckIn} className="btn-primary text-xs">Check in</button>
            </div>
          )}
          {isManager && (
            <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-xs">
              <Plus className="w-4 h-4" /> Add Agent
            </button>
          )}
        </div>
      </div>

      {showForm && isManager && (
        <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
          <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Agent name" className="input-field" />
          <input required value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Location label" className="input-field" />
          <input required type="number" step="0.0001" value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} placeholder="Latitude" className="input-field" />
          <input required type="number" step="0.0001" value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} placeholder="Longitude" className="input-field" />
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input-field md:col-span-2">
            <option value="Active">Active</option>
            <option value="Offline">Offline</option>
            <option value="On Break">On Break</option>
          </select>
          <button type="submit" className="btn-primary md:col-span-2">Save Agent</button>
        </form>
      )}

      <div className="h-[500px] bg-gray-100 rounded-2xl border border-gray-200 relative overflow-hidden shadow-inner">
        <iframe
          title="Field operations map"
          src={tileUrl}
          className="absolute inset-0 w-full h-full border-0 pointer-events-none opacity-90"
        />
        <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-sm border border-white/50 flex items-center gap-3">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-sm font-semibold text-gray-900">{data?.count || 0} Active Agents</span>
        </div>
        {agents.map((a, i) => {
          const pos = agentPosition(a, i);
          return (
            <div key={a.id} className="absolute z-10" style={pos}>
              <div className="relative group">
                <div className={`w-4 h-4 rounded-full border-2 border-white shadow-lg ${a.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <p className="text-xs font-semibold text-gray-900">{a.name}</p>
                  <p className="text-[10px] text-gray-500">{a.location}</p>
                  {a.lat && <p className="text-[10px] text-gray-400">{a.lat.toFixed(4)}, {a.lng!.toFixed(4)}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(a => (
          <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${a.status === 'Active' ? 'bg-emerald-50' : 'bg-gray-100'}`}>
              <User className={`w-5 h-5 ${a.status === 'Active' ? 'text-emerald-600' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">{a.name}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate"><MapPin className="w-3 h-3 shrink-0" />{a.location}</p>
            </div>
            <span className={`text-[10px] font-semibold uppercase shrink-0 ${a.status === 'Active' ? 'text-emerald-600' : 'text-gray-400'}`}>{a.status}</span>
          </div>
        ))}
        {agents.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white border border-gray-200 rounded-2xl">
            <MapPin className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No field agents registered yet</p>
            {isManager && <p className="text-xs mt-1">Add agents to start live tracking</p>}
          </div>
        )}
      </div>
    </div>
  );
}