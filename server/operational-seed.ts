import type { Database } from './db';

/** Seed company-wide content when production DB has empty module data. */
export function seedOperationalContent(db: Database) {
  if (!db.courses?.length) {
    db.courses = [
      { id: 'c1', title: 'Security Awareness Training', duration: '45 min', required: true, enrolled: [] },
      { id: 'c2', title: 'Workplace Ethics & Conduct', duration: '30 min', required: true, enrolled: [] },
      { id: 'c3', title: 'Time Management Essentials', duration: '20 min', required: false, enrolled: [] },
      { id: 'c4', title: 'Client Communication Skills', duration: '35 min', required: false, enrolled: [] },
    ];
  }

  if (!db.surveys?.length) {
    db.surveys = [
      {
        id: 'sv1',
        title: 'Quarterly Engagement Pulse',
        description: 'Tell us how you feel about your work, team, and growth this quarter.',
        dueIn: '7 days',
        responses: [],
      },
      {
        id: 'sv2',
        title: 'Manager & Team Support',
        description: 'Share feedback on leadership support and collaboration.',
        dueIn: '14 days',
        responses: [],
      },
    ];
  }

  if (!db.polls?.length) {
    db.polls = [
      {
        id: 'p1',
        question: 'What team outing would you prefer?',
        options: [
          { label: 'Outdoor picnic', votes: 0 },
          { label: 'Game night', votes: 0 },
          { label: 'Creative workshop', votes: 0 },
        ],
        voters: [],
      },
    ];
  }

  if (!db.events?.length) {
    db.events = [
      { id: 'ev1', title: 'All-Hands Meeting', date: '2026-07-15', time: '11:00 AM', location: 'Main Office' },
      { id: 'ev2', title: 'Team Building Day', date: '2026-08-02', time: '10:00 AM', location: 'TBD' },
    ];
  }
}