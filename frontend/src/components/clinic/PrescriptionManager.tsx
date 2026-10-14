import React, { useState, useEffect } from 'react';
import { Plus, Download, Trash2 } from 'lucide-react';
import { clinicApi } from '../../services/clinicApi';
import { api } from '../../services/api';
import type { Patient, Prescription, PrescriptionItem } from '../../types/clinic';
import type { DoctorProfile } from '../../types/organization';

interface PrescriptionManagerProps {
  orgId: string;
}

export const PrescriptionManager: React.FC<PrescriptionManagerProps> = ({ orgId }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // New prescription form state
  const [doctorProfileId, setDoctorProfileId] = useState('');
  const [diagnosisNote, setDiagnosisNote] = useState('');
  const [instructions, setInstructions] = useState('');
  const [items, setItems] = useState<PrescriptionItem[]>([
    { medication_name: '', dosage: '', frequency: '', duration: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [pts, docs] = await Promise.all([
          clinicApi.getPatients(orgId),
          api.getDoctors(orgId),
        ]);
        setPatients(pts);
        setDoctors(docs);
        if (pts.length > 0) setSelectedPatientId(pts[0].id);
        if (docs.length > 0) setDoctorProfileId(docs[0].id);
      } catch (err: any) {
        console.error('Failed to init prescription data', err);
      }
    };
    init();
  }, [orgId]);

  const loadPrescriptions = async () => {
    if (!selectedPatientId) return;
    setIsLoading(true);
    try {
      const data = await clinicApi.getPrescriptions(orgId, selectedPatientId);
      setPrescriptions(data);
    } catch (err: any) {
      console.error('Failed to load prescriptions', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrescriptions();
  }, [orgId, selectedPatientId]);

  const addItemRow = () => {
    setItems([...items, { medication_name: '', dosage: '', frequency: '', duration: '' }]);
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PrescriptionItem, val: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !doctorProfileId) return;
    setSubmitting(true);
    try {
      await clinicApi.createPrescription(orgId, {
        patient_id: selectedPatientId,
        doctor_profile_id: doctorProfileId,
        diagnosis_note: diagnosisNote,
        instructions: instructions,
        items: items.filter((i) => i.medication_name.trim() !== ''),
      });
      setShowModal(false);
      setDiagnosisNote('');
      setInstructions('');
      setItems([{ medication_name: '', dosage: '', frequency: '', duration: '' }]);
      loadPrescriptions();
    } catch (err: any) {
      alert(err.message || 'Error creating prescription');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalize = async (id: string) => {
    try {
      await clinicApi.finalizePrescription(orgId, id);
      loadPrescriptions();
    } catch (err: any) {
      alert(err.message || 'Only authorized doctors can finalize');
    }
  };

  const handleDownloadPdf = async (id: string, ref: string) => {
    try {
      const blob = await clinicApi.downloadPrescriptionPdf(orgId, id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Prescription-${ref}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to download prescription PDF');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Clinical Prescriptions</h2>
          <p className="text-sm text-gray-500">Create structured digital prescriptions and generate professional PDFs</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Write Prescription
        </button>
      </div>

      {/* Patient Picker */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Select Patient:</label>
        <select
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
          className="w-full max-w-md px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name} ({p.patient_code})
            </option>
          ))}
        </select>
      </div>

      {/* Prescriptions List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-4">Rx Reference</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Diagnosis</th>
                <th className="py-3.5 px-4">Medications</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">Loading prescriptions...</td>
                </tr>
              ) : prescriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">No prescriptions recorded for this patient.</td>
                </tr>
              ) : (
                prescriptions.map((rx) => (
                  <tr key={rx.id} className="hover:bg-gray-50/80">
                    <td className="py-3.5 px-4 font-mono font-medium text-emerald-700">{rx.prescription_ref}</td>
                    <td className="py-3.5 px-4 text-xs text-gray-500">{new Date(rx.created_at).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 font-medium text-gray-800">{rx.diagnosis_note || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-xs text-gray-600">
                      {rx.items?.map((i) => i.medication_name).join(', ') || 'No medications listed'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          rx.status === 'finalized' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {rx.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {rx.status === 'draft' && (
                          <button
                            onClick={() => handleFinalize(rx.id)}
                            className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium px-2.5 py-1 rounded"
                          >
                            Sign & Finalize
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadPdf(rx.id, rx.prescription_ref)}
                          className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-2.5 py-1 rounded"
                        >
                          <Download className="w-3 h-3" />
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Write Prescription Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Write Clinical Prescription</h3>
            <form onSubmit={handleCreatePrescription} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Doctor *</label>
                  <select
                    required
                    value={doctorProfileId}
                    onChange={(e) => setDoctorProfileId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.specialty}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Diagnosis Assessment</label>
                  <input
                    type="text"
                    placeholder="e.g. Upper Respiratory Tract Infection"
                    value={diagnosisNote}
                    onChange={(e) => setDiagnosisNote(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Medication list */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-gray-700">Medications & Posology</label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Drug
                  </button>
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2.5 rounded-lg border">
                      <div className="col-span-4">
                        <input
                          required
                          type="text"
                          placeholder="Drug name (e.g. Paracetamol 500mg)"
                          value={item.medication_name}
                          onChange={(e) => updateItem(idx, 'medication_name', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border rounded bg-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          required
                          type="text"
                          placeholder="Dosage (e.g. 1 tab)"
                          value={item.dosage}
                          onChange={(e) => updateItem(idx, 'dosage', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border rounded bg-white"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          required
                          type="text"
                          placeholder="Freq (e.g. 1-0-1 after food)"
                          value={item.frequency}
                          onChange={(e) => updateItem(idx, 'frequency', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border rounded bg-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="Duration (5 days)"
                          value={item.duration || ''}
                          onChange={(e) => updateItem(idx, 'duration', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border rounded bg-white"
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">General Instructions & Advice</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Drink plenty of warm fluids. Return if symptoms persist."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 font-medium hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm"
                >
                  {submitting ? 'Saving...' : 'Save Draft Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
