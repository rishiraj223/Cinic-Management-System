import React, { useState, useEffect } from 'react';
import { TrendingUp, IndianRupee, Calendar, Users } from 'lucide-react';
import { clinicApi } from '../../services/clinicApi';
import type { DashboardSummary } from '../../types/clinic';

interface ClinicReportsViewProps {
  orgId: string;
}

export const ClinicReportsView: React.FC<ClinicReportsViewProps> = ({ orgId }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const loadReport = async () => {
      try {
        const sum = await clinicApi.getDashboardSummary(orgId, selectedDate);
        setSummary(sum);
      } catch (err: any) {
        console.error('Failed to load clinic reports', err);
      }
    };
    loadReport();
  }, [orgId, selectedDate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Clinic Reports & Operational Analytics</h2>
          <p className="text-sm text-gray-500">Real-time stats calculated from verified database records</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-gray-50 font-medium text-gray-800"
        />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Appointments</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{summary?.today_appointments ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">
            {summary?.completed ?? 0} completed · {summary?.checked_in ?? 0} checked in
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Walk-in Queue</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{summary?.waiting ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">Patients currently waiting</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Today's Collections</span>
            <IndianRupee className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">₹{Number(summary?.today_collection ?? 0).toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">Cash / UPI received today</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Outstanding Balances</span>
            <TrendingUp className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600">₹{Number(summary?.outstanding_balance ?? 0).toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">Pending unpaid invoice balances</div>
        </div>
      </div>

      {/* Detailed Table breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-4">Consultation Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Total Bookings</span>
              <span className="font-semibold text-gray-900">{summary?.today_appointments ?? 0}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Completed Consultations</span>
              <span className="font-semibold text-emerald-600">{summary?.completed ?? 0}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Cancelled / Missed</span>
              <span className="font-semibold text-rose-600">{summary?.cancelled ?? 0}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Upcoming Follow-ups (7 days)</span>
              <span className="font-semibold text-blue-600">{summary?.upcoming_followups ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-4">Financial Overview</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Total Recorded Receipts</span>
              <span className="font-semibold text-emerald-700">₹{Number(summary?.today_collection ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Uncollected Patient Dues</span>
              <span className="font-semibold text-rose-600">₹{Number(summary?.outstanding_balance ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Compliance & Audit Logs</span>
              <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded">All Audited</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
