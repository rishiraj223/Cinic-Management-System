import React, { useState } from 'react';
import { FlaskConical, Plus, Trash2, X, TestTube, CheckCircle } from 'lucide-react';
import { api } from '../../services/api';
import type { OrganizationWithRole, ServiceCategory } from '../../types/organization';
import { Alert } from '../common/Alert';

interface ServiceCategoryManagerProps {
  currentOrg: OrganizationWithRole;
  serviceCategories: ServiceCategory[];
  onRefresh: () => void;
}

const SAMPLE_TYPE_PRESETS = [
  'Whole Blood / Serum',
  'Urine / Fluid',
  'Tissue / Biopsy',
  'Nasal / Throat Swab',
  'Stool / Fecal',
  'Diagnostic Imaging (X-Ray / MRI)',
];

export const ServiceCategoryManager: React.FC<ServiceCategoryManagerProps> = ({
  currentOrg,
  serviceCategories,
  onRefresh,
}) => {
  const isOwner = currentOrg.current_user_role === 'organization_owner';
  const isLabStaff = currentOrg.current_user_role === 'lab_staff';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sampleType, setSampleType] = useState('Whole Blood / Serum');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await api.createServiceCategory(currentOrg.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        sample_type: sampleType,
      });

      setName('');
      setDescription('');
      setIsModalOpen(false);
      setMessage(`Category '${name.trim()}' added to lab catalogue.`);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to add service category.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!window.confirm(`Delete diagnostic test category '${catName}'?`)) return;

    setLoading(true);
    setError(null);

    try {
      await api.deleteServiceCategory(currentOrg.id, catId);
      setMessage(`Category '${catName}' removed.`);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete category.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Diagnostic Test Categories
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pathology menus, specimen classifications, and diagnostic testing departments.
          </p>
        </div>

        {(isOwner || isLabStaff) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-amber-200"
          >
            <Plus className="w-4 h-4" />
            Add Test Category
          </button>
        )}
      </div>

      {message && <Alert type="success" message={message} onClose={() => setMessage(null)} />}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {serviceCategories.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center space-y-3">
          <FlaskConical className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Service Categories Configured</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Configure testing disciplines (e.g. Hematology, Biochemistry, Microbiology) to organize lab orders and test catalogues.
          </p>
          {(isOwner || isLabStaff) && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-2 px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-xl hover:bg-amber-700 transition"
            >
              Add First Category
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {serviceCategories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4 hover:border-amber-300 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                      <TestTube className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{cat.name}</h3>
                      <span className="text-[10px] font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
                        {cat.sample_type || 'General Specimen'}
                      </span>
                    </div>
                  </div>

                  {isOwner && (
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-500 line-clamp-2">
                  {cat.description || 'Routine diagnostic and clinical laboratory testing.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                  <CheckCircle className="w-3.5 h-3.5" /> Active Menu
                </span>
                <span className="text-[10px] font-mono">Ready for Phase 4</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Category */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">Add Test Service Category</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Hematology, Clinical Biochemistry"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Specimen / Sample Type</label>
                <select
                  value={sampleType}
                  onChange={(e) => setSampleType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {SAMPLE_TYPE_PRESETS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Clinical diagnostic scope or testing methodology..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
