const crypto = require('crypto');
const prisma = require('../config/db');

// Ensure PortalUser table exists in SQLite & sync existing employee credentials
async function ensurePortalUserTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PortalUser" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT UNIQUE NOT NULL,
        "phone" TEXT,
        "department" TEXT,
        "role" TEXT NOT NULL DEFAULT 'employee',
        "location" TEXT,
        "status" TEXT NOT NULL DEFAULT 'active',
        "passwordHash" TEXT,
        "lastLoginAt" TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      );
    `);
  } catch (e) {
    console.error('[UserManagement] Table check error:', e);
  }

  // Seed / sync existing EmployeeCredential emails so existing employees exist in PortalUser
  try {
    const existingCreds = await prisma.employeeCredential.findMany();
    for (const cred of existingCreds) {
      const email = cred.email.toLowerCase();
      const exists = await prisma.portalUser.findUnique({ where: { email } });
      if (!exists) {
        const defaultName = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        await prisma.portalUser.create({
          data: {
            id: crypto.randomUUID(),
            name: defaultName,
            email,
            role: 'employee',
            status: 'active',
            passwordHash: cred.passwordHash,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        });
        console.log(`[UserManagement] Seeded existing employee: ${email}`);
      }
    }
  } catch (e) {
    console.error('[UserManagement] Sync credentials error:', e);
  }
}

ensurePortalUserTable();

// Hash password helper using PBKDF2 (matching employee-auth.controller)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

exports.getUsers = async ({ search, department, role, status } = {}) => {
  const where = {};

  if (department && department !== 'all') {
    where.department = department;
  }
  if (role && role !== 'all') {
    where.role = role;
  }
  if (status && status !== 'all') {
    where.status = status;
  }

  let users = await prisma.portalUser.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      department: true,
      role: true,
      location: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    users = users.filter(u =>
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q))
    );
  }

  return users;
};

exports.getUserById = async (id) => {
  return await prisma.portalUser.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      department: true,
      role: true,
      location: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true
    }
  });
};

exports.createUser = async (data) => {
  const emailLower = (data.email || '').trim().toLowerCase();
  if (!emailLower) throw new Error('Email address is required.');
  if (!data.name || !data.name.trim()) throw new Error('Full Name is required.');

  const existing = await prisma.portalUser.findUnique({ where: { email: emailLower } });
  if (existing) {
    throw new Error(`A user with email "${emailLower}" already exists.`);
  }

  let passwordHash = null;
  if (data.password && data.password.trim()) {
    if (data.password.length < 6) throw new Error('Password must be at least 6 characters.');
    passwordHash = hashPassword(data.password.trim());
    await prisma.employeeCredential.upsert({
      where: { email: emailLower },
      update: { passwordHash },
      create: { email: emailLower, passwordHash }
    });
  }

  const now = new Date().toISOString();
  const user = await prisma.portalUser.create({
    data: {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      email: emailLower,
      phone: (data.phone || '').trim() || null,
      department: (data.department || '').trim() || null,
      role: (data.role || 'employee').toLowerCase(),
      location: (data.location || '').trim() || null,
      status: data.status === 'inactive' ? 'inactive' : 'active',
      passwordHash,
      createdAt: now,
      updatedAt: now
    }
  });

  return user;
};

exports.updateUser = async (id, data) => {
  const existing = await prisma.portalUser.findUnique({ where: { id } });
  if (!existing) throw new Error('User not found.');

  const updatePayload = {
    name: data.name ? data.name.trim() : existing.name,
    phone: data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : existing.phone,
    department: data.department !== undefined ? (data.department ? data.department.trim() : null) : existing.department,
    role: data.role ? data.role.toLowerCase() : existing.role,
    location: data.location !== undefined ? (data.location ? data.location.trim() : null) : existing.location,
    status: data.status ? (data.status === 'inactive' ? 'inactive' : 'active') : existing.status,
    updatedAt: new Date().toISOString()
  };

  return await prisma.portalUser.update({
    where: { id },
    data: updatePayload
  });
};

exports.toggleUserStatus = async (id, status) => {
  const newStatus = status === 'inactive' ? 'inactive' : 'active';
  return await prisma.portalUser.update({
    where: { id },
    data: { status: newStatus, updatedAt: new Date().toISOString() }
  });
};

exports.resetPassword = async (id, newPassword) => {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const user = await prisma.portalUser.findUnique({ where: { id } });
  if (!user) throw new Error('User not found.');

  const passwordHash = hashPassword(newPassword.trim());
  const now = new Date().toISOString();

  await prisma.portalUser.update({
    where: { id },
    data: { passwordHash, updatedAt: now }
  });

  await prisma.employeeCredential.upsert({
    where: { email: user.email.toLowerCase() },
    update: { passwordHash },
    create: { email: user.email.toLowerCase(), passwordHash }
  });

  return { success: true };
};

exports.deleteUser = async (id) => {
  const user = await prisma.portalUser.findUnique({ where: { id } });
  if (!user) throw new Error('User not found.');

  await prisma.portalUser.delete({ where: { id } });
  await prisma.employeeCredential.deleteMany({ where: { email: user.email.toLowerCase() } });

  return { success: true };
};

exports.recordLogin = async (email) => {
  try {
    const emailLower = email.toLowerCase();
    const user = await prisma.portalUser.findUnique({ where: { email: emailLower } });
    const now = new Date().toISOString();
    if (user) {
      await prisma.portalUser.update({
        where: { id: user.id },
        data: { lastLoginAt: now }
      });
    } else {
      // Auto-provision active user for legitimate logins so they appear in directory
      const defaultName = emailLower.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      await prisma.portalUser.create({
        data: {
          id: crypto.randomUUID(),
          name: defaultName,
          email: emailLower,
          role: 'employee',
          status: 'active',
          lastLoginAt: now,
          createdAt: now,
          updatedAt: now
        }
      });
    }
  } catch (err) {
    console.error('[UserManagement] recordLogin error:', err);
  }
};

exports.isUserActive = async (email) => {
  try {
    const user = await prisma.portalUser.findUnique({
      where: { email: email.toLowerCase() }
    });
    if (!user) return true; // not explicitly deactivated
    return user.status === 'active';
  } catch {
    return true;
  }
};
