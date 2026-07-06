import React from 'react';
import { Brain, ArrowUpRight, AlertTriangle, ShieldCheck } from 'lucide-react';

export function AICoachTab() {
  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <Brain className="w-8 h-8 text-indigo-400" />
            <h3 className="text-xl font-semibold text-white">AI Performance Coach</h3>
          </div>
          
          <p className="text-gray-300 text-sm leading-relaxed mb-8 max-w-2xl">
            Based on your data over the last 90 days, you are performing exceptionally well. Your consistency in quality and timely delivery sets you apart. Here are my observations and recommendations to help you reach the next level.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-semibold text-white">Promotion Probability</h4>
              </div>
              <div className="text-3xl font-bold text-white mb-2">85%</div>
              <p className="text-xs text-gray-400">High probability of promotion to Senior Editor within 6 months based on current trajectory.</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <h4 className="text-sm font-semibold text-white">Productivity Analysis</h4>
              </div>
              <div className="text-3xl font-bold text-white mb-2">Optimal</div>
              <p className="text-xs text-gray-400">Focus hours have increased by 15%. Keep dedicating mornings to deep work.</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h4 className="text-sm font-semibold text-white">Risk Analysis</h4>
              </div>
              <div className="text-3xl font-bold text-white mb-2">Low</div>
              <p className="text-xs text-gray-400">No major burnout risks detected. Work-life balance appears healthy with low overtime.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-6">Actionable Suggestions</h3>
        <div className="space-y-4">
          <div className="p-4 border border-gray-100 rounded-xl flex gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex flex-col items-center justify-center shrink-0">
              <span className="text-indigo-600 font-bold text-sm">1</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-1">Take the "Leadership Basics" Course</h4>
              <p className="text-sm text-gray-600">You're technically ready for a senior role, but demonstrating leadership skills is the next step. Completing this course will boost your profile.</p>
            </div>
          </div>
          <div className="p-4 border border-gray-100 rounded-xl flex gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex flex-col items-center justify-center shrink-0">
              <span className="text-indigo-600 font-bold text-sm">2</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-1">Mentor a Junior Editor</h4>
              <p className="text-sm text-gray-600">Your peer feedback scores are excellent. Formalizing this into a mentorship role will increase your 360° score and recognition points.</p>
            </div>
          </div>
          <div className="p-4 border border-gray-100 rounded-xl flex gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex flex-col items-center justify-center shrink-0">
              <span className="text-indigo-600 font-bold text-sm">3</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-1">Standardize Client Communication</h4>
              <p className="text-sm text-gray-600">While client satisfaction is high (4.9/5), minor delays in initial responses were noted. Creating templates might streamline this process.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
