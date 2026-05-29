import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  KeyRound,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import type { PublicSaasAccountContext } from './SaasAccountPanel';
import { SelectField } from './controls/FormControls';

interface SaasOperationsPanelProps {
  token: string;
  account: PublicSaasAccountContext;
  onStatus: (message: string) => void;
}

interface PublicSession {
  id: string;
  current: boolean;
  active: boolean;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt: string;
  revokedAt?: string;
  userAgent?: string;
  ipAddress?: string;
}

interface WorkspaceMember {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'member';
  createdAt: string;
  lastLoginAt?: string;
}

interface WorkspaceInvitation {
  id: string;
  email: string;
  role: 'owner' | 'member';
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

interface AdminOverview {
  members: number;
  pendingInvitations: number;
  learningSnapshots: number;
  learningEntities: number;
  activeSessions: number;
  contentAssets: number;
  blockedContentAssets: number;
  openDataRequests: number;
}

interface ContentAsset {
  id: string;
  title: string;
  assetType: 'reading' | 'listening' | 'writing' | 'translation' | 'speaking';
  sourceType: 'original' | 'licensed' | 'user-imported' | 'ai-generated';
  licenseStatus: 'draft' | 'cleared' | 'needs_review' | 'blocked';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface DataRequest {
  id: string;
  userId: string;
  requester?: {
    name: string;
    email: string;
  };
  requestType: 'export' | 'delete';
  status: 'queued' | 'processing' | 'completed' | 'rejected';
  note?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface OperationalSummary {
  overview: AdminOverview;
  store: 'memory' | 'file' | 'postgres';
  observability: {
    api: { requestsTotal: number; errorsTotal: number; errorRate: number };
    ai: { requestsTotal: number; fallbacksTotal: number; fallbackRate: number; averageLatencyMs: number };
  };
}

const assetTypeLabels: Record<ContentAsset['assetType'], string> = {
  reading: '阅读',
  listening: '听力',
  writing: '写作',
  translation: '翻译',
  speaking: '口语',
};

const sourceTypeLabels: Record<ContentAsset['sourceType'], string> = {
  original: '原创',
  licensed: '已授权',
  'user-imported': '用户导入',
  'ai-generated': 'AI 模拟',
};

const licenseStatusLabels: Record<ContentAsset['licenseStatus'], string> = {
  draft: '草稿',
  cleared: '可发布',
  needs_review: '待审核',
  blocked: '已阻断',
};

async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(payload.message || `请求失败：${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function formatDate(value?: string) {
  if (!value) return '暂无';
  return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function compactDeviceLabel(userAgent?: string) {
  if (!userAgent) return '未知设备';
  if (userAgent.includes('Edg/')) return 'Microsoft Edge';
  if (userAgent.includes('Chrome/')) return 'Chrome / Chromium';
  if (userAgent.includes('Firefox/')) return 'Firefox';
  if (userAgent.includes('Safari/')) return 'Safari';
  return userAgent.slice(0, 42);
}

export default function SaasOperationsPanel({ token, account, onStatus }: SaasOperationsPanelProps) {
  const [sessions, setSessions] = useState<PublicSession[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [operationalSummary, setOperationalSummary] = useState<OperationalSummary | null>(null);
  const [contentAssets, setContentAssets] = useState<ContentAsset[]>([]);
  const [dataRequests, setDataRequests] = useState<DataRequest[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [contentTitle, setContentTitle] = useState('CET-4 原创阅读模拟题');
  const [contentAssetType, setContentAssetType] = useState<ContentAsset['assetType']>('reading');
  const [contentSourceType, setContentSourceType] = useState<ContentAsset['sourceType']>('original');
  const [contentLicenseStatus, setContentLicenseStatus] = useState<ContentAsset['licenseStatus']>('needs_review');
  const [contentNotes, setContentNotes] = useState('首发仅使用原创/模拟材料，待授权确认后再扩大公开范围。');
  const isOwner = account.user.role === 'owner';

  const loadOperations = async () => {
    const [sessionPayload, workspacePayload, dataRequestPayload] = await Promise.all([
      apiRequest<{ sessions: PublicSession[] }>('/api/auth/sessions', {}, token),
      apiRequest<{ members: WorkspaceMember[]; invitations: WorkspaceInvitation[] }>('/api/workspace/members', {}, token),
      apiRequest<{ requests: DataRequest[] }>('/api/compliance/data-requests', {}, token),
    ]);
    setSessions(sessionPayload.sessions);
    setMembers(workspacePayload.members);
    setInvitations(workspacePayload.invitations);
    setDataRequests(dataRequestPayload.requests);

    if (isOwner) {
      const [overviewPayload, opsPayload, contentPayload] = await Promise.all([
        apiRequest<{ overview: AdminOverview }>('/api/admin/overview', {}, token),
        apiRequest<OperationalSummary>('/api/admin/operational-summary', {}, token),
        apiRequest<{ assets: ContentAsset[] }>('/api/admin/content-assets', {}, token),
      ]);
      setOverview(overviewPayload.overview);
      setOperationalSummary(opsPayload);
      setContentAssets(contentPayload.assets);
    }
  };

  useEffect(() => {
    loadOperations().catch((error) => {
      onStatus(error instanceof Error ? error.message : '团队控制台加载失败。');
    });
  }, [token, account.user.role]);

  const runAction = async (message: string, action: () => Promise<void>) => {
    setIsBusy(true);
    try {
      await action();
      await loadOperations();
      onStatus(message);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : '操作失败，请稍后重试。');
    } finally {
      setIsBusy(false);
    }
  };

  const inviteMember = () => runAction('团队邀请已创建，请复制邀请链接给成员。', async () => {
    const response = await apiRequest<{ invitationUrl: string }>(
      '/api/workspace/invitations',
      { method: 'POST', body: JSON.stringify({ email: inviteEmail, role: 'member' }) },
      token,
    );
    setInviteLink(response.invitationUrl);
    setInviteEmail('');
  });

  const revokeSession = (sessionId: string) => runAction('指定设备会话已撤销。', async () => {
    await apiRequest(`/api/auth/sessions/${sessionId}`, { method: 'DELETE' }, token);
  });

  const createContentAsset = () => runAction('内容资产已登记，授权状态进入可追踪流程。', async () => {
    await apiRequest('/api/admin/content-assets', {
      method: 'POST',
      body: JSON.stringify({
        title: contentTitle,
        assetType: contentAssetType,
        sourceType: contentSourceType,
        licenseStatus: contentLicenseStatus,
        notes: contentNotes,
      }),
    }, token);
  });

  const updateContentAsset = (asset: ContentAsset, licenseStatus: ContentAsset['licenseStatus']) => runAction('内容授权状态已更新。', async () => {
    await apiRequest(`/api/admin/content-assets/${asset.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ licenseStatus, notes: asset.notes }),
    }, token);
  });

  const createDataRequest = (requestType: DataRequest['requestType']) => runAction('数据权利请求已提交，团队所有者可在合规队列处理。', async () => {
    await apiRequest('/api/compliance/data-requests', {
      method: 'POST',
      body: JSON.stringify({
        requestType,
        note: requestType === 'export' ? '用户请求导出云端学习档案。' : '用户请求删除云端学习档案。',
      }),
    }, token);
  });

  const downloadCloudArchive = () => runAction('云端个人档案已导出到当前设备。', async () => {
    const archive = await apiRequest<Record<string, unknown>>('/api/compliance/export', {}, token);
    const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `英语训练舱-云端个人档案-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  });

  const resolveDataRequest = (requestId: string, status: 'processing' | 'completed' | 'rejected') => runAction('数据请求状态已更新。', async () => {
    await apiRequest(`/api/compliance/data-requests/${requestId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ status, note: '由团队所有者在管理台处理。' }),
    }, token);
  });

  return (
    <div className="rounded-3xl border border-[#cfe6f2] bg-[#f7fbff] p-3 sm:p-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-xs font-black text-[#003178] flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            团队协作与数据安全
          </h4>
          <p className="mt-1 text-[10.5px] font-bold leading-5 text-[#434652]">
            面向团队所有者开放，集中处理账号安全、团队链接、内容授权、数据请求和聚合观测。
          </p>
        </div>
        <button
          type="button"
          onClick={() => runAction('团队控制台已刷新。', async () => undefined)}
          disabled={isBusy}
          className="ui-button ui-button-secondary ui-button-compact w-full sm:w-auto"
        >
          刷新
        </button>
      </div>

      {isOwner && overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            ['成员', overview.members],
            ['待邀', overview.pendingInvitations],
            ['活跃会话', overview.activeSessions],
            ['内容资产', overview.contentAssets],
            ['阻断内容', overview.blockedContentAssets],
            ['数据请求', overview.openDataRequests],
            ['云快照', overview.learningSnapshots],
            ['学习实体', overview.learningEntities],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white border border-[#dbeafe] p-3">
              <p className="text-[10px] font-black text-[#434652]">{label}</p>
              <p className="mt-1 text-xl font-black text-[#003178]">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        <section className="rounded-2xl bg-white border border-[#dbeafe] p-4 space-y-3">
          <h5 className="text-[11px] font-black text-[#003178] flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            登录设备与会话
          </h5>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {sessions.map((session) => (
              <div key={session.id} className="rounded-xl border border-[#eef2ff] bg-[#fbfdff] p-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black text-[#003178]">{compactDeviceLabel(session.userAgent)} {session.current ? '· 当前设备' : ''}</p>
                  <p className="text-[9.5px] font-bold text-[#434652]">最近使用 {formatDate(session.lastUsedAt ?? session.createdAt)} · {session.active ? '有效' : '已失效'}</p>
                </div>
                <button type="button" onClick={() => revokeSession(session.id)} disabled={isBusy || session.current || !session.active} className="ui-button ui-button-danger ui-button-compact">
                  撤销
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {isOwner && (
        <section className="rounded-2xl bg-white border border-[#dbeafe] p-4 space-y-3">
          <h5 className="text-[11px] font-black text-[#003178] flex items-center gap-2">
            <Users className="h-4 w-4" />
            团队成员与邀请
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
            <input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} data-testid="saas-invite-email" className="rounded-xl border border-[#c3c6d4] bg-[#f8fafc] px-3 py-2 text-[10px] font-bold text-[#003178]" placeholder="成员账号邮箱（仅生成邀请链接）" type="email" />
            <button type="button" onClick={inviteMember} disabled={isBusy || !inviteEmail} className="ui-button ui-button-primary ui-button-compact">
              <UserPlus className="h-3.5 w-3.5" />
              邀请
            </button>
          </div>
          {inviteLink && <p className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-[10px] font-bold text-amber-800 break-all">邀请链接：{inviteLink}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {members.map((member) => (
              <div key={member.id} className="rounded-xl bg-[#f8fafc] border border-[#eef2ff] p-3">
                <p className="text-[10px] font-black text-[#003178]">{member.name} · {member.role === 'owner' ? '所有者' : '成员'}</p>
                <p className="text-[9.5px] font-bold text-[#434652]">{member.email}</p>
              </div>
            ))}
            {invitations.filter((item) => !item.acceptedAt).map((invitation) => (
              <div key={invitation.id} className="rounded-xl bg-[#fffaf0] border border-amber-100 p-3">
                <p className="text-[10px] font-black text-amber-800">{invitation.email}</p>
                <p className="text-[9.5px] font-bold text-amber-700">待接受 · 过期 {formatDate(invitation.expiresAt)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {isOwner && (
        <section className="rounded-2xl bg-white border border-[#dbeafe] p-4 space-y-3">
          <h5 className="text-[11px] font-black text-[#003178] flex items-center gap-2">
            <FileCheck2 className="h-4 w-4" />
            内容授权治理
          </h5>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-2">
            <input value={contentTitle} onChange={(event) => setContentTitle(event.target.value)} data-testid="saas-content-title" className="lg:col-span-2 rounded-xl border border-[#c3c6d4] bg-[#f8fafc] px-3 py-2 text-[10px] font-bold text-[#003178]" placeholder="内容标题" />
            <SelectField
              ariaLabel="内容类型"
              compact
              value={contentAssetType}
              onChange={(nextValue) => setContentAssetType(nextValue as ContentAsset['assetType'])}
              options={Object.entries(assetTypeLabels).map(([value, label]) => ({ value, label }))}
            />
            <SelectField
              ariaLabel="内容来源"
              compact
              value={contentSourceType}
              onChange={(nextValue) => setContentSourceType(nextValue as ContentAsset['sourceType'])}
              options={Object.entries(sourceTypeLabels).map(([value, label]) => ({ value, label }))}
            />
            <SelectField
              ariaLabel="授权状态"
              compact
              value={contentLicenseStatus}
              onChange={(nextValue) => setContentLicenseStatus(nextValue as ContentAsset['licenseStatus'])}
              options={Object.entries(licenseStatusLabels).map(([value, label]) => ({ value, label }))}
            />
          </div>
          <textarea value={contentNotes} onChange={(event) => setContentNotes(event.target.value)} className="w-full rounded-xl border border-[#c3c6d4] bg-[#f8fafc] px-3 py-2 text-[10px] font-bold text-[#003178]" rows={2} placeholder="授权说明、来源证据或下架原因" />
          <button type="button" onClick={createContentAsset} disabled={isBusy || contentTitle.length < 2} className="ui-button ui-button-primary ui-button-compact">
            登记内容资产
          </button>
          <div className="space-y-2">
            {contentAssets.map((asset) => (
              <div key={asset.id} className="rounded-xl bg-[#fbfdff] border border-[#eef2ff] p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black text-[#003178]">{asset.title}</p>
                  <p className="text-[9.5px] font-bold text-[#434652]">{assetTypeLabels[asset.assetType]} · {sourceTypeLabels[asset.sourceType]} · {licenseStatusLabels[asset.licenseStatus]}</p>
                </div>
                <SelectField
                  ariaLabel={`${asset.title} 授权状态`}
                  className="sm:w-40"
                  compact
                  value={asset.licenseStatus}
                  onChange={(nextValue) => updateContentAsset(asset, nextValue as ContentAsset['licenseStatus'])}
                  options={Object.entries(licenseStatusLabels).map(([value, label]) => ({ value, label }))}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl bg-white border border-[#dbeafe] p-4 space-y-3">
        <h5 className="text-[11px] font-black text-[#003178] flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          数据权利与合规请求
        </h5>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadCloudArchive} disabled={isBusy} className="ui-button ui-button-primary ui-button-compact">
            立即下载我的云端档案
          </button>
          <button type="button" onClick={() => createDataRequest('export')} disabled={isBusy} className="ui-button ui-button-secondary ui-button-compact">
            提交导出留痕请求
          </button>
          <button type="button" onClick={() => createDataRequest('delete')} disabled={isBusy} className="ui-button ui-button-danger ui-button-compact">
            <Trash2 className="h-3.5 w-3.5" />
            请求删除云端档案
          </button>
        </div>
        <div className="space-y-2">
          {dataRequests.map((request) => (
            <div key={request.id} className="rounded-xl bg-[#fbfdff] border border-[#eef2ff] p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-[10px] font-black text-[#003178]">{request.requestType === 'export' ? '数据导出' : '数据删除'} · {request.status}</p>
                <p className="text-[9.5px] font-bold text-[#434652]">
                  {request.requester ? `${request.requester.name} (${request.requester.email}) · ` : ''}提交 {formatDate(request.createdAt)} · {request.note ?? '无备注'}
                </p>
              </div>
              {isOwner && (request.status === 'queued' || request.status === 'processing') && (
                <div className="flex gap-1">
                  <button type="button" onClick={() => resolveDataRequest(request.id, 'processing')} className="ui-button ui-button-secondary ui-button-compact">处理中</button>
                  <button type="button" onClick={() => resolveDataRequest(request.id, 'completed')} className="ui-button ui-button-success ui-button-compact">完成</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {isOwner && operationalSummary && (
        <section className="rounded-2xl bg-[#eef7fc] border border-[#d2e2ec] p-4 space-y-2">
          <h5 className="text-[11px] font-black text-[#003178] flex items-center gap-2">
            <Activity className="h-4 w-4" />
            运营观测
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl bg-white p-3 border border-[#dbeafe]"><p className="text-[9px] font-black text-[#434652]">存储</p><p className="text-sm font-black text-[#003178]">{operationalSummary.store}</p></div>
            <div className="rounded-xl bg-white p-3 border border-[#dbeafe]"><p className="text-[9px] font-black text-[#434652]">API 请求</p><p className="text-sm font-black text-[#003178]">{operationalSummary.observability.api.requestsTotal}</p></div>
            <div className="rounded-xl bg-white p-3 border border-[#dbeafe]"><p className="text-[9px] font-black text-[#434652]">API 错误率</p><p className="text-sm font-black text-[#003178]">{Math.round(operationalSummary.observability.api.errorRate * 100)}%</p></div>
            <div className="rounded-xl bg-white p-3 border border-[#dbeafe]"><p className="text-[9px] font-black text-[#434652]">反馈兜底率</p><p className="text-sm font-black text-[#003178]">{Math.round(operationalSummary.observability.ai.fallbackRate * 100)}%</p></div>
          </div>
          <p className="text-[10px] font-bold leading-5 text-[#434652] flex items-start gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 mt-0.5 shrink-0" />
            运营数据只返回聚合计数，不泄露用户原文、密码哈希、供应商密钥或学习内容正文。
          </p>
        </section>
      )}

      {isBusy && (
        <div className="flex items-center gap-2 text-[10px] font-black text-[#003178]">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          正在处理云端操作...
        </div>
      )}
    </div>
  );
}
