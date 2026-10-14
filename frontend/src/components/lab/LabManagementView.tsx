import React, { useState, useEffect } from 'react';
import { labApi } from '../../services/labApi';

interface LabManagementViewProps {
  orgId: string;
}

export const LabManagementView: React.FC<LabManagementViewProps> = ({ orgId }) => {
  const [activeTab, setActiveTab] = useState<'tests' | 'orders' | 'samples' | 'results' | 'dashboard'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [samples, setSamples] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);

  // New test modal state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testForm, setTestForm] = useState({
    name: '',
    code: '',
    category: 'Hematology',
    price: 300,
    specimen_type: 'Blood',
    turnaround_minutes: 120,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const d = await labApi.getDashboard(orgId);
        setDashboard(d);
      } else if (activeTab === 'tests') {
        const t = await labApi.getTests(orgId);
        setTests(t);
      } else if (activeTab === 'orders') {
        const o = await labApi.getOrders(orgId);
        setOrders(o);
      } else if (activeTab === 'samples') {
        const s = await labApi.getSamples(orgId);
        setSamples(s);
      } else if (activeTab === 'results') {
        const r = await labApi.getResults(orgId);
        setResults(r);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orgId, activeTab]);

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await labApi.createTest(orgId, testForm);
      setShowTestModal(false);
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to create test');
    }
  };

  const handleReceiveSample = async (sampleId: string) => {
    try {
      await labApi.updateSampleStatus(orgId, sampleId, 'received');
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleValidateResult = async (resultId: string) => {
    try {
      await labApi.validateResult(orgId, resultId, 'Validated via Provider Portal');
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Diagnostic Centre & Laboratory</h2>
          <p className="text-sm text-gray-500">Manage lab test catalogue, orders, specimens, results & reports</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'tests' && (
            <button
              onClick={() => setShowTestModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition"
            >
              + Add Test to Catalogue
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          {(['dashboard', 'tests', 'orders', 'samples', 'results'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-1 text-sm font-medium border-b-2 capitalize transition ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'dashboard' ? 'Overview' : tab}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading laboratory records...</div>
      ) : (
        <>
          {activeTab === 'dashboard' && dashboard && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-sm font-medium text-gray-500">Total Catalogue Tests</span>
                <p className="text-3xl font-bold text-gray-900 mt-2">{dashboard.total_tests_in_catalogue}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-sm font-medium text-gray-500">Orders Today</span>
                <p className="text-3xl font-bold text-indigo-600 mt-2">{dashboard.orders_today}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-sm font-medium text-gray-500">Pending Samples</span>
                <p className="text-3xl font-bold text-amber-500 mt-2">{dashboard.samples_pending_collection}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-sm font-medium text-gray-500">Results Pending Validation</span>
                <p className="text-3xl font-bold text-orange-500 mt-2">{dashboard.results_pending_validation}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-sm font-medium text-gray-500">Reports Released</span>
                <p className="text-3xl font-bold text-emerald-600 mt-2">{dashboard.reports_released_today}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-sm font-medium text-gray-500">Today's Revenue</span>
                <p className="text-3xl font-bold text-gray-900 mt-2">${dashboard.total_revenue_today.toFixed(2)}</p>
              </div>
            </div>
          )}

          {activeTab === 'tests' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Code</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Name</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Category</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Specimen</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Price</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No lab tests configured yet.</td>
                    </tr>
                  ) : (
                    tests.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono font-medium text-gray-900">{t.code}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{t.name}</td>
                        <td className="px-6 py-4 text-gray-600">{t.category || 'General'}</td>
                        <td className="px-6 py-4 text-gray-600">{t.specimen_type || 'N/A'}</td>
                        <td className="px-6 py-4 font-semibold text-gray-900">${parseFloat(t.price).toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${t.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                            {t.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Order #</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Patient ID</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Tests Count</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No lab orders yet.</td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono font-medium text-indigo-600">{o.order_number}</td>
                        <td className="px-6 py-4 font-mono text-gray-600">{o.patient_id.slice(0, 8)}...</td>
                        <td className="px-6 py-4 text-gray-900">{o.items?.length || 0}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 uppercase">
                            {o.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'samples' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Sample Barcode</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Specimen Type</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-6 py-3 text-right font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {samples.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No samples recorded.</td>
                    </tr>
                  ) : (
                    samples.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono font-semibold text-gray-900">{s.sample_ref}</td>
                        <td className="px-6 py-4 text-gray-600">{s.sample_type || 'General'}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                            {s.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {s.status === 'pending_collection' && (
                            <button
                              onClick={() => handleReceiveSample(s.id)}
                              className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700"
                            >
                              Receive Sample
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Result Value</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Reference Range</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Flag</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-6 py-3 text-right font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No lab results available.</td>
                    </tr>
                  ) : (
                    results.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-bold text-gray-900">{r.result_value} {r.unit}</td>
                        <td className="px-6 py-4 text-gray-500">{r.reference_range_low} - {r.reference_range_high} {r.unit}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-gray-100 text-gray-700">
                            {r.result_flag || 'normal'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${r.status === 'validated' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {r.status === 'entered' && (
                            <button
                              onClick={() => handleValidateResult(r.id)}
                              className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700"
                            >
                              Validate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add Test Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Add Test to Catalogue</h3>
            <form onSubmit={handleCreateTest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Test Name</label>
                <input
                  required
                  type="text"
                  value={testForm.name}
                  onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm"
                  placeholder="e.g. Lipid Profile"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Code</label>
                  <input
                    required
                    type="text"
                    value={testForm.code}
                    onChange={(e) => setTestForm({ ...testForm, code: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm uppercase font-mono"
                    placeholder="LIPID-01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Price ($)</label>
                  <input
                    required
                    type="number"
                    value={testForm.price}
                    onChange={(e) => setTestForm({ ...testForm, price: parseFloat(e.target.value) })}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Specimen</label>
                  <input
                    type="text"
                    value={testForm.specimen_type}
                    onChange={(e) => setTestForm({ ...testForm, specimen_type: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">TAT (mins)</label>
                  <input
                    type="number"
                    value={testForm.turnaround_minutes}
                    onChange={(e) => setTestForm({ ...testForm, turnaround_minutes: parseInt(e.target.value) })}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Save Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
