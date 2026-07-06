import React, { useState } from 'react';
import { useRBACStore } from '../../store';
import { DashboardTab } from './DashboardTab';
import { ObjectivesTab } from './ObjectivesTab';
import { ProductivityTab } from './ProductivityTab';
import { SkillsTab } from './SkillsTab';
import { ReviewsTab } from './ReviewsTab';

import { AICoachTab } from './AICoachTab';
import { ManagerTab } from './ManagerTab';
import { cn } from '../../utils';
import { LayoutDashboard, Target, Zap, BookOpen, MessageSquare, Award, Brain, Users } from 'lucide-react';

export function PerformanceView() {
  const { viewMode } = useRBACStore();
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'objectives', label: 'KPIs & OKRs', icon: Target },
    { id: 'productivity', label: 'Productivity & Quality', icon: Zap },
    { id: 'skills', label: 'Skills & Learning', icon: BookOpen },
    { id: 'reviews', label: 'Reviews & Feedback', icon: MessageSquare },
    
    { id: 'ai-coach', label: 'AI Coach', icon: Brain },
  ];

  if (viewMode === 'manager') {
    tabs.push({ id: 'manager', label: 'Manager Dashboard', icon: Users });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Performance Management</h2>
          <p className="text-sm text-gray-500 mt-1">Track, measure, and improve with House of Kaala formula</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 relative items-start">
        {/* Horizontal Tabs */}
        <div className="w-full flex overflow-x-auto no-scrollbar gap-2 pb-2 shrink-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shrink-0",
                  isActive 
                    ? "bg-ink text-white shadow-md shadow-maroon-900/20" 
                    : "bg-white text-maroon-700/80 hover:bg-maroon-50 border border-maroon-100"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-maroon-200" : "text-maroon-400")} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Area */}
        <div className="w-full min-w-0 pb-12">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'objectives' && <ObjectivesTab />}
          {activeTab === 'productivity' && <ProductivityTab />}
          {activeTab === 'skills' && <SkillsTab />}
          {activeTab === 'reviews' && <ReviewsTab />}
          
          {activeTab === 'ai-coach' && <AICoachTab />}
          {activeTab === 'manager' && viewMode === 'manager' && <ManagerTab />}
        </div>
      </div>
    </div>
  );
}
