import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Upload, Trash2 } from 'lucide-react';
import { fetcher } from '../utils';

interface Document {
  id: string;
  name: string;
  category: string;
  uploadedAt: string;
  size: string;
}

export function DocumentsView() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');

  const { data: docs = [], isLoading } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: () => fetcher('/api/documents'),
  });

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    await fetcher('/api/documents', {
      method: 'POST',
      body: JSON.stringify({ name, category }),
    });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    setName('');
    setCategory('General');
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
          <p className="text-sm text-gray-500 mt-1">Employee documents, contracts, and file storage</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gray-900 text-white px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-gray-800 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Upload Document
        </button>
      </div>

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
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
            <Upload className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Drag and drop or click to browse</p>
            <p className="text-xs mt-1">PDF, DOC, JPG up to 10MB</p>
          </div>
          <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700">Save Document</button>
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
                <button
                  onClick={async () => {
                    if (!confirm('Delete this document?')) return;
                    await fetcher(`/api/documents/${doc.id}`, { method: 'DELETE' });
                    queryClient.invalidateQueries({ queryKey: ['documents'] });
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded shrink-0"
                  title="Delete"
                ><Trash2 className="w-4 h-4" /></button>
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