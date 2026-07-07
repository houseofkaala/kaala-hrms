import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Phone, Building, Calendar, Award, MapPin, User, Camera, Trash2 } from 'lucide-react';
import { fetcher } from '../utils';
import { UserPortrait } from '../components/UserPortrait';
import { useRBACStore } from '../store';
import type { User } from '../types';

interface ProfileUser extends User {
  emergencyContact?: string;
  address?: string;
  bankAccount?: string;
}

export function ProfileView() {
  const queryClient = useQueryClient();
  const { setCurrentUser } = useRBACStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
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
    const updated = await fetcher<ProfileUser>('/api/me', { method: 'PATCH', body: JSON.stringify(form) });
    setCurrentUser(updated);
    queryClient.invalidateQueries({ queryKey: ['me'] });
    setEditing(false);
  };

  const handlePhoto = async (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Photo must be under 5MB.');
      return;
    }
    setPhotoError('');
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const data = result.split(',')[1];
          if (data) resolve(data);
          else reject(new Error('Could not read file'));
        };
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
      });

      const res = await fetcher<{ success: boolean; user: ProfileUser }>('/api/me/avatar', {
        method: 'POST',
        body: JSON.stringify({ contentBase64: base64, mimeType: file.type || 'image/jpeg' }),
      });
      setCurrentUser(res.user);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    if (!confirm('Remove your profile photo?')) return;
    const res = await fetcher<{ success: boolean; user: ProfileUser }>('/api/me/avatar', { method: 'DELETE' });
    setCurrentUser(res.user);
    queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  if (isLoading || !user) {
    return <p className="text-gray-500 text-sm">Loading profile...</p>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="studio-card px-8 py-6">
        <h2 className="font-display text-xl font-semibold text-maroon-950">User Profile</h2>
        <p className="text-sm text-maroon-500 mt-1">Your portrait and personal information</p>
      </div>

      <div className="studio-card overflow-hidden">
        <div className="flex flex-col md:flex-row gap-0">
          <div className="md:w-72 lg:w-80 bg-gradient-to-b from-maroon-900 to-maroon-950 p-8 flex flex-col items-center justify-center relative">
            <UserPortrait
              userId={user.id}
              name={user.name}
              hasProfileImage={user.hasProfileImage}
              size="hero"
              className="!w-48 !h-64 md:!w-52 md:!h-[17rem]"
            />
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="btn-primary text-xs py-2 px-4 flex items-center gap-2"
              >
                <Camera className="w-3.5 h-3.5" />
                {uploading ? 'Uploading…' : 'Change photo'}
              </button>
              {user.hasProfileImage && (
                <button
                  type="button"
                  onClick={removePhoto}
                  className="p-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
                  title="Remove photo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => handlePhoto(e.target.files?.[0] || null)}
            />
            {photoError && <p className="text-xs text-red-300 mt-3 text-center">{photoError}</p>}
            <p className="text-[10px] text-white/40 mt-4 text-center">JPG, PNG or WebP · max 5MB</p>
          </div>

          <div className="flex-1 p-8">
            <div className="mb-8">
              {editing ? (
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="font-display text-2xl font-semibold border-b border-maroon-200 outline-none bg-transparent w-full text-maroon-950"
                />
              ) : (
                <h3 className="font-display text-2xl font-semibold text-maroon-950">{user.name}</h3>
              )}
              <p className="text-sm text-maroon-500 mt-1">{user.title || user.role}</p>
              <span className="inline-block mt-2 studio-chip capitalize">{user.role}</span>
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
                  <button onClick={handleSave} className="btn-primary text-xs">Save Changes</button>
                  <button onClick={() => setEditing(false)} className="btn-secondary text-xs">Cancel</button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="btn-primary text-xs">Edit Profile</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value, editing, editValue, onChange }: {
  icon: typeof Mail; label: string; value?: string; editing?: boolean; editValue?: string; onChange?: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-4 bg-maroon-50/50 rounded-xl border border-maroon-100">
      <Icon className="w-4 h-4 text-maroon-400" />
      <div className="flex-1">
        <p className="text-[10px] text-maroon-400 uppercase font-semibold tracking-wider">{label}</p>
        {editing && onChange ? (
          <input value={editValue || ''} onChange={e => onChange(e.target.value)} className="mt-1 w-full border border-maroon-200 rounded-lg px-2 py-1 text-sm" />
        ) : (
          <p className="text-sm text-maroon-900">{value}</p>
        )}
      </div>
    </div>
  );
}