import * as React from 'react';
import { Page } from '../components/Page';
import { Icon } from '../components/Icons';
import { IconButton } from '../components/IconButton';
import { Button } from '../components/Button';
import { Tag } from '../components/Tag';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { Checkbox } from '../components/Checkbox';
import { TextArea } from '../components/TextArea';
import { useAnnounce } from '../components/A11yAnnouncement';
import {
  INITIAL_PROJECTS,
  ProjectData,
  Department,
  FixtureItem,
  Task,
  Blocker,
} from '../data/projectData';

// Fixed "today" for demo purposes, matching the seeded project dates.
const DEMO_TODAY = '2026-09-21';
const PROTOTYPE_HUB_URL = 'https://puppy.walmart.com/sharing/p0b05bu/prototype-hub';

type MessageType =
  | 'schedule'
  | 'pto'
  | 'callins'
  | 'teamlead'
  | 'tools'
  | 'departments'
  | 'department-detail'
  | 'fixture-detail'
  | 'phasing'
  | 'orders'
  | 'tasks'
  | 'task-detail'
  | 'blockers'
  | 'blocker-detail'
  | 'default';

interface ChatMessage {
  id: string;
  sender: 'user' | 'squiggly';
  text: string;
  type?: MessageType;
  data?: any;
}

function gapOf(item: FixtureItem) {
  return Math.max(0, item.ordered - item.received);
}

function isOpenTask(status: Task['status']) {
  return status === 'ASSIGNED' || status === 'IN_PROGRESS' || status === 'PENDING_REVIEW' || status === 'PAUSED';
}

function daysBetween(a: string, b: string) {
  return Math.max(0, Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000));
}

function filterDepartments(departments: Department[], filter: string) {
  if (filter === 'attention') return departments.filter((d) => d.risk !== 'ON TRACK');
  if (filter === 'progress') return departments.filter((d) => d.status === 'IN PROGRESS');
  if (filter === 'upcoming') return departments.filter((d) => d.status === 'UPCOMING');
  return departments;
}

interface ShortfallRow {
  key: string;
  deptId: string;
  deptName: string;
  item: FixtureItem;
}

function collectShortfalls(project: ProjectData, deptId?: string): ShortfallRow[] {
  const depts = deptId ? project.departments.filter((d) => d.id === deptId) : project.departments;
  const rows: ShortfallRow[] = [];
  depts.forEach((d) => {
    d.fixtures.forEach((f) => {
      if (gapOf(f) > 0) rows.push({ key: `${d.id}::${f.id}`, deptId: d.id, deptName: d.name, item: f });
    });
  });
  return rows.sort((a, b) => gapOf(b.item) - gapOf(a.item));
}

function riskTagColor(risk: Department['risk']): 'negative' | 'warning' | 'positive' {
  if (risk === 'AT RISK') return 'negative';
  if (risk === 'WATCH') return 'warning';
  return 'positive';
}

function priorityTagColor(priority: Task['priority']): 'negative' | 'warning' | 'brand' {
  if (priority === 'HIGH') return 'negative';
  if (priority === 'MEDIUM') return 'warning';
  return 'brand';
}

