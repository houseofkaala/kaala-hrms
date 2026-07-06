# House of Kaala HRMS

Complete Human Resource Management System with 20+ integrated modules, Kaala Reward Marketplace, and role-based access control.

## Prerequisites

- Node.js 20+

## Quick Start

```bash
cd house-of-kaala-hrms
npm install
npm run dev
```

Open **http://localhost:3000** and sign in:

| Role     | Email                | Password  |
|----------|----------------------|-----------|
| Employee | john.doe@kaala.io    | Demo@123  |
| Manager  | mike.m@kaala.io      | Demo@123  |
| Admin    | alice.a@kaala.io     | Admin@123 |

## Features

### Core HR Modules
- **Command Center** — Dashboard with tasks, audit stream, manager review queue
- **Employee Management** — HR employee records (manager/admin)
- **People Directory** — Organization-wide people search
- **Leave Management** — Request and approve time off
- **Documents** — Employee document storage
- **Attendance** — Clock in/out, regularization, overtime
- **Payroll, Assets, Projects, Tasks, Performance, Learning**

### Culture & Rewards
- **Reward Marketplace** — Claim SLA-breached tasks for Kaala Points
- **Rewards & Leaderboard** — Points tracking and rankings
- **Community, Help Desk, Chat, Kaala AI**

### Administration
- **Settings** — Organization configuration (admin)
- **Role & Permission Management** — Assign roles (admin)
- **User Profile** — Personal info and preferences
- **Notifications** — In-app notification center with bell dropdown

## Security

- JWT session tokens required for all `/api/*` routes (except login)
- Admin endpoints (`/api/admin/*`) require admin role
- Attendance actions derive user from session (no userId override)
- Role-based UI visibility (manager view toggle)

## URL Routing

Each module has a dedicated route for deep linking and refresh persistence:

| Module | Route |
|--------|-------|
| Command Center | `/dashboard` |
| Employee Management | `/employees` |
| Leave Management | `/leave` |
| Documents | `/documents` |
| Settings | `/settings` |
| User Profile | `/profile` |
| Notifications | `/notifications` |
| Role & Permissions | `/roles` |

## Kaala Reward Marketplace Rules

- Every employee starts with **1000 Kaala Points**
- **Friday 6:30 PM:** incomplete tasks move to marketplace (-10 pts each)
- Claim tasks for +10 pts; complete by **Sunday 11:59 PM** for +10 more
- Missed deadlines: **-50 pts**, task returns to marketplace

## Production Build

```bash
npm run build
npm start
```

## Optional: Gemini AI

Set `GEMINI_API_KEY` in `.env.local` for Kaala AI assistant features.