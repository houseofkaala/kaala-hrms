import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Upload, Trash2, Download, PenLine } from 'lucide-react';
import { fetcher } from '../utils';
import { getToken } from '../auth';
import { useRBACStore } from '../store';
import { SignaturePad } from '../components/SignaturePad';

interface Document {
  id: string;
  name: string;
  category: string;
  uploadedAt: string;
  size: string;
  storageKey?: string;
}

interface SignatureRequest {
  id: string; documentId: string; documentName: string; title: string; status: string; createdAt: string;
}

export function DocumentsView() {
  const { currentUser } = useRBACStore();
  const queryClient = useQueryClient();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const [showForm, setShowForm] = useState(false);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [fileSize, setFileSize] = useState('');
  const [fileData, setFileData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: docs = [], isLoading } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: () => fetcher('/api/documents'),
  });

  const { data: signatures = [] } = useQuery<SignatureRequest[]>({
    queryKey: ['signatures'],
    queryFn: () => fetcher('/api/signatures'),
  });

  const pendingSigs = signatures.filter(s => s.status === 'pending');
  const submitSignature = async () => {
    if (!signingId || !signatureData) return;
    await fetcher(`/api/signatures/${signingId}/sign`, { method: 'POST', body: JSON.stringify({ signatureData }) });
    setSigningId(null);
    setSignatureData('');
    queryClient.invalidateQueries({ queryKey: ['signatures'] });
  };

  const requestSignature = async (docId: string, docName: string) => {
    await fetcher(`/api/documents/${docId}/request-signature`, {
      method: 'POST',
      body: JSON.stringify({ title: `Sign: ${docName}` }),
    });
    queryClient.invalidateQueries({ queryKey: ['signatures'] });
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB.');
      return;
    }
    setError('');
    setName(file.name);
    setFileSize(file.size < 1024 * 1024 ? `${Math.round(file.size / 1024)} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      if (base64) setFileData({ base64, mimeType: file.type || 'application/octet-stream' });
    };
    reader.onerror = () => setError('Could not read file.');
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !fileData) {
      setError('Select a file to upload.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      await fetcher('/api/documents', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          category,
          contentBase64: fileData.base64,
          mimeType: fileData.mimeType,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setName('');
      setCategory('General');
      setFileSize('');
      setFileData(null);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadDoc = async (doc: Document) => {
    const token = getToken();
    const res = await fetch(`/api/documents/${doc.id}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || 'Download failed');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
          <p className="text-sm text-gray-500 mt-1">Employee documents, contracts, and secure file storage</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gray-900 text-white px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-gray-800 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {pendingSigs.length > 0 && (
        <div className="studio-card p-5 border-amber-500/30 space-y-3">
          <h3 className="font-medium text-ivory flex items-center gap-2"><PenLine className="w-4 h-4 text-gold-light" /> Pending signatures ({pendingSigs.length})</h3>
          {pendingSigs.map(sig => (
            <div key={sig.id} className="flex items-center justify-between p-3 rounded-xl border border-gold/10">
              <div>
                <p className="text-sm font-medium text-ivory">{sig.title}</p>
                <p className="text-xs text-ivory-muted">{sig.documentName}</p>
              </div>
              <button onClick={() => setSigningId(sig.id)} className="btn-primary text-xs">Sign now</button>
            </div>
          ))}
        </div>
      )}

      {signingId && (
        <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4" onClick={() => setSigningId(null)}>
          <div className="studio-card max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg text-ivory mb-4">Sign document</h3>
            <SignaturePad onChange={setSignatureData} />
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setSigningId(null)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={submitSignature} disabled={!signatureData} className="btn-primary text-xs">Submit signature</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleUpload} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700">Document Name</label>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Employment Contract.pdf" className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option>General</option>
              <option>Contract</option>
              <option>Identity</option>
              <option>Tax</option>
              <option>Certification</option>
            </select>
          </div>
          <label className="border-2 border-dashed border-maroon-200 rounded-xl p-8 text-center text-maroon-400 cursor-pointer block hover:bg-maroon-50/50 transition-colors">
            <Upload className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Click to select a file</p>
            <p className="text-xs mt-1">PDF, DOC, JPG up to 10MB — stored securely on server</p>
            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={e => handleFile(e.target.files?.[0] || null)} />
          </label>
          {fileSize && <p className="text-xs text-maroon-600">Selected: {name} ({fileSize})</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary" disabled={!name.trim() || !fileData || uploading}>
            {uploading ? 'Uploading…' : 'Upload Document'}
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading documents...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map(doc => (
            <div key={doc.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-gray-300 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 text-sm truncate">{doc.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{doc.category} · {doc.size}</p>
                  <p className="text-xs text-gray-400 mt-1">Uploaded {doc.uploadedAt}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {doc.storageKey && (
                    <button
                      onClick={() => downloadDoc(doc)}
                      className="p-1.5 text-gray-400 hover:text-maroon-600 hover:bg-maroon-50 rounded"
                      title="Download"
                    ><Download className="w-4 h-4" /></button>
                  )}
                  {isManager && (
                    <button
                      onClick={() => requestSignature(doc.id, doc.name)}
                      className="p-1.5 text-gray-400 hover:text-gold-600 hover:bg-amber-50 rounded"
                      title="Request signature"
                    ><PenLine className="w-4 h-4" /></button>
                  )}
                  <button
                    onClick={async () => {
                      if (!confirm('Delete this document?')) return;
                      await fetcher(`/api/documents/${doc.id}`, { method: 'DELETE' });
                      queryClient.invalidateQueries({ queryKey: ['documents'] });
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  ><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
          {docs.length === 0 && (
            <div className="col-span-full py-16 text-center text-gray-400 bg-white border border-gray-200 rounded-2xl">
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No documents uploaded yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}