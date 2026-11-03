import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { userManagementApi, locationsApi } from '../../lib/api';
import {
  Badge, Spinner, EmptyState, Alert, Modal, ConfirmModal,
  FormField, PageHeader, StatCard
} from '../../components/ui';
import { formatDateTime } from './utils';

const DEFAULT_DEPARTMENTS = [
  'Administration',
  'Finance & Accounts',
  'Human Resources',
  'Information Technology (IT)',
  'Legal & Compliance',
  'Logistics & Courier',
  'Operations',
  'Procurement',
  'Sales & Marketing',
  'Customer Support',
  'Management'
];

const ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'admin', label: 'Administrator' },
  { value: 'manager', label: 'Department Manager' },
  { value: 'receptionist', label: 'Front Desk / Receptionist' }
];

export default function UserManagementPage() {
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    role: 'employee',
    location: '',
    status: 'active',
    password: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load users and locations
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [userData, locData] = await Promise.all([
        userManagementApi.getUsers({
          search: search.trim() || undefined,
          department: selectedDept !== 'all' ? selectedDept : undefined,
          role: selectedRole !== 'all' ? selectedRole : undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined
        }),
        locationsApi.getLocations().catch(() => [])
      ]);
      setUsers(userData.data || []);
      setLocations(Array.isArray(locData) ? locData : (locData?.data || []));
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err.message || 'Failed to load user directory.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedDept, selectedRole, selectedStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dynamic Departments from existing users + defaults
  const departmentOptions = useMemo(() => {
    const set = new Set(DEFAULT_DEPARTMENTS);
    users.forEach(u => {
      if (u.department && u.department.trim()) set.add(u.department.trim());
    });
    return Array.from(set).sort();
  }, [users]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.status === 'active').length;
    const inactive = total - active;
    const depts = new Set(users.map(u => u.department).filter(Boolean)).size;
    return { total, active, inactive, depts };
  }, [users]);

  // Handlers
  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      department: departmentOptions[0] || '',
      role: 'employee',
      location: locations[0]?.name || '',
      status: 'active',
      password: ''
    });
    setIsAddModalOpen(true);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Full Name and Email are required.');
      return;
    }
    try {
      setSubmitting(true);
      await userManagementApi.createUser(formData);
      toast.success(`User "${formData.name.trim()}" created successfully!`);
      setIsAddModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      department: user.department || '',
      role: user.role || 'employee',
      location: user.location || '',
      status: user.status || 'active'
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setSubmitting(true);
      await userManagementApi.updateUser(editingUser.id, formData);
      toast.success(`User updated successfully!`);
      setEditingUser(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await userManagementApi.toggleStatus(user.id, newStatus);
      toast.success(`User "${user.name}" is now ${newStatus}.`);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    } catch (err) {
      toast.error(err.message || 'Failed to update user status');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!passwordUser) return;
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    try {
      setSubmitting(true);
      await userManagementApi.resetPassword(passwordUser.id, newPassword);
      toast.success(`Password reset for ${passwordUser.email}!`);
      setPasswordUser(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      setSubmitting(true);
      await userManagementApi.deleteUser(deletingUser.id);
      toast.success(`User "${deletingUser.name}" has been removed.`);
      setDeletingUser(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for user avatar circle
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div style={{ padding: '0 0 var(--space-8) 0' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
        <Link to="/helpdesk-admin" style={{ color: 'var(--brand-amber)', textDecoration: 'none', fontWeight: 600 }}>
          Admin Dashboard
        </Link>
        <span style={{ color: 'var(--color-text-muted)' }}>/</span>
        <Link to="/helpdesk-admin/security" style={{ color: 'var(--brand-amber)', textDecoration: 'none', fontWeight: 600 }}>
          Security & Audit
        </Link>
        <span style={{ color: 'var(--color-text-muted)' }}>/</span>
        <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>User Management</span>
      </div>

      <PageHeader
        title="👥 User Management"
        subtitle="Manage employee access, assign departments & locations, reset passwords, and toggle active status."
        action={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link to="/helpdesk-admin/security" className="btn btn--outline btn--sm" style={{ textDecoration: 'none' }}>
              ← Back to Security
            </Link>
            <button
              className="btn btn--primary btn--sm"
              onClick={handleOpenAddModal}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
            >
              <span>+</span> Add Employee
            </button>
          </div>
        }
      />

      {error && <Alert type="error" style={{ marginBottom: '1.25rem' }}>{error}</Alert>}

      {/* KPI / Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <StatCard
          icon="👥"
          label="Total Users"
          value={stats.total}
          subtext="Registered employee directory"
          color="var(--brand-charcoal, #172025)"
        />
        <StatCard
          icon="✅"
          label="Active Accounts"
          value={stats.active}
          subtext="Can log in & submit requests"
          color="var(--color-success, #16a34a)"
        />
        <StatCard
          icon="🚫"
          label="Deactivated"
          value={stats.inactive}
          subtext="Blocked from signing in"
          color="var(--color-error, #dc2626)"
        />
        <StatCard
          icon="🏢"
          label="Departments"
          value={stats.depts}
          subtext="Operational business units"
          color="var(--brand-amber, #b27f0d)"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '1rem',
          alignItems: 'flex-end'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--color-text-muted)' }}>
              🔍 Search Employees
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--color-text-muted)' }}>
              🏢 Department
            </label>
            <select
              className="form-input"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
            >
              <option value="all">All Departments</option>
              {departmentOptions.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--color-text-muted)' }}>
              🛡️ Role
            </label>
            <select
              className="form-input"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
            >
              <option value="all">All Roles</option>
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--color-text-muted)' }}>
              🚦 Account Status
            </label>
            <select
              className="form-input"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
            <Spinner size="lg" />
            <p style={{ marginTop: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Loading user directory...
            </p>
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No Users Found"
            description={search || selectedDept !== 'all' || selectedRole !== 'all' || selectedStatus !== 'all'
              ? "No employees match your active filters. Try adjusting your search query."
              : "No employees registered yet. Click '+ Add Employee' to create your first user."}
            action={
              (search || selectedDept !== 'all' || selectedRole !== 'all' || selectedStatus !== 'all') ? (
                <button
                  className="btn btn--outline btn--sm"
                  onClick={() => { setSearch(''); setSelectedDept('all'); setSelectedRole('all'); setSelectedStatus('all'); }}
                >
                  Clear Filters
                </button>
              ) : (
                <button className="btn btn--primary btn--sm" onClick={handleOpenAddModal}>
                  + Add First Employee
                </button>
              )
            }
          />
        ) : (
          <div className="table-wrapper">
            <table className="table" aria-label="Portal User Management Directory">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '40px' }}>#</th>
                  <th scope="col">Employee / User</th>
                  <th scope="col">Contact Info</th>
                  <th scope="col">Department & Role</th>
                  <th scope="col">Location</th>
                  <th scope="col" style={{ textAlign: 'center' }}>Status</th>
                  <th scope="col">Last Login</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => {
                  const isActive = user.status === 'active';
                  return (
                    <tr key={user.id} style={{ background: isActive ? 'inherit' : 'rgba(239, 68, 68, 0.03)' }}>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{idx + 1}</td>

                      {/* Name & Avatar */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: isActive ? 'var(--brand-amber-bg, #fdf5e6)' : '#fee2e2',
                            color: isActive ? 'var(--brand-amber, #b27f0d)' : '#dc2626',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            border: `1px solid ${isActive ? '#fde68a' : '#fecaca'}`
                          }}>
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--brand-charcoal, #172025)', fontSize: '0.9rem' }}>
                              {user.name}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td style={{ fontSize: '0.85rem' }}>
                        {user.phone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text)' }}>
                            <span>📞</span> {user.phone}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Department & Role */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.5rem',
                            borderRadius: 12,
                            background: 'var(--color-surface-2, #f9f9fb)',
                            color: 'var(--brand-charcoal, #172025)',
                            border: '1px solid var(--color-border, #e4e4e7)'
                          }}>
                            {user.department || 'General'}
                          </span>
                          <span style={{
                            fontSize: '0.72rem',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            color: user.role === 'admin' ? 'var(--brand-amber, #b27f0d)' : 'var(--color-text-muted)'
                          }}>
                            {user.role}
                          </span>
                        </div>
                      </td>

                      {/* Location */}
                      <td style={{ fontSize: '0.85rem' }}>
                        {user.location ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span>📍</span> {user.location}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Status Toggle Switch / Badge */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user)}
                          title={`Click to ${isActive ? 'deactivate' : 'activate'} this account`}
                          style={{
                            background: isActive ? 'var(--color-success-bg, #f0fdf4)' : 'var(--color-error-bg, #fef2f2)',
                            color: isActive ? 'var(--color-success, #16a34a)' : 'var(--color-error, #dc2626)',
                            border: `1px solid ${isActive ? 'var(--color-success-border, #bbf7d0)' : 'var(--color-error-border, #fecaca)'}`,
                            padding: '0.25rem 0.65rem',
                            borderRadius: '16px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: isActive ? 'var(--color-success, #16a34a)' : 'var(--color-error, #dc2626)',
                            display: 'inline-block'
                          }} />
                          {isActive ? 'Active' : 'Deactivated'}
                        </button>
                      </td>

                      {/* Last Login */}
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {user.lastLoginAt ? (
                          <div>
                            <div>{formatDateTime(user.lastLoginAt)}</div>
                          </div>
                        ) : (
                          <span>Never</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            className="btn btn--outline btn--sm"
                            title="Edit User Info"
                            onClick={() => handleOpenEditModal(user)}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn btn--outline btn--sm"
                            title="Set or Reset Password"
                            onClick={() => { setPasswordUser(user); setNewPassword(''); }}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            🔑 Password
                          </button>
                          <button
                            className="btn btn--outline btn--sm"
                            title="Delete User"
                            onClick={() => setDeletingUser(user)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              color: 'var(--color-error, #dc2626)',
                              borderColor: 'var(--color-error-border, #fecaca)'
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Add User Modal ─── */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="➕ Register New Employee"
        >
          <form onSubmit={handleCreateUser}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <FormField label="Full Name *" required>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. John Doe"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </FormField>

              <FormField label="Corporate Email *" required>
                <input
                  type="email"
                  className="form-input"
                  placeholder="user@avanagroup.com"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              <FormField label="Phone Number">
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </FormField>

              <FormField label="Department">
                <input
                  type="text"
                  list="dept-list"
                  className="form-input"
                  placeholder="Select or enter department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
                <datalist id="dept-list">
                  {departmentOptions.map(d => <option key={d} value={d} />)}
                </datalist>
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              <FormField label="Role">
                <select
                  className="form-input"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Primary Location / Floor">
                <input
                  type="text"
                  list="location-list"
                  className="form-input"
                  placeholder="e.g. 5th Floor, Main Building"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
                <datalist id="location-list">
                  {locations.map(loc => <option key={loc.id || loc.name} value={loc.name} />)}
                </datalist>
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              <FormField label="Initial Password (Optional)" hint="Leave blank if employee logs in via Email OTP">
                <input
                  type="password"
                  className="form-input"
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </FormField>

              <FormField label="Account Status">
                <select
                  className="form-input"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active (Can Sign In)</option>
                  <option value="inactive">Inactive (Blocked)</option>
                </select>
              </FormField>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setIsAddModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Employee'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── Edit User Modal ─── */}
      {editingUser && (
        <Modal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          title={`✏️ Edit User: ${editingUser.name}`}
        >
          <form onSubmit={handleUpdateUser}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <FormField label="Full Name *" required>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </FormField>

              <FormField label="Email Address">
                <input
                  type="email"
                  className="form-input"
                  disabled
                  value={formData.email}
                  style={{ background: 'var(--color-surface-2)', cursor: 'not-allowed' }}
                />
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              <FormField label="Phone Number">
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </FormField>

              <FormField label="Department">
                <input
                  type="text"
                  list="dept-list-edit"
                  className="form-input"
                  placeholder="Select or enter department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
                <datalist id="dept-list-edit">
                  {departmentOptions.map(d => <option key={d} value={d} />)}
                </datalist>
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              <FormField label="Role">
                <select
                  className="form-input"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Primary Location / Floor">
                <input
                  type="text"
                  list="location-list-edit"
                  className="form-input"
                  placeholder="e.g. 5th Floor, Main Building"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
                <datalist id="location-list-edit">
                  {locations.map(loc => <option key={loc.id || loc.name} value={loc.name} />)}
                </datalist>
              </FormField>
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              <FormField label="Account Status">
                <select
                  className="form-input"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active (Permitted to sign in)</option>
                  <option value="inactive">Inactive (Deactivated & blocked from login)</option>
                </select>
              </FormField>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setEditingUser(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── Reset Password Modal ─── */}
      {passwordUser && (
        <Modal
          isOpen={!!passwordUser}
          onClose={() => setPasswordUser(null)}
          title={`🔑 Reset Password: ${passwordUser.name}`}
        >
          <form onSubmit={handleResetPassword}>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Set a new permanent login password for <strong>{passwordUser.email}</strong>.
              The employee can use this password to log in directly without OTP.
            </p>

            <FormField label="New Password *" required hint="Must be at least 6 characters long">
              <input
                type="password"
                className="form-input"
                placeholder="Enter new password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setPasswordUser(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={submitting}
              >
                {submitting ? 'Updating...' : 'Set Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── Confirm Delete Modal ─── */}
      {deletingUser && (
        <ConfirmModal
          isOpen={!!deletingUser}
          onClose={() => setDeletingUser(null)}
          onConfirm={handleDeleteUser}
          title="Delete Employee Account"
          message={`Are you sure you want to remove "${deletingUser.name}" (${deletingUser.email}) from the portal directory? Their stored login credentials will also be permanently deleted.`}
          confirmLabel={submitting ? 'Deleting...' : 'Delete User'}
          confirmVariant="danger"
        />
      )}
    </div>
  );
}
