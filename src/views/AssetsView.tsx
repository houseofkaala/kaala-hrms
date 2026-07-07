import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Monitor, Users, XCircle, UserPlus } from 'lucide-react';
import { cn, fetcher } from '../utils';
import { useRBACStore } from '../store';

interface Asset {
  id: string;
  name: string;
  status: string;
  user?: string | null;
}

export function AssetsView() {
  const { currentUser } = useRBACStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignId, setAssignId] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [newAssetName, setNewAssetName] = useState('');
  const qc = useQueryClient();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  const { data: users = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['users-list'],
    queryFn: () => fetcher('/api/users'),
    enabled: isManager,
  });

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['assets'],
    queryFn: () => fetcher('/api/assets'),
  });

  const handleAddAsset = async (e: FormEvent) => {
    e.preventDefault();
    if (!newAssetName) return;
    await fetcher('/api/assets', {
      method: 'POST',
      body: JSON.stringify({ name: newAssetName }),
    });
    setNewAssetName('');
    setIsModalOpen(false);
    qc.invalidateQueries({ queryKey: ['assets'] });
  };

  return (
    <div className="space-y-6">
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-semibold text-gray-900">Add Asset</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddAsset} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Asset Name</label>
                <input required autoFocus value={newAssetName} onChange={e => setNewAssetName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" placeholder="e.g. MacBook Pro M3" />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors shadow-sm">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Assets</h2>
          <p className="text-sm text-gray-500 mt-1">{isManager ? 'Manage company equipment' : 'Equipment assigned to you'}</p>
        </div>
        {isManager && (
          <button onClick={() => setIsModalOpen(true)} className="bg-gray-900 text-white px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-gray-800 shadow-sm">
            <Plus className="w-4 h-4" /> Add Asset
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {assets.map(asset => (
          <div key={asset.id} className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-4 shadow-sm hover:border-gray-300 transition-colors">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500">
                <Monitor className="w-5 h-5" />
              </div>
              <span className={cn(
                'px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider',
                asset.status === 'Assigned' ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-600 border border-emerald-100',
              )}>
                {asset.status}
              </span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{asset.name}</h4>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{asset.id}</p>
            </div>
            {asset.user && (
              <div className="pt-4 border-t border-gray-100 mt-2">
                <p className="text-sm text-gray-600 flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" /> {asset.user}</p>
              </div>
            )}
            {isManager && (
              <div className="pt-2">
                {assignId === asset.id ? (
                  <div className="flex gap-2">
                    <select value={assignUserId} onChange={e => setAssignUserId(e.target.value)} className="flex-1 text-xs border border-gray-200 rounded px-2 py-1">
                      <option value="">Select employee</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <button onClick={async () => {
                      await fetcher(`/api/assets/${asset.id}/assign`, { method: 'PATCH', body: JSON.stringify({ userId: assignUserId }) });
                      qc.invalidateQueries({ queryKey: ['assets'] });
                      setAssignId(null);
                    }} className="text-xs text-emerald-600 font-semibold">Assign</button>
                  </div>
                ) : (
                  <button onClick={() => setAssignId(asset.id)} className="text-xs text-gray-600 font-semibold flex items-center gap-1 hover:underline"><UserPlus className="w-3 h-3" /> Assign</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}