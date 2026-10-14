import React, { useState, useEffect } from 'react';
import { UserPlus, ArrowRight, Clock } from 'lucide-react';
import { clinicApi } from '../../services/clinicApi';
import type { QueueEntry, Patient } from '../../types/clinic';

interface WalkInQueueViewProps {
  orgId: string;
}

export const WalkInQueueView: React.FC<WalkInQueueViewProps> = ({ orgId }) => {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [walkInName, setWalkInName] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [q, pts] = await Promise.all([
        clinicApi.getQueue(orgId),
        clinicApi.getPatients(orgId),
      ]);
      setQueue(q);
      setPatients(pts);
    } catch (err: any) {
      console.error('Failed to load queue data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const handleAddWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName && !selectedPatientId) return;
    setSubmitting(true);
    try {
      await clinicApi.addQueueEntry(orgId, {
        patient_id: selectedPatientId || undefined,
        walk_in_name: walkInName || undefined,
      });
      setWalkInName('');
      setSelectedPatientId('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error adding walk-in');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvanceStatus = async (id: string, currentStatus: string) => {
    let nextStatus = 'called';
    if (currentStatus === 'called') nextStatus = 'in_consultation';
    else if (currentStatus === 'in_consultation') nextStatus = 'completed';

    try {
      await clinicApi.updateQueueStatus(orgId, id, nextStatus);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error advancing queue');
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      waiting: 'bg-amber-50 text-amber-700 border-amber-200',
      called: 'bg-blue-50 text-blue-700 border-blue-200',
      in_consultation: 'bg-purple-50 text-purple-700 border-purple-200',
      completed: 'bg-gray-100 text-gray-700 border-gray-200',
      cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${map[status] || 'bg-gray-50'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Live Walk-in Queue</h2>
          <p className="text-sm text-gray-500">Manage patient waiting queue and live consultation flow</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full">
            Waiting: {queue.filter((q) => q.status === 'waiting').length}
          </span>
        </div>
      </div>

      {/* Add Walk-in form */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-emerald-600" />
          Add Walk-in Patient to Queue
        </h3>
        <form onSubmit={handleAddWalkIn} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Existing Patient (Optional)</label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- Or Choose Existing Patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.patient_code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Walk-in Name (if new)</label>
            <input
              type="text"
              placeholder="e.g. Ramesh Kumar"
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting || (!walkInName && !selectedPatientId)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm transition-all disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add to Queue'}
            </button>
          </div>
        </form>
      </div>

      {/* Queue List Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-4">Token #</th>
                <th className="py-3.5 px-4">Patient Name</th>
                <th className="py-3.5 px-4">Arrival Time</th>
                <th className="py-3.5 px-4">Current Status</th>
                <th className="py-3.5 px-4 text-right">Advance Queue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">Loading queue...</td>
                </tr>
              ) : queue.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">Queue is currently empty.</td>
                </tr>
              ) : (
                queue.map((q) => {
                  const pt = patients.find((p) => p.id === q.patient_id);
                  const displayName = pt?.full_name || q.walk_in_name || 'Walk-in';
                  return (
                    <tr key={q.id} className="hover:bg-gray-50/80">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 text-base">#{q.queue_number}</td>
                      <td className="py-3.5 px-4 font-medium text-gray-900">{displayName}</td>
                      <td className="py-3.5 px-4 text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {new Date(q.arrived_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(q.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        {q.status !== 'completed' && q.status !== 'cancelled' ? (
                          <button
                            onClick={() => handleAdvanceStatus(q.id, q.status)}
                            className="inline-flex items-center gap-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-medium px-3 py-1 rounded-md"
                          >
                            <span>Next Step</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">Done</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