// Data comes through as SHOUTY enum text (AT RISK, IN PROGRESS, NOT SHIPPED...) — tag copy reads as sentence case.
function toSentenceCase(value: string) {
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function KairosChatPage() {
  const announce = useAnnounce();
  const [projects, setProjects] = React.useState<ProjectData[]>(INITIAL_PROJECTS);
  const [activeProjectId, setActiveProjectId] = React.useState<string>('USRM-012759');
  const [inputValue, setInputValue] = React.useState('');
  const [resolutionDrafts, setResolutionDrafts] = React.useState<Record<string, string>>({});

  // Modals for external actions
  const [isStoreSwitcherOpen, setIsStoreSwitcherOpen] = React.useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = React.useState(false);

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  const suggestedPrompts = [
    'View my department schedule',
    'View phasing plan',
    'What orders are needed?',
    'Show my open tasks',
    'Show open blockers',
  ];

  // Continuous conversation feed — every drilldown appends a turn, nothing ever swaps the body.
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const updateMessageData = (id: string, patch: any) => {
    setMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, data: { ...msg.data, ...patch } } : msg)));
  };

  const handleSendPrompt = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, sender: 'user', text: trimmed }]);
    setInputValue('');
    announce.polite(`Sent message: ${trimmed}`);

    setTimeout(() => {
      const q = trimmed.toLowerCase();
      let reply: { text: string; type?: MessageType; data?: any };

      if (q.includes('schedule') && (q.includes('department') || q.includes('my'))) {
        reply = {
          text: `Here is the current phasing and schedule for ${activeProject.city} (Store #${activeProject.store}):`,
          type: 'schedule',
          data: { departments: activeProject.departments, projectId: activeProject.id },
        };
      } else if (q.includes('pto') || q.includes('sign-off')) {
        reply = {
          text: `You have 2 pending approvals requiring sign-off for ${activeProject.rpm}'s team:`,
          type: 'pto',
          data: [
            { name: 'Carlos M.', date: 'Oct 4-6', role: 'Consumables Lead', reason: 'Personal (24h) • Shift coverage confirmed' },
            { name: 'Sarah K.', date: 'Oct 11', role: 'Deli Associate', reason: 'Family Care (8h) • Peer swap available' },
          ],
        };
      } else if (q.includes('called in') || q.includes('attendance')) {
        reply = {
          text: `Attendance summary as of 9:40 AM for Store #${activeProject.store}:`,
          type: 'callins',
          data: [
            { name: 'Marcus D.', dept: 'Stocking 1', reason: 'Tardy - Transportation', status: 'Notice received' },
            { name: 'Elena R.', dept: 'Bakery & Deli', reason: 'Medical - Approved Sick Bank', status: 'Covered' },
          ],
        };
      } else if (q.includes('team lead') || q.includes('lead schedule')) {
        reply = {
          text: `Active team leads and coordinators for Store #${activeProject.store}:`,
          type: 'teamlead',
          data: activeProject.team,
        };
      } else if (q.includes('phas') || q.includes('timeline')) {
        reply = {
          text: `Full phasing plan for Store #${activeProject.store} — ${activeProject.departments.length} departments, ${daysBetween(DEMO_TODAY, activeProject.goLive)} days to go-live:`,
          type: 'phasing',
          data: { departments: activeProject.departments, projectId: activeProject.id, filter: 'all' },
        };
      } else if (q.includes('order') || q.includes('reorder') || q.includes('shortage') || q.includes('shortfall') || q.includes('quantity')) {
        reply = {
          text: `Here are the open fixture shortages for Store #${activeProject.store}:`,
          type: 'orders',
          data: { projectId: activeProject.id, selectedKeys: [] as string[] },
        };
      } else if (q.includes('task') || q.includes('to-do') || q.includes('todo')) {
        reply = {
          text: `Here's the task list for Store #${activeProject.store}:`,
          type: 'tasks',
          data: { projectId: activeProject.id, tab: 'open' },
        };
      } else if (q.includes('blocker')) {
        reply = {
          text: `Here are the blockers logged for Store #${activeProject.store}:`,
          type: 'blockers',
          data: { projectId: activeProject.id, tab: 'open' },
        };
      } else if (q.includes('collaboration') || q.includes('tool')) {
        reply = {
          text: `KAIROS suite collaboration hubs linked to Store #${activeProject.store}:`,
          type: 'tools',
          data: [
            { name: 'KAIROS REX Director', desc: 'Real-time store modular & floor health monitoring' },
            { name: 'RPM Replenishment Assistant', desc: 'Direct fixture supply-chain & delivery routing' },
            { name: 'Floor Walk Sync', desc: 'Daily walk assignments and blocker escalation' },
          ],
        };
      } else {
        reply = {
          text: `I've analyzed "${trimmed}" across Store #${activeProject.store} records. Tap any department or fixture below to keep digging — it'll show up right here in our conversation.`,
          type: 'default',
        };
      }

      setMessages((prev) => [...prev, { id: `sq-${Date.now()}`, sender: 'squiggly', ...reply }]);
      announce.polite('Squiggly responded.');
    }, 500);
  };

  // Same append-a-turn pattern as handleSendPrompt, but for taps on inline cards
  // (department rows, fixture rows, etc.) rather than free-text NLP.
  const handleDrilldown = (userText: string, reply: { text: string; type: MessageType; data?: any }) => {
    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, sender: 'user', text: userText }]);
    announce.polite(`Sent message: ${userText}`);

    setTimeout(() => {
      setMessages((prev) => [...prev, { id: `sq-${Date.now()}`, sender: 'squiggly', ...reply }]);
      announce.polite('Squiggly responded.');
    }, 400);
  };

  const showDepartmentsOverview = () => {
    handleDrilldown('Show all departments', {
      text: `Departments & Phasing overview for Store #${activeProject.store}:`,
      type: 'departments',
      data: { departments: activeProject.departments, projectId: activeProject.id },
    });
  };

  const toggleCheckIn = () => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id ? { ...p, checkedIn: !p.checkedIn } : p
      )
    );
    announce.polite(activeProject.checkedIn ? 'Checked out of store.' : 'Checked into store.');
  };

  const updateTaskStatus = (projectId: string, taskId: string, status: Task['status']) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id !== projectId ? p : { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)) }
      )
    );
    announce.polite('Task status updated');
  };

  const resolveBlocker = (projectId: string, blockerId: string, resolution: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id !== projectId
          ? p
          : {
              ...p,
              blockers: p.blockers.map((b) =>
                b.id === blockerId
                  ? {
                      ...b,
                      status: 'RESOLVED' as const,
                      resolution,
                      resolved: DEMO_TODAY,
                      activity: [...(b.activity || []), `Resolved: ${resolution}`],
                    }
                  : b
              ),
            }
      )
    );
    setResolutionDrafts((prev) => {
      const next = { ...prev };
      delete next[blockerId];
      return next;
    });
    announce.polite('Blocker marked resolved');
  };

  const submitReorder = (projectId: string, keys: string[], messageId: string) => {
    if (keys.length === 0) return;
    const requestId = `RQ-${Math.floor(10000 + Math.random() * 90000)}`;
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          departments: p.departments.map((d) => ({
            ...d,
            fixtures: d.fixtures.map((f) => {
              const key = `${d.id}::${f.id}`;
              return keys.includes(key) ? { ...f, existingRequest: requestId } : f;
            }),
          })),
        };
      })
    );
    updateMessageData(messageId, { selectedKeys: [] });
    handleDrilldown(`Request reorder for ${keys.length} item${keys.length === 1 ? '' : 's'}`, {
      text: `Reorder request ${requestId} submitted for ${keys.length} item${keys.length === 1 ? '' : 's'}. Home Office will confirm the PO.`,
      type: 'default',
    });
  };

  return (
    <Page title="KAIROS Chat Experience — Squiggly Assistant" titleVisuallyHidden>
      {/* Background Frame */}
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-between p-3 sm:p-6 font-sans">
        <div className="flex-1 flex items-center justify-center w-full">

        {/* Mobile Device Frame based on Figma 8568:5825 */}
        <div className="w-full max-w-[420px] h-[890px] bg-white rounded-[44px] shadow-2xl ring-1 ring-slate-900/10 flex flex-col overflow-hidden relative">

          {/* Status Bar [Sq 1.0] DeviceBar */}
          <header className="h-11 px-6 pt-1 flex items-center justify-between text-xs font-semibold text-slate-900 select-none bg-white z-20">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <svg width="17" height="11" viewBox="0 0 17 11" fill="none" aria-hidden="true">
                <rect x="0" y="8" width="3" height="3" rx="0.5" fill="currentColor" />
                <rect x="4.5" y="5.5" width="3" height="5.5" rx="0.5" fill="currentColor" />
                <rect x="9" y="3" width="3" height="8" rx="0.5" fill="currentColor" />
                <rect x="13.5" y="0.5" width="3" height="10.5" rx="0.5" fill="currentColor" />
              </svg>
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
                <path d="M8 11.5a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5zM3.5 6.7a6.5 6.5 0 019 0 .8.8 0 001.1-1.1 8 8 0 00-11.2 0 .8.8 0 001.1 1.1zM.5 3.5a11 11 0 0115 0 .8.8 0 001.1-1.1 12.5 12.5 0 00-17.2 0 .8.8 0 001.1 1.1z" fill="currentColor" />
              </svg>
              <svg width="24" height="11" viewBox="0 0 24 11" fill="none" aria-hidden="true">
                <rect x="0.5" y="0.5" width="20" height="10" rx="3" stroke="currentColor" />
                <rect x="2" y="2" width="14" height="7" rx="1.5" fill="currentColor" />
                <path d="M22 3.5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </header>

          {/* App Header [Sq 1.0] App header — continuous conversation, so this is always Home (no Back state) */}
          <div className="h-14 px-4 flex items-center justify-between border-b border-slate-100 bg-white z-10">
            <IconButton
              a11yLabel="Reset conversation"
              variant="ghost"
              size="small"
              onClick={() => {
                setMessages([]);
                announce.polite('Conversation reset to greeting');
              }}
            >
              <Icon name="Close" decorative />
            </IconButton>

            {/* Title container: Squiggly Orb + Wordmark */}
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-400 via-blue-600 to-indigo-700 shadow-sm flex items-center justify-center relative overflow-hidden"
                aria-hidden="true"
              >
                <div className="absolute w-2 h-2 rounded-full bg-white/70 blur-[0.5px] top-1 left-1" />
              </div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">Squiggly</span>
            </div>

            {/* Right Action: ask for the departments overview inline, in-thread */}
            <IconButton
              a11yLabel="Show departments overview"
              variant="ghost"
              size="small"
              onClick={showDepartmentsOverview}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <line x1="13" y1="3" x2="13" y2="21" />
              </svg>
            </IconButton>
          </div>

          {/* Context & Remodel Snapshot Banner */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsStoreSwitcherOpen(true)}
              className="flex items-center gap-1.5 text-left group hover:opacity-80 transition"
              aria-label={`Switch store: Currently Store ${activeProject.store} ${activeProject.city}`}
            >
              <span className="text-xs font-bold text-slate-800">
                Store {activeProject.store} — {activeProject.city}
              </span>
              <Icon name="ChevronDown" decorative />
            </button>
            <div className="flex items-center gap-2">
              <Button
                variant={activeProject.checkedIn ? 'secondary' : 'primary'}
                size="small"
                shape="pill"
                onClick={toggleCheckIn}
              >
                {activeProject.checkedIn ? 'Checked in' : 'Check in'}
              </Button>
            </div>
          </div>

          {/* CONTINUOUS CONVERSATION FEED — every drilldown is a turn appended here, never a separate view */}
          <div className="flex-1 overflow-y-auto p-4 bg-white">
            <div className="space-y-6">
              {messages.length === 0 ? (
                <div className="space-y-6 pt-1">
                  <div>
                    <h2 className="text-3xl font-extrabold text-[#004f98] leading-tight tracking-tight">
                      Hi [{activeProject.rpm.split(' ')[0]}],<br />
                      how can I help you today?
                    </h2>
                  </div>

                  <div className="flex flex-col items-start gap-2.5" role="group" aria-label="Suggested Prompts">
                    {suggestedPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSendPrompt(prompt)}
                        className="px-4 py-2.5 rounded-full bg-[#E6F1FC] hover:bg-[#d6e8fa] text-[#002244] text-sm font-medium transition text-left shadow-sm active:scale-[0.98]"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  {/* Departments overview gateway card — taps append an in-thread turn, no page swap */}
                  <Card size="small">
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Remodel Health ({activeProject.id})
                        </span>
                        <Tag color="warning" variant="tertiary" size="small">
                          {activeProject.departments.filter((d) => d.risk === 'AT RISK').length} at risk
                        </Tag>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <button
                          type="button"
                          onClick={showDepartmentsOverview}
                          className="p-2 bg-slate-50 hover:bg-blue-50 rounded-lg text-left transition border border-slate-100"
                        >
                          <div className="text-base font-black text-slate-800">
                            {Math.round(
                              activeProject.departments.reduce((acc, d) => acc + d.fixturePct, 0) /
                                (activeProject.departments.length || 1)
                            )}%
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Received →</div>
                        </button>
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <div className="text-base font-black text-amber-600">
                            {activeProject.tasks.length}
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Tasks</div>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <div className="text-base font-black text-rose-600">
                            {activeProject.blockers.length}
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Blockers</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          m.sender === 'user'
                            ? 'bg-[#0071ce] text-white rounded-br-none'
                            : 'bg-slate-100 text-slate-900 rounded-bl-none shadow-sm'
                        }`}
                      >
                        <p>{m.text}</p>

                        {m.type === 'schedule' && m.data && (
                          <div className="mt-3 space-y-2 pt-2 border-t border-slate-200/60">
                            {m.data.departments.map((dept: Department) => (
                              <button
                                key={dept.id}
                                type="button"
                                onClick={() =>
                                  handleDrilldown(`Show ${dept.name} details`, {
                                    text: `Here's the phasing detail for ${dept.name}:`,
                                    type: 'department-detail',
                                    data: { ...dept, projectId: m.data.projectId },
                                  })
                                }
                                className="w-full text-left p-2.5 bg-white rounded-lg border border-slate-200/80 hover:border-blue-400 transition flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-bold text-xs text-slate-900">{dept.name}</div>
                                  <div className="text-[11px] text-slate-500">{dept.start} → {dept.end}</div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Tag color={riskTagColor(dept.risk)} variant="tertiary" size="small">
                                    {toSentenceCase(dept.risk)}
                                  </Tag>
                                  <Icon name="ChevronRight" decorative />
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {m.type === 'departments' && m.data && (
                          <div className="mt-3 space-y-2 pt-2 border-t border-slate-200/60">
                            {m.data.departments.map((dept: Department) => (
                              <button
                                key={dept.id}
                                type="button"
                                onClick={() =>
                                  handleDrilldown(`Show ${dept.name} details`, {
                                    text: `Here's the phasing detail for ${dept.name}:`,
                                    type: 'department-detail',
                                    data: { ...dept, projectId: m.data.projectId },
                                  })
                                }
                                className="w-full text-left p-2.5 bg-white rounded-lg border border-slate-200/80 hover:border-blue-400 transition"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-slate-900">{dept.name}</span>
                                  <Tag color={riskTagColor(dept.risk)} variant="tertiary" size="small">
                                    {toSentenceCase(dept.risk)}
                                  </Tag>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">{dept.start} → {dept.end}</div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
                                  <span className="text-slate-600">Receipt Progress: {dept.fixturePct}%</span>
                                  <span className="text-blue-600 font-semibold">{dept.fixtures.length} Fixtures →</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {m.type === 'phasing' && m.data && (
                          <div className="mt-3 space-y-3 pt-2 border-t border-slate-200/60">
                            <div className="grid grid-cols-4 gap-1.5 text-center">
                              <div className="p-1.5 bg-white rounded-lg border border-slate-200/80">
                                <div className="text-sm font-black text-rose-600">
                                  {m.data.departments.filter((d: Department) => d.risk === 'AT RISK').length}
                                </div>
                                <div className="text-[8px] font-bold text-slate-500 uppercase">At risk</div>
                              </div>
                              <div className="p-1.5 bg-white rounded-lg border border-slate-200/80">
                                <div className="text-sm font-black text-amber-600">
                                  {m.data.departments.filter((d: Department) => d.risk === 'WATCH').length}
                                </div>
                                <div className="text-[8px] font-bold text-slate-500 uppercase">Watch</div>
                              </div>
                              <div className="p-1.5 bg-white rounded-lg border border-slate-200/80">
                                <div className="text-sm font-black text-blue-600">
                                  {m.data.departments.filter((d: Department) => d.status === 'IN PROGRESS').length}
                                </div>
                                <div className="text-[8px] font-bold text-slate-500 uppercase">In progress</div>
                              </div>
                              <div className="p-1.5 bg-white rounded-lg border border-slate-200/80">
                                <div className="text-sm font-black text-emerald-600">
                                  {m.data.departments.filter((d: Department) => d.status === 'COMPLETE').length}
                                </div>
                                <div className="text-[8px] font-bold text-slate-500 uppercase">Complete</div>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              {filterDepartments(m.data.departments, m.data.filter).map((dept: Department) => (
                                <button
                                  key={dept.id}
                                  type="button"
                                  onClick={() =>
                                    handleDrilldown(`Show ${dept.name} details`, {
                                      text: `Here's the phasing detail for ${dept.name}:`,
                                      type: 'department-detail',
                                      data: { ...dept, projectId: m.data.projectId },
                                    })
                                  }
                                  className="w-full text-left p-2.5 bg-white rounded-lg border border-slate-200/80 hover:border-blue-400 transition"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-xs text-slate-900">{dept.name}</span>
                                    <Tag color={riskTagColor(dept.risk)} variant="tertiary" size="small">
                                      {toSentenceCase(dept.risk)}
                                    </Tag>
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-1">
                                    {dept.start} → {dept.end} • {dept.fixturePct}% received
                                  </div>
                                </button>
                              ))}
                              {filterDepartments(m.data.departments, m.data.filter).length === 0 && (
                                <div className="text-[11px] text-slate-500 italic p-1">No departments match this filter.</div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1.5 pt-1" role="group" aria-label="Phasing plan follow-up prompts">
                              {(
                                [
                                  { key: 'all', label: 'All departments' },
                                  { key: 'attention', label: 'Needs attention' },
                                  { key: 'progress', label: 'In progress' },
                                  { key: 'upcoming', label: 'Upcoming' },
                                ] as const
                              )
                                .filter((opt) => opt.key !== (m.data.filter || 'all'))
                                .map((opt) => (
                                  <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() =>
                                      handleDrilldown(opt.label, {
                                        text: `${opt.label} — phasing plan:`,
                                        type: 'phasing',
                                        data: { departments: m.data.departments, projectId: m.data.projectId, filter: opt.key },
                                      })
                                    }
                                    className="px-3 py-1.5 rounded-full bg-[#E6F1FC] hover:bg-[#d6e8fa] text-[#002244] text-[11px] font-semibold transition active:scale-[0.98]"
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}

                        {m.type === 'department-detail' && m.data && (
                          <div className="mt-3 space-y-2 pt-2 border-t border-slate-200/60">
                            <div className="text-[11px] text-slate-500">
                              Scheduled Phasing: {m.data.start} → {m.data.end}
                            </div>

                            {m.data.reason && (
                              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="font-bold text-[11px] text-amber-900">{m.data.reason.label}</div>
                                <div className="text-[11px] text-amber-800 mt-0.5">{m.data.reason.text}</div>
                              </div>
                            )}

                            {m.data.recommendation && (
                              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                                <div className="font-bold text-[11px] text-blue-900">Recommended Phasing Shift</div>
                                <div className="text-[11px] text-blue-800">
                                  +{m.data.recommendation.shiftDays} days: {m.data.recommendation.newStart} → {m.data.recommendation.newEnd}
                                </div>
                                <div className="text-[10px] text-blue-700">Impact: {m.data.recommendation.ripple}</div>
                              </div>
                            )}

                            <div className="pt-1">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                Fixture Lines ({m.data.fixtures.length})
                              </div>
                              <div className="space-y-1.5">
                                {m.data.fixtures.map((f: FixtureItem) => (
                                  <button
                                    key={f.id}
                                    type="button"
                                    onClick={() =>
                                      handleDrilldown(`Show ${f.name} manifest`, {
                                        text: `Fixture manifest for ${f.name}:`,
                                        type: 'fixture-detail',
                                        data: f,
                                      })
                                    }
                                    className="w-full text-left p-2 bg-white rounded-lg border border-slate-200/80 hover:border-blue-400 transition"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-[11px] text-slate-900">{f.name}</span>
                                      <Tag color={f.status === 'RECEIVED' ? 'positive' : f.status === 'PARTIAL' ? 'warning' : 'negative'} variant="tertiary" size="small">
                                        {toSentenceCase(f.status)}
                                      </Tag>
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1">PO: {f.po} • Trailer: {f.trailer}</div>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex gap-2 flex-wrap pt-2">
                              <Button
                                variant="secondary"
                                size="small"
                                onClick={() =>
                                  handleDrilldown(`Show orders needed for ${m.data.name}`, {
                                    text: `Open fixture shortages for ${m.data.name}:`,
                                    type: 'orders',
                                    data: { projectId: m.data.projectId, deptId: m.data.id, selectedKeys: [] },
                                  })
                                }
                              >
                                Orders needed
                              </Button>
                              <Button
                                variant="secondary"
                                size="small"
                                onClick={() =>
                                  handleDrilldown(`Show tasks for ${m.data.name}`, {
                                    text: `Tasks for ${m.data.name}:`,
                                    type: 'tasks',
                                    data: { projectId: m.data.projectId, deptName: m.data.name, tab: 'open' },
                                  })
                                }
                              >
                                Department tasks
                              </Button>
                              <Button
                                variant="secondary"
                                size="small"
                                onClick={() =>
                                  handleDrilldown(`Show blockers for ${m.data.name}`, {
                                    text: `Blockers for ${m.data.name}:`,
                                    type: 'blockers',
                                    data: { projectId: m.data.projectId, deptName: m.data.name, tab: 'open' },
                                  })
                                }
                              >
                                Blockers
                              </Button>
                            </div>
                          </div>
                        )}

                        {m.type === 'fixture-detail' && m.data && (
                          <div className="mt-3 space-y-3 pt-2 border-t border-slate-200/60">
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                                <div className="text-[9px] font-bold text-slate-400 uppercase">Purchase Order</div>
                                <div className="font-bold text-slate-800 mt-0.5">{m.data.po}</div>
                              </div>
                              <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                                <div className="text-[9px] font-bold text-slate-400 uppercase">Trailer</div>
                                <div className="font-bold text-slate-800 mt-0.5">{m.data.trailer}</div>
                              </div>
                              <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                                <div className="text-[9px] font-bold text-slate-400 uppercase">Vendor</div>
                                <div className="font-bold text-slate-800 mt-0.5">{m.data.vendor}</div>
                              </div>
                              <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                                <div className="text-[9px] font-bold text-slate-400 uppercase">Location</div>
                                <div className="font-bold text-slate-800 mt-0.5">{m.data.location}</div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                                <span>Quantity Status</span>
                                <span>{m.data.received} of {m.data.ordered} units</span>
                              </div>
                              <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${Math.round((m.data.received / (m.data.ordered || 1)) * 100)}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                variant="primary"
                                size="small"
                                isFullWidth
                                onClick={() => setIsScanModalOpen(true)}
                              >
                                Scan & Unload Balance
                              </Button>
                              <Button
                                variant="secondary"
                                size="small"
                                onClick={() =>
                                  handleSendPrompt(`Escalate fixture delay for ${m.data.name} on trailer ${m.data.trailer}`)
                                }
                              >
                                Escalate
                              </Button>
                            </div>
                          </div>
                        )}

                        {m.type === 'orders' && m.data && (() => {
                          const proj = projects.find((p) => p.id === m.data.projectId);
                          if (!proj) return null;
                          const rows = collectShortfalls(proj, m.data.deptId);
                          const selected: string[] = m.data.selectedKeys || [];
                          const eligible = rows.filter((r) => !r.item.existingRequest);
                          return (
                            <div className="mt-3 space-y-2 pt-2 border-t border-slate-200/60">
                              {rows.length === 0 ? (
                                <div className="text-[11px] text-slate-500 italic p-1">
                                  No open shortages — ordered and received quantities match.
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                      {rows.reduce((sum, r) => sum + gapOf(r.item), 0)} units short · {rows.length} line{rows.length === 1 ? '' : 's'}
                                    </span>
                                    {eligible.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => updateMessageData(m.id, { selectedKeys: eligible.map((r) => r.key) })}
                                        className="text-[11px] text-blue-600 font-semibold whitespace-nowrap"
                                      >
                                        Select all
                                      </button>
                                    )}
                                  </div>
                                  <div className="space-y-1.5">
                                    {rows.map((r) => (
                                      <div key={r.key} className="p-2 bg-white rounded-lg border border-slate-200/80">
                                        <Checkbox
                                          label={`${r.item.name} — ${r.deptName} (gap ${gapOf(r.item)})`}
                                          checked={selected.includes(r.key)}
                                          disabled={!!r.item.existingRequest}
                                          size="small"
                                          onChange={(e) => {
                                            const next = e.target.checked
                                              ? [...selected, r.key]
                                              : selected.filter((k) => k !== r.key);
                                            updateMessageData(m.id, { selectedKeys: next });
                                          }}
                                        />
                                        <div className="text-[10px] text-slate-500 mt-1 ml-7">
                                          {r.item.existingRequest
                                            ? `Request ${r.item.existingRequest} already submitted`
                                            : `PO ${r.item.po} • ${r.item.trailer}`}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <Button
                                    variant="primary"
                                    size="small"
                                    isFullWidth
                                    disabled={selected.length === 0}
                                    onClick={() => submitReorder(m.data.projectId, selected, m.id)}
                                  >
                                    Request reorder for {selected.length} item{selected.length === 1 ? '' : 's'}
                                  </Button>
                                </>
                              )}
                            </div>
                          );
                        })()}

                        {m.type === 'tasks' && m.data && (() => {
                          const proj = projects.find((p) => p.id === m.data.projectId);
                          if (!proj) return null;
                          let list = m.data.deptName ? proj.tasks.filter((x) => x.department === m.data.deptName) : proj.tasks;
                          const tab = m.data.tab || 'open';
                          if (tab === 'open') list = list.filter((x) => isOpenTask(x.status));
                          if (tab === 'overdue') list = list.filter((x) => isOpenTask(x.status) && x.due < DEMO_TODAY);
                          if (tab === 'review') list = list.filter((x) => x.status === 'PENDING_REVIEW');
                          if (tab === 'history') list = list.filter((x) => x.status === 'COMPLETED');
                          const taskTabOptions = [
                            { key: 'open', label: 'Open tasks' },
                            { key: 'overdue', label: 'Overdue tasks' },
                            { key: 'review', label: 'Tasks in review' },
                            { key: 'history', label: 'Task history' },
                          ] as const;
                          return (
                            <div className="mt-3 space-y-2 pt-2 border-t border-slate-200/60">
                              {list.length === 0 ? (
                                <div className="text-[11px] text-slate-500 italic p-1">No tasks in this view.</div>
                              ) : (
                                <div className="space-y-1.5">
                                  {list.map((task) => (
                                    <button
                                      key={task.id}
                                      type="button"
                                      onClick={() =>
                                        handleDrilldown(`Show task ${task.title}`, {
                                          text: `Task detail — ${task.title}:`,
                                          type: 'task-detail',
                                          data: { projectId: proj.id, taskId: task.id },
                                        })
                                      }
                                      className="w-full text-left p-2.5 bg-white rounded-lg border border-slate-200/80 hover:border-blue-400 transition"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs text-slate-900">{task.title}</span>
                                        <Tag color={priorityTagColor(task.priority)} variant="tertiary" size="small">
                                          {toSentenceCase(task.priority)}
                                        </Tag>
                                      </div>
                                      <div className="text-[11px] text-slate-500 mt-1">
                                        {task.department} • {task.owner} •{' '}
                                        {isOpenTask(task.status) && task.due < DEMO_TODAY ? 'OVERDUE ' : ''}
                                        {task.due}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}

                              <div className="flex flex-wrap gap-1.5 pt-1" role="group" aria-label="Task list follow-up prompts">
                                {taskTabOptions
                                  .filter((opt) => opt.key !== tab)
                                  .map((opt) => (
                                    <button
                                      key={opt.key}
                                      type="button"
                                      onClick={() =>
                                        handleDrilldown(opt.label, {
                                          text: `${opt.label}${m.data.deptName ? ` for ${m.data.deptName}` : ''}:`,
                                          type: 'tasks',
                                          data: { projectId: proj.id, deptName: m.data.deptName, tab: opt.key },
                                        })
                                      }
                                      className="px-3 py-1.5 rounded-full bg-[#E6F1FC] hover:bg-[#d6e8fa] text-[#002244] text-[11px] font-semibold transition active:scale-[0.98]"
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          );
                        })()}

                        {m.type === 'task-detail' && m.data && (() => {
                          const proj = projects.find((p) => p.id === m.data.projectId);
                          const task = proj?.tasks.find((x) => x.id === m.data.taskId);
                          if (!proj || !task) return null;
                          return (
                            <div className="mt-3 space-y-2 pt-2 border-t border-slate-200/60">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900">{task.title}</span>
                                <Tag color={priorityTagColor(task.priority)} variant="tertiary" size="small">
                                  {toSentenceCase(task.priority)}
                                </Tag>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase">Department</div>
                                  <div className="font-bold text-slate-800 mt-0.5">{task.department}</div>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase">Owner</div>
                                  <div className="font-bold text-slate-800 mt-0.5">{task.owner}</div>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase">Due</div>
                                  <div className="font-bold text-slate-800 mt-0.5">{task.due}</div>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase">Status</div>
                                  <div className="font-bold text-slate-800 mt-0.5">{task.status.replace(/_/g, ' ')}</div>
                                </div>
                              </div>
                              {task.status !== 'COMPLETED' && (
                                <div className="flex gap-2 flex-wrap pt-1">
                                  <Button variant="secondary" size="small" onClick={() => updateTaskStatus(proj.id, task.id, 'IN_PROGRESS')}>
                                    In progress
                                  </Button>
                                  <Button variant="secondary" size="small" onClick={() => updateTaskStatus(proj.id, task.id, 'PENDING_REVIEW')}>
                                    Submit review
                                  </Button>
                                  <Button variant="primary" size="small" onClick={() => updateTaskStatus(proj.id, task.id, 'COMPLETED')}>
                                    Mark complete
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {m.type === 'blockers' && m.data && (() => {
                          const proj = projects.find((p) => p.id === m.data.projectId);
                          if (!proj) return null;
                          let list: Blocker[] = m.data.deptName ? proj.blockers.filter((b) => b.department === m.data.deptName) : proj.blockers;
                          const tab = m.data.tab || 'open';
                          list = list.filter((b) => (tab === 'open' ? b.status === 'OPEN' : b.status === 'RESOLVED'));
                          const blockerTabOptions = [
                            { key: 'open', label: 'Open blockers' },
                            { key: 'resolved', label: 'Resolution history' },
                          ] as const;
                          return (
                            <div className="mt-3 space-y-2 pt-2 border-t border-slate-200/60">
                              {list.length === 0 ? (
                                <div className="text-[11px] text-slate-500 italic p-1">
                                  {tab === 'open' ? 'No open blockers.' : 'No resolved blockers yet.'}
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  {list.map((b) => (
                                    <button
                                      key={b.id}
                                      type="button"
                                      onClick={() =>
                                        handleDrilldown(`Show blocker ${b.title}`, {
                                          text: `Blocker detail — ${b.title}:`,
                                          type: 'blocker-detail',
                                          data: { projectId: proj.id, blockerId: b.id },
                                        })
                                      }
                                      className="w-full text-left p-2.5 bg-white rounded-lg border border-slate-200/80 hover:border-blue-400 transition"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs text-slate-900">{b.title}</span>
                                        <Tag color={b.status === 'OPEN' ? 'negative' : 'positive'} variant="tertiary" size="small">
                                          {toSentenceCase(b.status)}
                                        </Tag>
                                      </div>
                                      <div className="text-[11px] text-slate-500 mt-1">
                                        {b.department} • {b.category.replace(/_/g, ' ')} • {b.logged}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}

                              <div className="flex flex-wrap gap-1.5 pt-1" role="group" aria-label="Blocker list follow-up prompts">
                                {blockerTabOptions
                                  .filter((opt) => opt.key !== tab)
                                  .map((opt) => (
                                    <button
                                      key={opt.key}
                                      type="button"
                                      onClick={() =>
                                        handleDrilldown(opt.label, {
                                          text: `${opt.label}${m.data.deptName ? ` for ${m.data.deptName}` : ''}:`,
                                          type: 'blockers',
                                          data: { projectId: proj.id, deptName: m.data.deptName, tab: opt.key },
                                        })
                                      }
                                      className="px-3 py-1.5 rounded-full bg-[#E6F1FC] hover:bg-[#d6e8fa] text-[#002244] text-[11px] font-semibold transition active:scale-[0.98]"
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          );
                        })()}

                        {m.type === 'blocker-detail' && m.data && (() => {
                          const proj = projects.find((p) => p.id === m.data.projectId);
                          const blocker = proj?.blockers.find((b) => b.id === m.data.blockerId);
                          if (!proj || !blocker) return null;
                          const draft = resolutionDrafts[blocker.id] || '';
                          return (
                            <div className="mt-3 space-y-2 pt-2 border-t border-slate-200/60">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900">{blocker.title}</span>
                                <Tag color={blocker.status === 'OPEN' ? 'negative' : 'positive'} variant="tertiary" size="small">
                                  {toSentenceCase(blocker.status)}
                                </Tag>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase">Department</div>
                                  <div className="font-bold text-slate-800 mt-0.5">{blocker.department}</div>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase">Category</div>
                                  <div className="font-bold text-slate-800 mt-0.5">{blocker.category.replace(/_/g, ' ')}</div>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase">Owner</div>
                                  <div className="font-bold text-slate-800 mt-0.5">{blocker.owner}</div>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase">Logged</div>
                                  <div className="font-bold text-slate-800 mt-0.5">{blocker.logged}</div>
                                </div>
                              </div>
                              {blocker.activity && blocker.activity.length > 0 && (
                                <div className="pt-1">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Activity</div>
                                  <div className="space-y-1">
                                    {blocker.activity.map((a, i) => (
                                      <div key={i} className="text-[11px] text-slate-600">• {a}</div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {blocker.status === 'RESOLVED' ? (
                                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                                  <div className="font-bold text-[11px] text-emerald-900">Resolution</div>
                                  <div className="text-[11px] text-emerald-800 mt-0.5">{blocker.resolution}</div>
                                </div>
                              ) : (
                                <div className="space-y-2 pt-1">
                                  <TextArea
                                    label="Resolution notes"
                                    size="small"
                                    value={draft}
                                    onChange={(e) => setResolutionDrafts((prev) => ({ ...prev, [blocker.id]: e.target.value }))}
                                  />
                                  <div className="flex gap-2 flex-wrap">
                                    <Button
                                      variant="primary"
                                      size="small"
                                      disabled={!draft.trim()}
                                      onClick={() => resolveBlocker(proj.id, blocker.id, draft.trim())}
                                    >
                                      Mark resolved
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="small"
                                      onClick={() => handleSendPrompt(`Escalate blocker: ${blocker.title} in ${blocker.department}`)}
                                    >
                                      Escalate
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {m.type === 'pto' && m.data && (
                          <div className="mt-3 space-y-2 pt-2 border-t border-slate-200/60">
                            {m.data.map((item: any, i: number) => (
                              <div key={i} className="p-2 bg-white rounded-lg border border-slate-200/80 text-xs">
                                <div className="font-bold text-slate-900">{item.name} — {item.role}</div>
                                <div className="text-slate-600">{item.date}</div>
                                <div className="text-[11px] text-slate-500 mt-1">{item.reason}</div>
                              </div>
                            ))}
                            <div className="pt-1">
                              <Button variant="primary" size="small" isFullWidth onClick={() => {
                                announce.polite('Approved all sign-offs');
                                handleSendPrompt('Signed off pending approvals');
                              }}>
                                Approve Sign-offs
                              </Button>
                            </div>
                          </div>
                        )}

                        {m.type === 'callins' && m.data && (
                          <div className="mt-3 space-y-2 pt-2 border-t border-slate-200/60">
                            {m.data.map((item: any, i: number) => (
                              <div key={i} className="p-2 bg-white rounded-lg border border-slate-200/80 text-xs">
                                <div className="font-bold text-slate-900">{item.name} ({item.dept})</div>
                                <div className="text-slate-600">{item.reason}</div>
                                <Tag color="info" variant="tertiary" size="small">{item.status}</Tag>
                              </div>
                            ))}
                          </div>
                        )}

                        {m.type === 'teamlead' && m.data && (
                          <div className="mt-3 space-y-2 pt-2 border-t border-slate-200/60">
                            {m.data.map((member: any, i: number) => (
                              <div key={i} className="p-2 bg-white rounded-lg border border-slate-200/80 text-xs flex justify-between items-center">
                                <div>
                                  <div className="font-bold text-slate-900">{member.name}</div>
                                  <div className="text-slate-500">{member.role}</div>
                                </div>
                                <span className="text-[11px] text-blue-600 font-medium">{member.phone}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {m.type === 'tools' && m.data && (
                          <div className="mt-3 space-y-2 pt-2 border-t border-slate-200/60">
                            {m.data.map((t: any, i: number) => (
                              <div key={i} className="p-2 bg-white rounded-lg border border-slate-200/80 text-xs">
                                <div className="font-bold text-slate-900">{t.name}</div>
                                <div className="text-slate-500">{t.desc}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* [Sq 1.0] Prompt input & Barcode Action Dock */}
          <footer className="p-3 pb-6 bg-white border-t border-slate-100 flex items-center gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt(inputValue);
              }}
              className="flex-1 flex items-center gap-2"
            >
              {/* Rounded capsule prompt input */}
              <div className="flex-1 flex items-center bg-white border border-slate-300 rounded-full px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition">
                <input
                  type="text"
                  placeholder="Ask me anything..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-sm text-slate-900 placeholder:text-slate-400"
                  aria-label="Ask me anything"
                />
                {inputValue.trim() && (
                  <button
                    type="submit"
                    aria-label="Send query"
                    className="ml-1 text-blue-600 hover:text-blue-700 p-0.5 rounded-full"
                  >
                    <Icon name="ArrowUp" decorative />
                  </button>
                )}
              </div>

              {/* Barcode / Scan Action Button matching Figma */}
              <button
                type="button"
                onClick={() => setIsScanModalOpen(true)}
                aria-label="Scan barcode or fixture UPC"
                className="w-11 h-11 rounded-full border border-slate-300 flex items-center justify-center text-slate-800 hover:bg-slate-50 transition active:scale-95 shadow-sm"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 5v14" />
                  <path d="M8 5v14" />
                  <path d="M12 5v14" />
                  <path d="M17 5v14" />
                  <path d="M21 5v14" />
                </svg>
              </button>
            </form>
          </footer>

          {/* [Sq 1.0] HomeIndicator */}
          <div className="pb-2 flex justify-center bg-white">
            <div className="w-32 h-1 bg-slate-900 rounded-full" aria-hidden="true" />
          </div>
        </div>

        {/* Store Switcher Modal (Living Design Modal) */}
        <Modal
          isOpen={isStoreSwitcherOpen}
          onClose={() => setIsStoreSwitcherOpen(false)}
          title="Select Remodel Project Store"
        >
          <div className="space-y-3 p-2">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActiveProjectId(p.id);
                  setIsStoreSwitcherOpen(false);
                  announce.polite(`Switched to Store ${p.store} ${p.city}`);
                }}
                className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition ${
                  p.id === activeProject.id
                    ? 'border-blue-600 bg-blue-50/60'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    Store #{p.store} — {p.city}, {p.state}
                  </div>
                  <div className="text-xs text-slate-500">
                    RPM: {p.rpm} • Phase: {p.phase} • Go-Live: {p.goLive}
                  </div>
                </div>
                {p.focus && <Tag color="brand" variant="tertiary" size="small">Focus</Tag>}
              </button>
            ))}
          </div>
        </Modal>

        {/* Barcode Scanning Modal (Living Design Modal) */}
        <Modal
          isOpen={isScanModalOpen}
          onClose={() => setIsScanModalOpen(false)}
          title="Scan Fixture Barcode / UPC"
        >
          <div className="text-center p-4 space-y-4">
            <div className="w-56 h-36 mx-auto border-2 border-dashed border-blue-500 rounded-2xl flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
              <Icon name="Barcode" decorative />
              <span className="text-xs text-slate-500 mt-2">Align scanner beam with fixture tag</span>
            </div>
            <p className="text-xs text-slate-600">
              Scanning automatically verifies trailer manifest POs and unloads into inventory.
            </p>
            <div className="flex gap-2">
              <Button
                variant="primary"
                isFullWidth
                onClick={() => {
                  setIsScanModalOpen(false);
                  handleSendPrompt('Scanned Tag: Bakery Rack BAK-716 (PO #4502666551)');
                }}
              >
                Simulate Scan
              </Button>
              <Button variant="secondary" onClick={() => setIsScanModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
        </div>

        {/* Footer with link back to Prototype Hub */}
        <footer
          className="w-full text-center py-3 text-xs text-slate-500 font-sans select-none"
        >
          Shared prototype &middot;{' '}
          <a
            href={PROTOTYPE_HUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            title={`Open ${PROTOTYPE_HUB_URL} in a new tab`}
            className="text-slate-600 underline hover:text-slate-900 transition-colors"
          >
            Back to Prototype Hub
          </a>
        </footer>
      </div>
    </Page>
  );
}
