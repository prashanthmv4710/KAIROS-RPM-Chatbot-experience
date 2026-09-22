import * as React from 'react';
import { Page } from '../components/Page';
import { Icon } from '../components/Icons';
import { IconButton } from '../components/IconButton';
import { useAnnounce } from '../components/A11yAnnouncement';

interface ChatMessage {
  id: string;
  sender: 'user' | 'squiggly';
  text: string;
  timestamp: string;
  richData?: {
    type: 'schedule' | 'pto' | 'callins' | 'teamlead' | 'tools' | 'scan';
    title: string;
    items: string[];
  };
}

const SUGGESTED_PROMPTS = [
  'View my department schedule',
  'Obtain the necessary PTO sign-offs',
  'Who called in?',
  'Team lead schedule',
  'Team building some collaboration tools',
];

export function KairosChatPage() {
  const announce = useAnnounce();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = React.useState('');
  const [userName, setUserName] = React.useState('Associate');
  const [showSettings, setShowSettings] = React.useState(false);
  const [isScanning, setIsScanning] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendPrompt = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    announce.polite(`Sent message: ${trimmed}`);

    // Generate responsive reply based on prompt content
    setTimeout(() => {
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      let reply: ChatMessage;

      const lower = trimmed.toLowerCase();
      if (lower.includes('schedule') && lower.includes('department')) {
        reply = {
          id: `reply-${Date.now()}`,
          sender: 'squiggly',
          text: `Here is the current shift coverage for your department today:`,
          timestamp: replyTime,
          richData: {
            type: 'schedule',
            title: 'Department 92 & 95 — Today Shift',
            items: [
              'Morning (07:00 - 15:30): 4 Associates On Clock',
              'Mid (11:00 - 19:30): 3 Associates Active',
              'Evening (15:00 - 23:30): 5 Associates Scheduled',
              'Coverage Health: 96% optimal to forecast',
            ],
          },
        };
      } else if (lower.includes('pto') || lower.includes('sign-off')) {
        reply = {
          id: `reply-${Date.now()}`,
          sender: 'squiggly',
          text: `You have 2 pending PTO approval requests requiring sign-off:`,
          timestamp: replyTime,
          richData: {
            type: 'pto',
            title: 'Pending Time-Off Approvals',
            items: [
              'Carlos M. — Oct 4-6 (Personal / 24 hrs) • Coverage confirmed',
              'Sarah K. — Oct 11 (Family care / 8 hrs) • Peer swap available',
              'Quick Action: Approved Carlos M. via one-click',
            ],
          },
        };
      } else if (lower.includes('called in') || lower.includes('call-in') || lower.includes('call in')) {
        reply = {
          id: `reply-${Date.now()}`,
          sender: 'squiggly',
          text: `Here are today's call-ins reported as of 9:40 AM:`,
          timestamp: replyTime,
          richData: {
            type: 'callins',
            title: 'Attendance Exception Report',
            items: [
              'Marcus D. (Stocking 1) — Absent (Tardy / Transportation)',
              'Elena R. (Front End) — Ill (Approved sick bank)',
              'Rebalancing tip: Shift 1 associate from Garden Center to Front End at 11:00 AM.',
            ],
          },
        };
      } else if (lower.includes('team lead') || lower.includes('lead schedule')) {
        reply = {
          id: `reply-${Date.now()}`,
          sender: 'squiggly',
          text: `Team Lead roster for Store #100 today:`,
          timestamp: replyTime,
          richData: {
            type: 'teamlead',
            title: 'Team Lead On-Duty Roster',
            items: [
              'Sarah J. (Digital / OPD) — 06:00 - 15:00 (On Duty)',
              'David B. (Consumables) — 07:00 - 16:00 (On Duty)',
              'Rachel T. (Hardlines) — 13:00 - 22:00 (Upcoming)',
            ],
          },
        };
      } else if (lower.includes('collaboration') || lower.includes('tool')) {
        reply = {
          id: `reply-${Date.now()}`,
          sender: 'squiggly',
          text: `Here are the KAIROS collaboration workspaces linked to your team:`,
          timestamp: replyTime,
          richData: {
            type: 'tools',
            title: 'Connected Team Hubs',
            items: [
              'KAIROS REX Director: Store Walk & Modular Health Dashboard',
              'RPM Assistant: Replenishment & Out-Of-Stock Orchestration',
              'Store Walk Sync: Live notes and zone assignments with team leads',
            ],
          },
        };
      } else {
        reply = {
          id: `reply-${Date.now()}`,
          sender: 'squiggly',
          text: `I've analyzed your query regarding "${trimmed}". Let me know if you would like me to pull department metrics, flag attendance, or sync tasks into KAIROS.`,
          timestamp: replyTime,
        };
      }

      setMessages((prev) => [...prev, reply]);
      announce.polite('Squiggly replied.');
    }, 600);
  };

  const handleSimulateScan = () => {
    setIsScanning(true);
    announce.polite('Opening barcode scanner...');
    setTimeout(() => {
      setIsScanning(false);
      handleSendPrompt('Scan UPC #07874235261 — Great Value Whole Milk 1 Gal');
    }, 1200);
  };

  const hasMessages = messages.length > 0;

  return (
    <Page title="KAIROS Chat Experience" titleVisuallyHidden>
      {/* Outer viewport container */}
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#f1f5f9',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px',
        }}
      >
        {/* Mobile Device Frame matching Figma Squiggly 8568:5825 */}
        <div
          style={{
            width: '100%',
            maxWidth: '430px',
            height: '920px',
            backgroundColor: '#ffffff',
            borderRadius: '44px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 12px #0f172a',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* iOS Device Bar / Status Bar */}
          <header
            style={{
              height: '44px',
              padding: '0 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              color: '#000000',
              zIndex: 20,
            }}
            aria-label="Device Status"
          >
            <span>9:41</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Cellular */}
              <svg width="17" height="11" viewBox="0 0 17 11" fill="none" aria-hidden="true">
                <rect x="0" y="8" width="3" height="3" rx="0.5" fill="#000" />
                <rect x="4.5" y="5.5" width="3" height="5.5" rx="0.5" fill="#000" />
                <rect x="9" y="3" width="3" height="8" rx="0.5" fill="#000" />
                <rect x="13.5" y="0.5" width="3" height="10.5" rx="0.5" fill="#000" />
              </svg>
              {/* Wi-Fi */}
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
                <path
                  d="M8 11.5a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5zM3.5 6.7a6.5 6.5 0 019 0 .8.8 0 001.1-1.1 8 8 0 00-11.2 0 .8.8 0 001.1 1.1zM.5 3.5a11 11 0 0115 0 .8.8 0 001.1-1.1 12.5 12.5 0 00-17.2 0 .8.8 0 001.1 1.1z"
                  fill="#000"
                />
              </svg>
              {/* Battery */}
              <svg width="24" height="11" viewBox="0 0 24 11" fill="none" aria-hidden="true">
                <rect x="0.5" y="0.5" width="20" height="10" rx="3" stroke="#000" />
                <rect x="2" y="2" width="15" height="7" rx="1.5" fill="#000" />
                <path d="M22 3.5v4" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </header>

          {/* App Header (Squiggly Brand Bar) */}
          <div
            style={{
              height: '56px',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f1f5f9',
              backgroundColor: '#ffffff',
              zIndex: 10,
            }}
          >
            <IconButton
              a11yLabel="Close chat session"
              variant="ghost"
              size="small"
              onClick={() => {
                setMessages([]);
                announce.polite('Chat reset to home greeting');
              }}
            >
              <Icon name="Close" decorative />
            </IconButton>

            {/* Squiggly Logo + Wordmark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #70d6ff 0%, #0071ce 50%, #004f98 100%)',
                  boxShadow: '0 2px 8px rgba(0, 113, 206, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-hidden="true"
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    opacity: 0.8,
                    filter: 'blur(1px)',
                    transform: 'translate(-3px, -3px)',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#002244',
                  letterSpacing: '-0.02em',
                }}
              >
                Squiggly
              </span>
            </div>

            <IconButton
              a11yLabel="Open KAIROS contextual panel"
              variant="ghost"
              size="small"
              onClick={() => setShowSettings(!showSettings)}
            >
              {/* Split-panel icon matching Figma */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <line x1="12" y1="3" x2="12" y2="21" />
              </svg>
            </IconButton>
          </div>

          {/* Settings / Panel drawer if toggled */}
          {showSettings && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                padding: '12px 20px',
                fontSize: '13px',
                color: '#334155',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong>Active Associate:</strong> {userName}
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextName = userName === 'Associate' ? 'Mav' : 'Associate';
                  setUserName(nextName);
                }}
                style={{
                  padding: '4px 8px',
                  background: '#e0f2fe',
                  color: '#0071ce',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Switch Name
              </button>
            </div>
          )}

          {/* Main Content Area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
            }}
          >
            {/* If NO messages sent yet: Show Figma Hero Greeting & Suggested Prompts */}
            {!hasMessages ? (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* Hero Greeting Text matching Figma typography */}
                <div style={{ marginTop: '32px', marginBottom: '40px' }}>
                  <h2
                    style={{
                      fontSize: '38px',
                      lineHeight: '1.2',
                      fontWeight: 700,
                      color: '#004F98',
                      margin: 0,
                      letterSpacing: '-0.02em',
                      fontFamily: 'Bogle, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    }}
                  >
                    Hi [{userName}],<br />
                    how can I help you today?
                  </h2>
                </div>

                {/* Vertical Suggested Prompt Pills matching Figma styles */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                  role="group"
                  aria-label="Suggested Prompts"
                >
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSendPrompt(prompt)}
                      style={{
                        padding: '12px 20px',
                        backgroundColor: '#E6F1FC',
                        color: '#002244',
                        border: 'none',
                        borderRadius: '24px',
                        fontSize: '16px',
                        fontWeight: 500,
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 1px 2px rgba(0, 79, 152, 0.08)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#d0e5fb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#E6F1FC';
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Conversation Stream */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '85%',
                        padding: '12px 18px',
                        borderRadius:
                          msg.sender === 'user'
                            ? '20px 20px 4px 20px'
                            : '20px 20px 20px 4px',
                        backgroundColor: msg.sender === 'user' ? '#0071ce' : '#F0F5FA',
                        color: msg.sender === 'user' ? '#ffffff' : '#002244',
                        fontSize: '15px',
                        lineHeight: '1.45',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                    >
                      {msg.text}

                      {/* Rich Data Card if reply has one */}
                      {msg.richData && (
                        <div
                          style={{
                            marginTop: '12px',
                            padding: '12px',
                            backgroundColor: '#ffffff',
                            borderRadius: '12px',
                            border: '1px solid #dbeafe',
                            color: '#1e293b',
                            fontSize: '13px',
                          }}
                        >
                          <div style={{ fontWeight: 700, color: '#004F98', marginBottom: '8px' }}>
                            {msg.richData.title}
                          </div>
                          <ul style={{ margin: 0, paddingLeft: '18px' }}>
                            {msg.richData.items.map((item, idx) => (
                              <li key={idx} style={{ marginBottom: '4px' }}>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#94a3b8',
                        marginTop: '4px',
                        padding: '0 6px',
                      }}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Barcode Scanning Overlay State */}
          {isScanning && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                padding: '24px',
              }}
            >
              <div
                style={{
                  width: '240px',
                  height: '160px',
                  border: '2px dashed #38bdf8',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  marginBottom: '20px',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    backgroundColor: '#ef4444',
                    boxShadow: '0 0 10px #ef4444',
                    animation: 'none',
                  }}
                />
                <Icon name="Barcode" decorative />
              </div>
              <p style={{ fontSize: '16px', fontWeight: 600 }}>Scanning Barcode / UPC...</p>
              <p style={{ fontSize: '13px', color: '#94a3b8' }}>Align red beam over barcode</p>
            </div>
          )}

          {/* Bottom Dock Input matching Figma */}
          <footer
            style={{
              padding: '12px 16px 28px 16px',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt(inputValue);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              {/* Rounded capsule prompt input */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '9999px',
                  padding: '8px 18px',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}
              >
                <input
                  type="text"
                  aria-label="Ask me anything"
                  placeholder="Ask me anything"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    fontSize: '15px',
                    color: '#002244',
                    backgroundColor: 'transparent',
                  }}
                />
                {inputValue.trim() && (
                  <button
                    type="submit"
                    aria-label="Send message"
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#0071ce',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                    }}
                  >
                    <Icon name="ArrowUp" decorative />
                  </button>
                )}
              </div>

              {/* Barcode scanner action button */}
              <button
                type="button"
                aria-label="Scan barcode or shelf tag"
                onClick={handleSimulateScan}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  border: '1.5px solid #E2E8F0',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  color: '#002244',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Barcode Icon glyph matching Figma */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 5v14" />
                  <path d="M8 5v14" />
                  <path d="M12 5v14" />
                  <path d="M17 5v14" />
                  <path d="M21 5v14" />
                </svg>
              </button>
            </form>

            {/* iOS Home Indicator Bar */}
            <div
              style={{
                width: '134px',
                height: '5px',
                backgroundColor: '#000000',
                borderRadius: '100px',
                margin: '18px auto 0 auto',
              }}
              aria-hidden="true"
            />
          </footer>
        </div>
      </div>
    </Page>
  );
}
