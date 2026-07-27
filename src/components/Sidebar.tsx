import React from 'react';
import { BookOpen, Sparkles, FolderSync, Mic, BarChart3, DownloadCloud, Settings, HelpCircle, ClipboardCheck } from 'lucide-react';
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
    { id: 'mock', label: '阶段模考', icon: ClipboardCheck },
    { id: 'review', label: '复习队列', icon: FolderSync },
    { id: 'speaking', label: '口语重说', icon: Mic },
    { id: 'progress', label: '能力进展', icon: BarChart3 },
    { id: 'import', label: '材料导入', icon: DownloadCloud },
  ] as const;

  return (
    <aside className="app-page-surface ui-sidebar sticky top-0 z-40 flex h-auto w-full shrink-0 flex-col border-b lg:h-screen lg:w-64 lg:justify-between lg:border-b-0 lg:border-r select-none">
      <div className="flex flex-col">
        <div className="flex items-center space-x-3 p-3 lg:px-6 lg:pb-5 lg:pt-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#003178] text-sm font-semibold text-white shadow-sm lg:h-10 lg:w-10">
            学
          </div>
          <div className="overflow-hidden">
            <h1 className="truncate text-sm font-bold tracking-tight text-[#003178]">英语训练舱</h1>
            <p className="mt-0.5 hidden text-[11px] font-medium text-[#64748b] sm:block">学习记录自动保存</p>
          </div>
        </div>

        <div className="hidden lg:block px-4 mb-2">
          <div className="h-[1px] w-full bg-[#e2e8f0]" />
        </div>

        <nav className="px-3 pb-3 lg:p-3 flex lg:block gap-2 lg:space-y-1 overflow-x-auto overscroll-x-contain">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`ui-sidebar-item shrink-0 min-w-[116px] px-3 py-2.5 text-left text-xs font-semibold lg:w-full lg:min-w-0 lg:px-4 lg:py-3 ${
                  isActive ? 'ui-sidebar-item-active font-bold' : ''
                }`}
              >
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-[#003178]' : 'text-[#64748b]'}`} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-3 pb-3 lg:p-3 lg:pb-6">
        <div className="flex lg:block gap-2 lg:space-y-1 overflow-x-auto overscroll-x-contain">
          <button
            onClick={() => setActiveTab('settings')}
            className={`ui-sidebar-item min-w-fit px-3 py-2.5 text-left text-xs font-semibold lg:w-full lg:px-4 lg:py-3 ${
              activeTab === 'settings' ? 'ui-sidebar-item-active font-bold' : ''
            }`}
          >
            <Settings className={`h-4.5 w-4.5 ${activeTab === 'settings' ? 'text-[#003178]' : 'text-[#64748b]'}`} />
            <span className="font-semibold whitespace-nowrap">设置</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('today');
              if (onTriggerModal) {
                onTriggerModal(
                  "使用帮助",
                  "英语训练舱当前聚焦 CET-4 首发场景，并按多考试训练系统预留架构。\n\n1. 点击今日标题旁的“入门能力诊断”建立初始能力画像。\n\n2. 点击左侧导航在专项练习、阶段模考、复习队列、口语重说和能力进展间切换；已答题目可在专项练习中回看。\n\n学习记录会自动保存到服务端，当前浏览器 IndexedDB 只作为离线副本；启用 AI 分析时会发送必要文本用于生成反馈。"
                );
              }
            }}
            className="ui-sidebar-item min-w-fit px-3 py-2.5 text-left text-xs font-semibold lg:w-full lg:px-4 lg:py-3"
          >
            <HelpCircle className="h-4.5 w-4.5 text-[#64748b]" />
            <span className="font-semibold whitespace-nowrap">帮助</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
