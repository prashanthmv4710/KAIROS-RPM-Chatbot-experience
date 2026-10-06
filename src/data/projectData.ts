export interface FixtureItem {
  id: string;
  name: string;
  po: string;
  trailer: string;
  ordered: number;
  received: number;
  status: 'RECEIVED' | 'PARTIAL' | 'DELAYED' | 'NOT SHIPPED';
  location: string;
  vendor: string;
  existingRequest?: string;
}

export interface Department {
  id: string;
  name: string;
  start: string;
  end: string;
  status: 'COMPLETE' | 'IN PROGRESS' | 'UPCOMING';
  risk: 'ON TRACK' | 'WATCH' | 'AT RISK';
  fixturePct: number;
  location: string;
  reason?: { code: string; label: string; text: string } | null;
  recommendation?: {
    status: string;
    shiftDays: number;
    oldStart: string;
    oldEnd: string;
    newStart: string;
    newEnd: string;
    ripple: string;
    buffer: string;
    critical: boolean;
  };
  fixtures: FixtureItem[];
}

export interface Task {
  id: string;
  title: string;
  department: string;
  owner: string;
  due: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'PAUSED' | 'COMPLETED';
  urgent: boolean;
}

export interface Blocker {
  id: string;
  department: string;
  category: string;
  title: string;
  impact: string;
  owner: string;
  status: 'OPEN' | 'RESOLVED';
  logged: string;
  resolved?: string | null;
  resolution?: string | null;
  activity?: string[];
}

