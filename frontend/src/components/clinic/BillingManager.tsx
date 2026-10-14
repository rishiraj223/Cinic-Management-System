import React, { useState, useEffect } from 'react';
import { Plus, Download, Trash2 } from 'lucide-react';
import { clinicApi } from '../../services/clinicApi';
import type { Invoice, InvoiceItem, Patient } from '../../types/clinic';

interface BillingManagerProps {
  orgId: string;
}

export const BillingManager: React.FC<BillingManagerProps> = ({ orgId }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // New Invoice form state
  const [patientId, setPatientId] = useState('');
  const [discount, setDiscount] = useState<number>(0);
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: 'Consultation Fee', quantity: 1, unit_price: 500 },
  ]);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [paymentRef, setPaymentRef] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [invs, pts] = await Promise.all([
        clinicApi.getInvoices(orgId),
        clinicApi.getPatients(orgId),
      ]);
      setInvoices(invs);
      setPatients(pts);
      if (pts.length > 0 && !patientId) setPatientId(pts[0].id);
    } catch (err: any) {
      console.error('Failed to load billing data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const addItemRow = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, val: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    setSubmittingInvoice(true);
    try {
      await clinicApi.createInvoice(orgId, {
        patient_id: patientId,
        discount: Number(discount) || 0,
        items: items.map((i) => ({
          description: i.description,
          quantity: Number(i.quantity) || 1,
          unit_price: Number(i.unit_price) || 0,
        })),
      });
      setShowInvoiceModal(false);
      setItems([{ description: 'Consultation Fee', quantity: 1, unit_price: 500 }]);
      setDiscount(0);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error generating invoice');
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setSubmittingPayment(true);
    try {
      await clinicApi.recordPayment(orgId, selectedInvoice.id, {
        amount: Number(paymentAmount),
        method: paymentMethod,
        reference_number: paymentRef || undefined,
      });
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      setPaymentAmount(0);
      setPaymentRef('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error recording payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleDownloadPdf = async (id: string, number: string) => {
    try {
      const blob = await clinicApi.downloadInvoicePdf(orgId, id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Error downloading receipt PDF');
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      unpaid: 'bg-rose-50 text-rose-700 border-rose-200',
      partially_paid: 'bg-amber-50 text-amber-700 border-amber-200',
      paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      refunded: 'bg-gray-100 text-gray-700 border-gray-200',
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
          <h2 className="text-xl font-bold text-gray-900">Billing & Receipts</h2>
          <p className="text-sm text-gray-500">Create itemized invoices, record receipts and track balances</p>
        </div>
        <button
          onClick={() => setShowInvoiceModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Patient</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Paid</th>
                <th className="py-3.5 px-4">Balance</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">Loading invoices...</td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">No invoices generated yet.</td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const pt = patients.find((p) => p.id === inv.patient_id);
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/80">
                      <td className="py-3.5 px-4 font-mono font-medium text-emerald-700">{inv.invoice_number}</td>
                      <td className="py-3.5 px-4 font-medium text-gray-900">{pt?.full_name || 'Patient'}</td>
                      <td className="py-3.5 px-4 font-semibold text-gray-900">₹{Number(inv.total).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-emerald-700 font-medium">₹{Number(inv.amount_paid).toFixed(2)}</td>
                      <td className="py-3.5 px-4 font-bold text-rose-600">₹{Number(inv.balance).toFixed(2)}</td>
                      <td className="py-3.5 px-4">{getStatusBadge(inv.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.status !== 'paid' && (
                            <button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setPaymentAmount(Number(inv.balance));
                                setShowPaymentModal(true);
                              }}
                              className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-medium px-2.5 py-1 rounded"
                            >
                              Pay
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                            className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-2.5 py-1 rounded"
                          >
                            <Download className="w-3 h-3" />
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Record Payment</h3>
            <p className="text-xs text-gray-500 mb-4 font-mono">{selectedInvoice.invoice_number}</p>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  max={Number(selectedInvoice.balance)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  <option value="upi">UPI / QR Code</option>
                  <option value="cash">Cash</option>
                  <option value="card">Debit / Credit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Transaction Ref (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-TXN-123456"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm"
                >
                  {submittingPayment ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Invoice</h3>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Patient *</label>
                <select
                  required
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.patient_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-gray-700">Service / Items</label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs text-emerald-600 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line
                  </button>
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-lg border">
                      <div className="col-span-6">
                        <input
                          required
                          type="text"
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateItem(idx, 'description', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border rounded bg-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          required
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1.5 text-xs border rounded bg-white"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          required
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={item.unit_price}
                          onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-xs border rounded bg-white"
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="text-rose-500 hover:text-rose-700"
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
                <label className="block text-xs font-medium text-gray-700 mb-1">Discount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInvoice}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm"
                >
                  {submittingInvoice ? 'Generating...' : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
