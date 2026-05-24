import React from 'react';
import { BookOpen, Sparkles, FolderSync, Mic, BarChart3, DownloadCloud, Settings, HelpCircle, Rocket } from 'lucide-react';
import { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  examCountdown: number;
  onTriggerModal?: (title: string, body: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab, examCountdown, onTriggerModal }: SidebarProps) {
  const menuItems = [
    { id: 'today', label: '今日训练', icon: BookOpen },
    { id: 'practice', label: '专项练习', icon: Sparkles },
    { id: 'review', label: '复习队列', icon: FolderSync },
    { id: 'speaking', label: '口语重说', icon: Mic },
    { id: 'progress', label: '能力进展', icon: BarChart3 },
    { id: 'import', label: '材料导入', icon: DownloadCloud },
  ] as const;

  return (
    <aside className="w-64 bg-[#ebf4f9] border-r border-[#c3c6d4] flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none">
      <div className="flex flex-col">
        {/* Profile Branding Header as shown in the screenshot */}
        <div className="p-6 pb-5 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-[#003178] hover:bg-[#0d47a1] text-white font-semibold flex items-center justify-center text-sm shadow-sm shrink-0">
            学
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-sm text-[#003178] tracking-tight truncate">英语训练舱</h1>
            <p className="text-[11px] text-[#434652] font-medium mt-0.5">本地学习中</p>
          </div>
        </div>

        {/* Separator */}
        <div className="px-4 mb-2">
          <div className="h-[1px] bg-[#d5e7f2] w-full" />
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-150 relative group text-left ${
                  isActive
                    ? 'bg-[#dbf1fe]/80 text-[#003178] font-bold'
                    : 'text-[#434652] hover:bg-[#dbf1fe]/40 hover:text-[#003178]'
                }`}
              >
                {isActive && (
                  <div className="absolute right-0 top-3 bottom-3 w-[3px] bg-[#0d47a1] rounded-l" />
                )}
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-[#003178]' : 'text-[#434652] group-hover:text-[#003178]'}`} />
                <span className="text-xs font-semibold">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Settings Area matching the screenshot */}
      <div className="p-3 pb-6">
        <div className="space-y-1">
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 text-xs rounded-xl transition-all relative text-left ${
              activeTab === 'settings'
                ? 'bg-[#dbf1fe]/80 text-[#003178] font-bold border-r-[3px] border-[#0d47a1] rounded-r-none'
                : 'text-[#434652] hover:bg-[#dbf1fe]/40'
            }`}
          >
            <Settings className={`h-4.5 w-4.5 ${activeTab === 'settings' ? 'text-[#003178]' : 'text-[#434652]'}`} />
            <span className="font-semibold">设置</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('today');
              if (onTriggerModal) {
                onTriggerModal(
                  "使用帮助",
                  "英语训练舱当前聚焦 CET-4 首发场景，并按多考试训练系统预留架构。\n\n1. 点击今日标题旁的“AI自适应能力诊断”开启能力测评。\n\n2. 点击左侧导航在专项练习、精听长对话、口语纠错重说和错题复习间切换。\n\n学习记录默认保存在当前浏览器 IndexedDB 中；启用 AI 分析时会发送必要文本用于生成反馈。"
                );
              }
            }}
            className="w-full flex items-center space-x-3 px-4 py-3 text-xs text-[#434652] hover:bg-[#dbf1fe]/40 rounded-xl transition-all text-left"
          >
            <HelpCircle className="h-4.5 w-4.5 text-[#434652]" />
            <span className="font-semibold">帮助</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