export interface TeamMember {
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface ProjectData {
  id: string;
  store: string;
  city: string;
  state: string;
  type: string;
  rpm: string;
  phase: string;
  possession: string;
  goLive: string;
  focus: boolean;
  checkedIn: boolean;
  departments: Department[];
  tasks: Task[];
  blockers: Blocker[];
  team: TeamMember[];
  contacts: {
    homeOffice: { name: string; role: string; email: string; phone: string };
    teamLead: { name: string; role: string; email: string; phone: string };
  };
}

export const INITIAL_PROJECTS: ProjectData[] = [
  {
    id: 'USRM-012759',
    store: '1011',
    city: 'RINCON',
    state: 'GA',
    type: 'SUP',
    rpm: 'David Cabral',
    phase: 'Possession',
    possession: '2026-07-13',
    goLive: '2026-10-23',
    focus: false,
    checkedIn: false,
    departments: [
      {
        id: 'bakery',
        name: 'Bakery & Deli',
        start: '2026-09-15',
        end: '2026-10-02',
        status: 'IN PROGRESS',
        risk: 'AT RISK',
        fixturePct: 46,
        location: 'Partially received — balance in transit, ETA Sep 26',
        reason: { code: 'SHIP_DELAY', label: 'Trailer delayed', text: 'The trailer carrying remaining fixtures missed its delivery window.' },
        recommendation: {
          status: 'PROPOSED',
          shiftDays: 5,
          oldStart: '2026-09-15',
          oldEnd: '2026-10-02',
          newStart: '2026-09-20',
          newEnd: '2026-10-07',
          ripple: 'May push Pharmacy completion by 5 days.',
          buffer: '16 days',
          critical: false,
        },
        fixtures: [
          { id: 'b-1', name: 'Outlet box — 2 duplex', po: '4502499453', trailer: 'TRL-7566', ordered: 54, received: 30, status: 'PARTIAL', location: 'Trailer TRL-7566 — 30 of 54 unloaded', vendor: 'Madix Store Solutions' },
          { id: 'b-2', name: 'Bakery rack BAK-716', po: '4502666551', trailer: 'TRL-3496', ordered: 69, received: 28, status: 'PARTIAL', location: 'Trailer TRL-3496 — 28 of 69 unloaded, ETA Sep 26', vendor: 'RangeMe Fixture Partners' },
        ],
      },
      {
        id: 'pharmacy',
        name: 'Pharmacy',
        start: '2026-09-10',
        end: '2026-09-28',
        status: 'IN PROGRESS',
        risk: 'WATCH',
        fixturePct: 62,
        location: 'Partially received — two lines in transit',
        reason: { code: 'SHIP_DELAY', label: 'Trailer delayed', text: 'Two fixture lines expected after department work starts.' },
        recommendation: {
          status: 'PROPOSED',
          shiftDays: 3,
          oldStart: '2026-09-10',
          oldEnd: '2026-09-28',
          newStart: '2026-09-13',
          newEnd: '2026-10-01',
          ripple: 'No downstream department blocked.',
          buffer: '22 days',
          critical: false,
        },
        fixtures: [
          { id: 'rx-1', name: 'Pharmacy counter upright', po: '4502522713', trailer: 'TRL-7632', ordered: 66, received: 42, status: 'PARTIAL', location: 'Trailer TRL-7632 — 42 of 66 unloaded', vendor: 'Lozier Fixtures' },
        ],
      },
      {
        id: 'grocery',
        name: 'Grocery & Consumables',
        start: '2026-07-13',
        end: '2026-08-02',
        status: 'COMPLETE',
        risk: 'ON TRACK',
        fixturePct: 100,
        location: 'Fully received — put away in department',
        fixtures: [
          { id: 'g-1', name: 'Deck side 32 × 48', po: '4502788294', trailer: 'TRL-8417', ordered: 53, received: 53, status: 'RECEIVED', location: 'Received — put away', vendor: 'Lozier Fixtures' },
        ],
      },
      {
        id: 'electronics',
        name: 'Electronics',
        start: '2026-09-29',
        end: '2026-10-15',
        status: 'UPCOMING',
        risk: 'AT RISK',
        fixturePct: 3,
        location: 'Supplemental lines not shipped',
        reason: { code: 'ORDER_DELAY', label: 'Order delayed', text: 'Supplemental order pending review.' },
        fixtures: [
          { id: 'e-1', name: 'Extender T-system 36 in', po: '4502658242', trailer: 'TRL-9968', ordered: 53, received: 9, status: 'PARTIAL', location: 'Trailer TRL-9968 — 9 of 53 unloaded', vendor: 'SOTF Fixtures Group' },
        ],
      },
    ],
    tasks: [
      { id: 'T-104', title: 'Verify Bakery trailer ETA', department: 'Bakery & Deli', owner: 'Tina Waters', due: '2026-09-21', priority: 'HIGH', status: 'IN_PROGRESS', urgent: true },
      { id: 'T-105', title: 'Review Electronics supplemental quantity', department: 'Electronics', owner: 'David Cabral', due: '2026-09-22', priority: 'HIGH', status: 'PENDING_REVIEW', urgent: true },
      { id: 'T-106', title: 'Prepare HBA staging area', department: 'Health & Beauty', owner: 'Darrio Davis', due: '2026-09-24', priority: 'MEDIUM', status: 'ASSIGNED', urgent: false },
    ],
    blockers: [
      { id: 'USRM-012759-BLK-4', department: 'Bakery & Deli', category: 'DELIVERY_DELAY', title: 'Trailer TRL-3496 missed delivery window', impact: 'SCHEDULE_AT_RISK', owner: 'RangeMe Fixture Partners', status: 'OPEN', logged: '2026-09-20', activity: ['Logged from fixture status', 'Vendor escalation drafted'] },
      { id: 'USRM-012759-BLK-3', department: 'Jewelry', category: 'STAFFING', title: 'Team member reassigned mid-project', impact: 'PARTIAL', owner: 'RPC team lead', status: 'OPEN', logged: '2026-09-19', activity: ['Logged by David Cabral', 'RPC lead notified'] },
    ],
    team: [
      { name: 'David Cabral', role: 'RPM', email: 'David.Cabral@walmart.com', phone: '+1-479-555-1031' },
      { name: 'Cheree Smith', role: 'Coordinator', email: 'Cheree.Krauss@walmart.com', phone: '+1-479-555-1032' },
      { name: 'Tina Waters', role: 'Coordinator', email: 'Tina.Waters@walmart.com', phone: '+1-479-555-1033' },
    ],
    contacts: {
      homeOffice: { name: 'Bradley Evatt', role: 'Realty Execution Director', email: 'bradley.evatt@walmart.com', phone: '+1-479-555-5171' },
      teamLead: { name: 'Tina Waters', role: 'RPC team lead', email: 'Tina.Waters@walmart.com', phone: '+1-479-555-1033' },
    },
  },
  {
    id: 'USRM-010442',
    store: '1002',
    city: 'LINTON',
    state: 'IN',
    type: 'SUP',
    rpm: 'Kevin Doelling',
    phase: 'Possession',
    possession: '2026-07-27',
    goLive: '2026-10-30',
    focus: true,
    checkedIn: false,
    departments: [
      {
        id: 'bakery',
        name: 'Bakery & Deli',
        start: '2026-09-24',
        end: '2026-10-08',
        status: 'UPCOMING',
        risk: 'AT RISK',
        fixturePct: 16,
        location: 'Balance in transit',
        fixtures: [],
      },
    ],
    tasks: [],
    blockers: [],
    team: [{ name: 'Kevin Doelling', role: 'RPM', email: 'Kevin.Doelling@walmart.com', phone: '+1-479-555-2011' }],
    contacts: {
      homeOffice: { name: 'Tracee Smith', role: 'Realty Execution Director', email: 'tracee.smith@walmart.com', phone: '+1-479-555-4242' },
      teamLead: { name: 'Aishia Stevens', role: 'RPC team lead', email: 'Aishia.Stevens@walmart.com', phone: '+1-479-555-2012' },
    },
  },
];
