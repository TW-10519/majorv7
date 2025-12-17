import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, Check, X, Clock, AlertCircle, Download } from 'lucide-react';
import Card from './common/Card';
import Button from './common/Button';
import Modal from './common/Modal';
import Table from './common/Table';
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, generateSchedule } from '../services/api';

const ScheduleManager = ({ departmentId, employees = [], roles = [] }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    role_id: '',
    date: '',
    start_time: '09:00',
    end_time: '17:00',
    notes: ''
  });

  useEffect(() => {
    loadSchedules();
  }, [startDate, endDate]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const response = await getSchedules(startDate, endDate);
      setSchedules(response.data || []);
    } catch (error) {
      console.error('Failed to load schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!formData.employee_id || !formData.role_id || !formData.date) {
      alert('Please fill all required fields');
      return;
    }

    try {
      if (editingSchedule) {
        await updateSchedule(editingSchedule.id, formData);
        alert('Schedule updated successfully');
      } else {
        await createSchedule(formData);
        alert('Schedule created successfully');
      }
      resetForm();
      loadSchedules();
    } catch (error) {
      alert('Error saving schedule: ' + error.message);
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (window.confirm('Delete this schedule?')) {
      try {
        await deleteSchedule(id);
        alert('Schedule deleted successfully');
        loadSchedules();
      } catch (error) {
        alert('Error deleting schedule: ' + error.message);
      }
    }
  };

  const handleGenerateSchedule = async () => {
    setGeneratingSchedule(true);
    try {
      const response = await generateSchedule(startDate, endDate);
      if (response.data.success) {
        alert(`✅ Schedule generated! Created ${response.data.schedules_created} assignments`);
        setShowGenerateDialog(false);
        loadSchedules();
      } else {
        alert('Schedule generation failed: ' + response.data.error);
      }
    } catch (error) {
      alert('Error generating schedule: ' + error.message);
    } finally {
      setGeneratingSchedule(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      role_id: '',
      date: '',
      start_time: '09:00',
      end_time: '17:00',
      notes: ''
    });
    setEditingSchedule(null);
    setShowForm(false);
  };

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      employee_id: schedule.employee_id,
      role_id: schedule.role_id,
      date: schedule.date,
      start_time: schedule.start_time || '09:00',
      end_time: schedule.end_time || '17:00',
      notes: schedule.notes || ''
    });
    setShowForm(true);
  };

  const scheduleColumns = [
    { header: 'Date', accessor: 'date' },
    { 
      header: 'Employee', 
      accessor: row => {
        const emp = employees.find(e => e.id === row.employee_id);
        return emp ? `${emp.first_name} ${emp.last_name}` : 'N/A';
      }
    },
    { 
      header: 'Role', 
      accessor: row => {
        const role = roles.find(r => r.id === row.role_id);
        return role ? role.name : 'N/A';
      }
    },
    { header: 'Time', accessor: row => `${row.start_time} - ${row.end_time}` },
    { header: 'Status', accessor: 'status' },
    {
      header: 'Actions',
      accessor: row => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEditSchedule(row)}
            className="text-blue-600 hover:text-blue-800 p-1"
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleDeleteSchedule(row.id)}
            className="text-red-600 hover:text-red-800 p-1"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Schedule Generator Dialog */}
      <Modal isOpen={showGenerateDialog} onClose={() => setShowGenerateDialog(false)}>
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl">
          <h2 className="text-2xl font-bold mb-4">Generate Optimized Schedule</h2>
          <div className="space-y-4 mb-6">
            <p className="text-gray-600">
              This will automatically generate an optimized schedule using OR-Tools constraint solver.
              The algorithm distributes shifts based on:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Employee skills and preferences</li>
              <li>Role requirements</li>
              <li>Employee availability and leave requests</li>
              <li>Weekly hour constraints</li>
              <li>Fair distribution of shift types</li>
            </ul>

            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="text-sm text-blue-800">
                <strong>Period:</strong> {startDate} to {endDate}
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button onClick={() => setShowGenerateDialog(false)} variant="secondary">Cancel</Button>
            <Button 
              onClick={handleGenerateSchedule} 
              disabled={generatingSchedule}
              className="flex items-center gap-2"
            >
              {generatingSchedule ? 'Generating...' : <>
                <Sparkles size={18} />
                Generate Schedule
              </>}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Schedule Form Modal */}
      <Modal isOpen={showForm} onClose={resetForm}>
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
          <h2 className="text-xl font-bold mb-4">
            {editingSchedule ? 'Edit Schedule' : 'Create Schedule'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Employee *</label>
              <select
                value={formData.employee_id}
                onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              >
                <option value="">Select employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Role *</label>
              <select
                value={formData.role_id}
                onChange={(e) => setFormData({...formData, role_id: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              >
                <option value="">Select role</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Time</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                rows="3"
                placeholder="Optional notes"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <Button onClick={resetForm} variant="secondary">Cancel</Button>
            <Button onClick={handleSaveSchedule}>
              {editingSchedule ? 'Update' : 'Create'} Schedule
            </Button>
          </div>
        </div>
      </Modal>

      {/* Header with controls */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <Calendar size={24} className="text-blue-600" />
            <h2 className="text-2xl font-bold">Schedule Management</h2>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowGenerateDialog(true)} variant="primary" className="flex items-center gap-2">
              <Sparkles size={18} />
              Auto-Generate
            </Button>
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <Plus size={18} />
              Add Schedule
            </Button>
          </div>
        </div>

        {/* Date range selector */}
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
        </div>
      </Card>

      {/* Schedules Table */}
      <Card>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading schedules...</div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="inline mb-2 text-gray-400" size={40} />
            <p>No schedules found for the selected period</p>
          </div>
        ) : (
          <Table
            data={schedules}
            columns={scheduleColumns}
            striped
          />
        )}
      </Card>

      {/* Schedule Stats */}
      {schedules.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-2">Total Schedules</p>
              <p className="text-3xl font-bold text-blue-600">{schedules.length}</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-2">Unique Employees</p>
              <p className="text-3xl font-bold text-green-600">
                {new Set(schedules.map(s => s.employee_id)).size}
              </p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-2">Average Shifts/Employee</p>
              <p className="text-3xl font-bold text-purple-600">
                {(schedules.length / new Set(schedules.map(s => s.employee_id)).size).toFixed(1)}
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ScheduleManager;
