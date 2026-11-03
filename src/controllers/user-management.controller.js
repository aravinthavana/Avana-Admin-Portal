const userManagementService = require('../services/user-management.service');

exports.getUsers = async (req, res) => {
  try {
    const { search, department, role, status } = req.query;
    const users = await userManagementService.getUsers({ search, department, role, status });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('[UserManagementController] getUsers error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch users' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await userManagementService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('[UserManagementController] getUserById error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch user' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const user = await userManagementService.createUser(req.body);
    res.status(201).json({ success: true, data: user, message: 'User created successfully' });
  } catch (error) {
    console.error('[UserManagementController] createUser error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to create user' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await userManagementService.updateUser(req.params.id, req.body);
    res.status(200).json({ success: true, data: user, message: 'User updated successfully' });
  } catch (error) {
    console.error('[UserManagementController] updateUser error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to update user' });
  }
};

exports.toggleStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const user = await userManagementService.toggleUserStatus(req.params.id, status);
    res.status(200).json({ success: true, data: user, message: `User marked as ${user.status}` });
  } catch (error) {
    console.error('[UserManagementController] toggleStatus error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to change status' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    await userManagementService.resetPassword(req.params.id, password);
    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('[UserManagementController] resetPassword error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to reset password' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await userManagementService.deleteUser(req.params.id);
    res.status(200).json({ success: true, message: 'User removed successfully' });
  } catch (error) {
    console.error('[UserManagementController] deleteUser error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to delete user' });
  }
};
