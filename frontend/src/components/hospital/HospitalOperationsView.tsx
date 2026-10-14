import React, { useState, useEffect } from 'react';
import { labApi } from '../../services/labApi';

interface HospitalOperationsViewProps {
  orgId: string;
}

export const HospitalOperationsView: React.FC<HospitalOperationsViewProps> = ({ orgId }) => {
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dash, depts] = await Promise.all([
        labApi.getHospitalDashboard(orgId),
        labApi.getHospitalDepartmentsReport(orgId),
      ]);
      setDashboard(dash);
      setDepartments(depts);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orgId]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Hospital Operations & Multi-Doctor Coordination</h2>
        <p className="text-sm text-gray-500">Live operational overview, department allocations & institutional metrics</p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading hospital metrics...</div>
      ) : (
        <>
          {dashboard && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-sm font-medium text-gray-500">Active Departments</span>
                <p className="text-3xl font-bold text-gray-900 mt-2">{dashboard.departments_count}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-sm font-medium text-gray-500">Doctors & Specialists</span>
                <p className="text-3xl font-bold text-indigo-600 mt-2">{dashboard.doctors_count}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-sm font-medium text-gray-500">Total Staff</span>
                <p className="text-3xl font-bold text-blue-600 mt-2">{dashboard.staff_count}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-sm font-medium text-gray-500">Today's Appointments</span>
                <p className="text-3xl font-bold text-emerald-600 mt-2">{dashboard.today_appointments}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-sm font-medium text-gray-500">Completed Appointments</span>
                <p className="text-3xl font-bold text-gray-900 mt-2">{dashboard.completed_appointments}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-sm font-medium text-gray-500">Cancelled / No-Show</span>
                <p className="text-3xl font-bold text-rose-500 mt-2">{dashboard.cancelled_appointments}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-sm font-medium text-gray-500">Total Revenue</span>
                <p className="text-3xl font-bold text-emerald-600 mt-2">${dashboard.total_revenue.toFixed(2)}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-sm font-medium text-gray-500">Outstanding Balance</span>
                <p className="text-3xl font-bold text-amber-500 mt-2">${dashboard.outstanding_balance.toFixed(2)}</p>
              </div>
            </div>
          )}

          {/* Department Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-900">Hospital Departments & Staff Allocations</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Department Name</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Description</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Assigned Doctors</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No departments configured yet.</td>
                  </tr>
                ) : (
                  departments.map((dept) => (
                    <tr key={dept.department_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-gray-900">{dept.name}</td>
                      <td className="px-6 py-4 text-gray-600">{dept.description || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 font-bold text-xs">
                          {dept.total_doctors} Doctors
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${dept.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                          {dept.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
