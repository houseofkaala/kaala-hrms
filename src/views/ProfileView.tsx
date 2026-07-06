import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Phone, Building, Calendar, Award, MapPin, User } from 'lucide-react';
import { fetcher } from '../utils';

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  role: string;
  points: number;
  title?: string;
  joinDate?: string;
  emergencyContact?: string;
  address?: string;
  bankAccount?: string;
}

export function ProfileView() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', emergencyContact: '', address: '', bankAccount: '' });

  const { data: user, isLoading } = useQuery<ProfileUser>({
    queryKey: ['me'],
    queryFn: () => fetcher('/api/me'),
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        phone: user.phone || '',
        emergencyContact: user.emergencyContact || '',
        address: user.address || '',
        bankAccount: user.bankAccount || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    await fetcher('/api/me', { method: 'PATCH', body: JSON.stringify(form) });
    queryClient.invalidateQueries({ queryKey: ['me'] });
    setEditing(false);
  };

  if (isLoading || !user) {
    return <p className="text-gray-500 text-sm">Loading profile...</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">User Profile</h2>
        <p className="text-sm text-gray-500 mt-1">View and manage your personal information</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="flex items-start gap-6 mb-8">
          <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-2xl font-bold text-gray-600 uppercase">
            {user.name.charAt(0)}
          </div>
          <div>
            {editing ? (
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="text-2xl font-semibold border-b border-gray-300 outline-none bg-transparent" />
            ) : (
              <h3 className="text-2xl font-semibold text-gray-900">{user.name}</h3>
            )}
            <p className="text-sm text-gray-500 mt-1">{user.title || user.role}</p>
            <span className="inline-block mt-2 px-2.5 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold uppercase">{user.role}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field icon={Mail} label="Email" value={user.email} />
          <Field icon={Phone} label="Phone" value={editing ? undefined : (user.phone || 'Not set')} editing={editing} editValue={form.phone} onChange={v => setForm({ ...form, phone: v })} />
          <Field icon={Building} label="Department" value={user.department} />
          <Field icon={Award} label="Kaala Points" value={`${user.points} KP`} />
          <Field icon={User} label="Emergency Contact" value={editing ? undefined : (user.emergencyContact || 'Not set')} editing={editing} editValue={form.emergencyContact} onChange={v => setForm({ ...form, emergencyContact: v })} />
          <Field icon={MapPin} label="Address" value={editing ? undefined : (user.address || 'Not set')} editing={editing} editValue={form.address} onChange={v => setForm({ ...form, address: v })} />
          <Field icon={Building} label="Bank Account" value={editing ? undefined : (user.bankAccount || 'Not set')} editing={editing} editValue={form.bankAccount} onChange={v => setForm({ ...form, bankAccount: v })} />
          {user.joinDate && <Field icon={Calendar} label="Join Date" value={user.joinDate} />}
        </div>

        <div className="mt-6 flex gap-3">
          {editing ? (
            <>
              <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700">Save Changes</button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg">Cancel</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800">Edit Profile</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value, editing, editValue, onChange }: {
  icon: typeof Mail; label: string; value?: string; editing?: boolean; editValue?: string; onChange?: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
      <Icon className="w-4 h-4 text-gray-500" />
      <div className="flex-1">
        <p className="text-[10px] text-gray-400 uppercase font-semibold">{label}</p>
        {editing && onChange ? (
          <input value={editValue || ''} onChange={e => onChange(e.target.value)} className="mt-1 w-full border border-gray-200 rounded px-2 py-1 text-sm" />
        ) : (
          <p className="text-sm text-gray-900">{value}</p>
        )}
      </div>
    </div>
  );
}