import { lazy } from 'react';

/** Route-level code splitting — only load the active module. */
export const DashboardView = lazy(() => import('./views/DashboardView').then(m => ({ default: m.DashboardView })));
export const RecruitView = lazy(() => import('./views/RecruitView').then(m => ({ default: m.RecruitView })));
export const PayrollView = lazy(() => import('./views/PayrollView').then(m => ({ default: m.PayrollView })));
export const AssetsView = lazy(() => import('./views/AssetsView').then(m => ({ default: m.AssetsView })));
export const ProjectsView = lazy(() => import('./views/ProjectsView').then(m => ({ default: m.ProjectsView })));
export const TasksView = lazy(() => import('./views/TasksView').then(m => ({ default: m.TasksView })));
export const LearningView = lazy(() => import('./views/LearningView').then(m => ({ default: m.LearningView })));
export const ChatView = lazy(() =>
  import('./views/ChatViewWired').then(m => ({ default: m.ChatViewWired })),
);
export const SurveyView = lazy(() => import('./views/SurveyView').then(m => ({ default: m.SurveyView })));
export const FieldView = lazy(() => import('./views/FieldView').then(m => ({ default: m.FieldView })));
export const CRMView = lazy(() => import('./views/CRMView').then(m => ({ default: m.CRMView })));
export const FinanceView = lazy(() => import('./views/FinanceView').then(m => ({ default: m.FinanceView })));
export const AIView = lazy(() => import('./views/AIViewWired').then(m => ({ default: m.AIViewWired })));
export const PerformanceView = lazy(() => import('./views/Performance').then(m => ({ default: m.PerformanceView })));
export const LeaderboardView = lazy(() => import('./views/LeaderboardView').then(m => ({ default: m.LeaderboardView })));
export const PeopleView = lazy(() => import('./views/PeopleView').then(m => ({ default: m.PeopleView })));
export const AttendanceView = lazy(() => import('./views/AttendanceView').then(m => ({ default: m.AttendanceView })));
export const CommunityView = lazy(() => import('./views/CommunityView').then(m => ({ default: m.CommunityView })));
export const HelpDeskView = lazy(() => import('./views/HelpDeskView').then(m => ({ default: m.HelpDeskView })));
export const ReportsView = lazy(() => import('./views/ReportsView').then(m => ({ default: m.ReportsView })));
export const RewardsView = lazy(() => import('./views/RewardsView').then(m => ({ default: m.RewardsView })));
export const EmployeeManagementView = lazy(() => import('./views/EmployeeManagementView').then(m => ({ default: m.EmployeeManagementView })));
export const LeaveManagementView = lazy(() => import('./views/LeaveManagementView').then(m => ({ default: m.LeaveManagementView })));
export const DocumentsView = lazy(() => import('./views/DocumentsView').then(m => ({ default: m.DocumentsView })));
export const ProfileView = lazy(() => import('./views/ProfileView').then(m => ({ default: m.ProfileView })));
export const SettingsView = lazy(() => import('./views/SettingsView').then(m => ({ default: m.SettingsView })));
export const SecurityView = lazy(() => import('./views/SecurityView').then(m => ({ default: m.SecurityView })));
export const RolesView = lazy(() => import('./views/RolesView').then(m => ({ default: m.RolesView })));
export const NotificationsView = lazy(() => import('./views/NotificationsView').then(m => ({ default: m.NotificationsView })));
export const OnboardingView = lazy(() => import('./views/OnboardingView').then(m => ({ default: m.OnboardingView })));
export const OffboardingView = lazy(() => import('./views/OffboardingView').then(m => ({ default: m.OffboardingView })));
export const ExpensesView = lazy(() => import('./views/ExpensesView').then(m => ({ default: m.ExpensesView })));
export const OrgChartView = lazy(() => import('./views/OrgChartView').then(m => ({ default: m.OrgChartView })));
export const HolidaysView = lazy(() => import('./views/HolidaysView').then(m => ({ default: m.HolidaysView })));
export const TimesheetsView = lazy(() => import('./views/TimesheetsView').then(m => ({ default: m.TimesheetsView })));
export const PoliciesView = lazy(() => import('./views/PoliciesView').then(m => ({ default: m.PoliciesView })));
export const BenefitsView = lazy(() => import('./views/BenefitsView').then(m => ({ default: m.BenefitsView })));
export const TaxComplianceView = lazy(() => import('./views/TaxComplianceView').then(m => ({ default: m.TaxComplianceView })));
export const FloatingChatWidget = lazy(() => import('./components/FloatingChatWidget').then(m => ({ default: m.FloatingChatWidget })));