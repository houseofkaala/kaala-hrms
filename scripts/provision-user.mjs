#!/usr/bin/env node
/**
 * Add or update a user in store.json without touching other data.
 * Usage: node scripts/provision-user.mjs
 */
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

const DATA_PATH = process.env.DATA_PATH || path.join(process.cwd(), 'data', 'store.json');

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(plain, salt, 64, SCRYPT_PARAMS);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

const USER = {
  id: 'ea-nehal-1',
  name: 'Nehal Dhamecha',
  email: 'nehal@bymarketingonly.com',
  password: process.env.PROVISION_PASSWORD || 'Nehal@KA2026!',
  role: 'executive_assistant',
  department: 'Executive',
  title: 'Executive Assistant',
  joinDate: '2026-07-13',
  phone: '',
  points: 1000,
  status: 'Active',
  managerId: 'admin-1',
  employmentType: 'Full-Time',
  projects: ['Executive Operations'],
};

const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
if (!raw.crmLeads) raw.crmLeads = [];

const idx = raw.users.findIndex(u => u.email?.toLowerCase() === USER.email.toLowerCase());
const record = {
  ...(idx >= 0 ? raw.users[idx] : {}),
  ...USER,
  password: hashPassword(USER.password),
  preferences: { emailNotifications: true, timezone: 'Asia/Kolkata' },
};

if (idx >= 0) {
  raw.users[idx] = record;
  console.log('Updated existing user:', USER.email);
} else {
  raw.users.push(record);
  console.log('Created user:', USER.email);
}

if (!raw.rolePermissions?.executive_assistant) {
  raw.rolePermissions = raw.rolePermissions || {};
  raw.rolePermissions.executive_assistant = {
    modules: [
      'dashboard', 'crm', 'people', 'documents', 'tasks', 'projects', 'chat', 'ai',
      'attendance', 'leave', 'timesheets', 'field', 'expenses', 'profile', 'notifications', 'settings',
    ],
    description: 'Executive Assistant — CRM, pipeline, and executive support',
  };
}

for (const role of ['sales', 'executive_assistant', 'manager', 'admin']) {
  const cfg = raw.rolePermissions[role];
  if (!cfg) continue;
  if (cfg.modules.includes('*')) continue;
  if (!cfg.modules.includes('crm')) cfg.modules.push('crm');
}

fs.writeFileSync(DATA_PATH, JSON.stringify(raw, null, 2));
console.log('Login: https://sales.bymarketingonly.com/login');
console.log('Email:', USER.email);
console.log('Password:', USER.password);
console.log('Join date:', USER.joinDate);