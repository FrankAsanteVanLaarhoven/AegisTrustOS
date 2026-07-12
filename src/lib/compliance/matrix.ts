import type { CategoryPhase, CredentialType, RiskLevel } from "@prisma/client";

export type ChecklistItem = {
  type: CredentialType;
  label: string;
  required: boolean;
  minCount?: number;
  notes?: string;
};

export type CategorySeed = {
  slug: string;
  name: string;
  phase: CategoryPhase;
  riskLevel: RiskLevel;
  mode: "ACTIVE" | "WAITLIST" | "DISABLED";
  description: string;
  sortOrder: number;
  groupKey: string;
  groupLabel: string;
  groupSort: number;
  checklist: ChecklistItem[];
};

const baseIdentity: ChecklistItem[] = [
  { type: "ID", label: "Photo identity document", required: true },
  { type: "RTW", label: "Right to work (UK)", required: true },
  {
    type: "REFERENCE",
    label: "Professional references",
    required: true,
    minCount: 2,
    notes: "Two independent professional references",
  },
];

const plInsurance: ChecklistItem = {
  type: "INSURANCE",
  label: "Public liability insurance",
  required: true,
};

export const CATEGORY_SEEDS: CategorySeed[] = [
  // ── Executive & lifestyle ──
  {
    slug: "personal-assistant",
    name: "Personal Assistant",
    phase: "CONCIERGE",
    riskLevel: "MEDIUM",
    mode: "ACTIVE",
    description: "Discretionary executive and household PA support.",
    sortOrder: 1,
    groupKey: "executive",
    groupLabel: "Executive & lifestyle",
    groupSort: 10,
    checklist: [
      ...baseIdentity,
      { type: "INSURANCE", label: "Professional indemnity (if self-employed)", required: false },
    ],
  },
  {
    slug: "chauffeur",
    name: "Chauffeur",
    phase: "CONCIERGE",
    riskLevel: "MEDIUM",
    mode: "ACTIVE",
    description: "Vetted private drivers for executive travel.",
    sortOrder: 2,
    groupKey: "executive",
    groupLabel: "Executive & lifestyle",
    groupSort: 10,
    checklist: [
      ...baseIdentity,
      { type: "LICENCE", label: "Full UK driving licence", required: true },
      { type: "INSURANCE", label: "Hire & reward / appropriate motor insurance", required: true },
    ],
  },
  {
    slug: "travel-concierge",
    name: "Travel & Lifestyle Concierge",
    phase: "CONCIERGE",
    riskLevel: "MEDIUM",
    mode: "ACTIVE",
    description: "Travel planning, bookings, and lifestyle orchestration.",
    sortOrder: 3,
    groupKey: "executive",
    groupLabel: "Executive & lifestyle",
    groupSort: 10,
    checklist: [...baseIdentity],
  },
  {
    slug: "stylist",
    name: "Stylist",
    phase: "CONCIERGE",
    riskLevel: "MEDIUM",
    mode: "ACTIVE",
    description: "Personal styling for wardrobe and events.",
    sortOrder: 4,
    groupKey: "executive",
    groupLabel: "Executive & lifestyle",
    groupSort: 10,
    checklist: [
      ...baseIdentity,
      { type: "CERTIFICATE", label: "Relevant styling qualifications (optional)", required: false },
    ],
  },
  {
    slug: "hospitality-staff",
    name: "Hospitality Staffing",
    phase: "CONCIERGE",
    riskLevel: "MEDIUM",
    mode: "ACTIVE",
    description: "Private household and event hospitality staffing.",
    sortOrder: 5,
    groupKey: "executive",
    groupLabel: "Executive & lifestyle",
    groupSort: 10,
    checklist: [...baseIdentity],
  },

  // ── Household & domestic ──
  {
    slug: "grocery-shopper",
    name: "Personal shopper (groceries)",
    phase: "CONCIERGE",
    riskLevel: "MEDIUM",
    mode: "ACTIVE",
    description: "Trusted grocery and household shopping runs for busy clients.",
    sortOrder: 10,
    groupKey: "household",
    groupLabel: "Household & domestic",
    groupSort: 20,
    checklist: [...baseIdentity, plInsurance],
  },
  {
    slug: "cleaning",
    name: "Cleaning services",
    phase: "CONCIERGE",
    riskLevel: "MEDIUM",
    mode: "ACTIVE",
    description: "Vetted residential and private estate cleaning professionals.",
    sortOrder: 11,
    groupKey: "household",
    groupLabel: "Household & domestic",
    groupSort: 20,
    checklist: [...baseIdentity, plInsurance],
  },
  {
    slug: "private-chef",
    name: "Private / household chef",
    phase: "CONCIERGE",
    riskLevel: "MEDIUM",
    mode: "ACTIVE",
    description: "In-home professional chef for private households and events.",
    sortOrder: 12,
    groupKey: "household",
    groupLabel: "Household & domestic",
    groupSort: 20,
    checklist: [
      ...baseIdentity,
      { type: "CERTIFICATE", label: "Food hygiene Level 2 (or equivalent)", required: true },
      plInsurance,
    ],
  },

  // ── Family & pet logistics ──
  {
    slug: "dog-walker",
    name: "Dog walker",
    phase: "CONCIERGE",
    riskLevel: "MEDIUM",
    mode: "ACTIVE",
    description: "Trusted dog walking and pet exercise for private households.",
    sortOrder: 20,
    groupKey: "family_logistics",
    groupLabel: "Family & pet logistics",
    groupSort: 30,
    checklist: [...baseIdentity, plInsurance],
  },
  {
    slug: "school-pickup",
    name: "School run / pickup",
    phase: "CONCIERGE",
    riskLevel: "MEDIUM",
    mode: "ACTIVE",
    description:
      "School drop-off and pickup logistics. Not Ofsted-registered childcare or nanny services.",
    sortOrder: 21,
    groupKey: "family_logistics",
    groupLabel: "Family & pet logistics",
    groupSort: 30,
    checklist: [
      ...baseIdentity,
      { type: "LICENCE", label: "Full UK driving licence", required: true },
      { type: "INSURANCE", label: "Appropriate motor insurance", required: true },
      { type: "DBS", label: "Enhanced DBS (recommended for school logistics)", required: false },
    ],
  },

  // ── Beauty & grooming ──
  {
    slug: "beauty",
    name: "Beauty professional",
    phase: "CONCIERGE",
    riskLevel: "MEDIUM",
    mode: "ACTIVE",
    description: "Premium beauty professionals for private settings.",
    sortOrder: 30,
    groupKey: "beauty",
    groupLabel: "Beauty & grooming",
    groupSort: 40,
    checklist: [
      ...baseIdentity,
      { type: "CERTIFICATE", label: "Beauty qualification", required: true },
      plInsurance,
    ],
  },
  {
    slug: "hair-professional",
    name: "Hair professional",
    phase: "CONCIERGE",
    riskLevel: "MEDIUM",
    mode: "ACTIVE",
    description: "Private-client hair stylists and colourists.",
    sortOrder: 31,
    groupKey: "beauty",
    groupLabel: "Beauty & grooming",
    groupSort: 40,
    checklist: [
      ...baseIdentity,
      { type: "CERTIFICATE", label: "Hairdressing / styling qualification", required: true },
      plInsurance,
    ],
  },
  {
    slug: "barber",
    name: "Barber",
    phase: "CONCIERGE",
    riskLevel: "MEDIUM",
    mode: "ACTIVE",
    description: "Professional barbers for private and household appointments.",
    sortOrder: 32,
    groupKey: "beauty",
    groupLabel: "Beauty & grooming",
    groupSort: 40,
    checklist: [
      ...baseIdentity,
      { type: "CERTIFICATE", label: "Barbering qualification", required: true },
      plInsurance,
    ],
  },

  // ── Wellness & fitness ──
  {
    slug: "personal-trainer",
    name: "Personal trainer",
    phase: "CONCIERGE",
    riskLevel: "MEDIUM",
    mode: "ACTIVE",
    description: "In-home or private personal training sessions.",
    sortOrder: 40,
    groupKey: "wellness",
    groupLabel: "Wellness & fitness",
    groupSort: 50,
    checklist: [
      ...baseIdentity,
      { type: "CERTIFICATE", label: "Recognised PT qualification (e.g. Level 3)", required: true },
      plInsurance,
    ],
  },
  {
    slug: "dietitian",
    name: "Dietitian / nutritionist",
    phase: "CONCIERGE",
    riskLevel: "MEDIUM",
    mode: "ACTIVE",
    description:
      "Nutrition guidance for private clients. Not clinical prescribing or regulated medical dietetics product.",
    sortOrder: 41,
    groupKey: "wellness",
    groupLabel: "Wellness & fitness",
    groupSort: 50,
    checklist: [
      ...baseIdentity,
      {
        type: "CERTIFICATE",
        label: "Professional nutrition / dietetics registration evidence",
        required: true,
      },
      plInsurance,
    ],
  },

  // ── Home expertise ──
  {
    slug: "expert-diy",
    name: "Expert DIY / handyperson",
    phase: "CONCIERGE",
    riskLevel: "MEDIUM",
    mode: "ACTIVE",
    description: "Trusted home repairs and skilled DIY for private residences.",
    sortOrder: 50,
    groupKey: "home_expertise",
    groupLabel: "Home expertise",
    groupSort: 60,
    checklist: [
      ...baseIdentity,
      plInsurance,
      {
        type: "LICENCE",
        label: "Trade licence (if applicable to work offered)",
        required: false,
      },
    ],
  },

  // ── Robot helpers (AI safety + policy clearance) ──
  {
    slug: "robot-home-helper",
    name: "Home robot helper",
    phase: "ROBOTICS",
    riskLevel: "HIGH",
    mode: "ACTIVE",
    description:
      "Vetted robot helper deployments for private homes. Requires AI safety governance pack and site policy clearance. Operator remains human-accountable.",
    sortOrder: 70,
    groupKey: "robot_services",
    groupLabel: "Robot helpers",
    groupSort: 70,
    checklist: [
      ...baseIdentity,
      {
        type: "AI_SAFETY",
        label: "AI safety governance pack (risk assessment, fail-safes, oversight model)",
        required: true,
        notes: "Documented safety case / operational design domain for the robot system",
      },
      {
        type: "POLICY_CLEARANCE",
        label: "Household deployment policy clearance",
        required: true,
        notes: "Client site rules, privacy, emergency stop, and data handling agreement",
      },
      {
        type: "ROBOT_CERT",
        label: "Robot platform safety / conformity evidence",
        required: true,
        notes: "Manufacturer CE/UKCA or equivalent safety documentation for the unit class",
      },
      { type: "INSURANCE", label: "Robot / public liability insurance", required: true },
    ],
  },
  {
    slug: "robot-retail-assistant",
    name: "Retail robot assistant",
    phase: "ROBOTICS",
    riskLevel: "HIGH",
    mode: "ACTIVE",
    description:
      "Robot assistants for retail floors (wayfinding, stock assist, customer guidance). AI safety + venue policy clearance required.",
    sortOrder: 71,
    groupKey: "robot_services",
    groupLabel: "Robot helpers",
    groupSort: 70,
    checklist: [
      ...baseIdentity,
      {
        type: "AI_SAFETY",
        label: "AI safety governance pack",
        required: true,
      },
      {
        type: "POLICY_CLEARANCE",
        label: "Retail venue policy clearance",
        required: true,
        notes: "Site induction, public interaction policy, incident escalation path",
      },
      {
        type: "ROBOT_CERT",
        label: "Robot platform safety / conformity evidence",
        required: true,
      },
      { type: "INSURANCE", label: "Commercial robot / PL insurance", required: true },
    ],
  },
  {
    slug: "robot-commercial-facility",
    name: "Commercial facility robot",
    phase: "ROBOTICS",
    riskLevel: "HIGH",
    mode: "ACTIVE",
    description:
      "Robot helpers for offices, warehouses, and commercial facilities. Governance and facility policy clearance required.",
    sortOrder: 72,
    groupKey: "robot_services",
    groupLabel: "Robot helpers",
    groupSort: 70,
    checklist: [
      ...baseIdentity,
      {
        type: "AI_SAFETY",
        label: "AI safety governance pack",
        required: true,
      },
      {
        type: "POLICY_CLEARANCE",
        label: "Commercial facility policy clearance",
        required: true,
      },
      {
        type: "ROBOT_CERT",
        label: "Robot platform safety / conformity evidence",
        required: true,
      },
      { type: "INSURANCE", label: "Commercial robot / PL insurance", required: true },
    ],
  },
  {
    slug: "robot-care-home-support",
    name: "Care home robot support",
    phase: "ROBOTICS",
    riskLevel: "CRITICAL",
    mode: "WAITLIST",
    description:
      "Robot support in care homes (non-clinical assist). Highest bar: AI safety, safeguarding, DBS for operators, and care-home policy clearance. Not a CQC-registered care product.",
    sortOrder: 73,
    groupKey: "robot_services",
    groupLabel: "Robot helpers",
    groupSort: 70,
    checklist: [
      ...baseIdentity,
      { type: "PROOF_OF_ADDRESS", label: "Proof of address", required: true },
      { type: "DBS", label: "Enhanced DBS (operator / deployment lead)", required: true },
      { type: "SAFEGUARDING", label: "Safeguarding training evidence", required: true },
      {
        type: "AI_SAFETY",
        label: "AI safety governance pack (care setting)",
        required: true,
        notes: "Resident safety, human override, prohibited autonomous clinical actions",
      },
      {
        type: "POLICY_CLEARANCE",
        label: "Care home / provider policy clearance",
        required: true,
        notes: "Written approval from care home management / responsible person",
      },
      {
        type: "ROBOT_CERT",
        label: "Robot platform safety evidence for care environments",
        required: true,
      },
      { type: "INSURANCE", label: "Care-setting robot / PL insurance", required: true },
    ],
  },

  // ── Security (waitlist) ──
  {
    slug: "concierge-security",
    name: "Concierge Security",
    phase: "SECURITY",
    riskLevel: "HIGH",
    mode: "WAITLIST",
    description: "SIA-aware concierge security for residential and corporate sites.",
    sortOrder: 80,
    groupKey: "security",
    groupLabel: "Security",
    groupSort: 80,
    checklist: [
      ...baseIdentity,
      { type: "PROOF_OF_ADDRESS", label: "Proof of address", required: true },
      { type: "SIA", label: "Valid SIA licence", required: true },
      { type: "INSURANCE", label: "Appropriate insurance cover", required: true },
    ],
  },
  {
    slug: "event-security",
    name: "Event Security Staffing",
    phase: "SECURITY",
    riskLevel: "HIGH",
    mode: "WAITLIST",
    description: "Licensed event security staffing (scaffold).",
    sortOrder: 81,
    groupKey: "security",
    groupLabel: "Security",
    groupSort: 80,
    checklist: [
      ...baseIdentity,
      { type: "PROOF_OF_ADDRESS", label: "Proof of address", required: true },
      { type: "SIA", label: "Valid SIA licence", required: true },
      { type: "INSURANCE", label: "Appropriate insurance cover", required: true },
    ],
  },
  {
    slug: "vetted-driver",
    name: "Vetted Executive Driver",
    phase: "SECURITY",
    riskLevel: "HIGH",
    mode: "WAITLIST",
    description: "Security-sensitive vetted drivers (scaffold).",
    sortOrder: 82,
    groupKey: "security",
    groupLabel: "Security",
    groupSort: 80,
    checklist: [
      ...baseIdentity,
      { type: "LICENCE", label: "Full UK driving licence", required: true },
      { type: "DBS", label: "Enhanced DBS", required: true },
      { type: "INSURANCE", label: "Motor / hire & reward insurance", required: true },
    ],
  },

  // ── Care (waitlist) ──
  {
    slug: "home-care",
    name: "Home Care",
    phase: "CARE",
    riskLevel: "CRITICAL",
    mode: "WAITLIST",
    description:
      "Non-clinical home care coordination scaffold. Not a CQC-registered care agency product.",
    sortOrder: 90,
    groupKey: "care",
    groupLabel: "Care",
    groupSort: 90,
    checklist: [
      ...baseIdentity,
      { type: "PROOF_OF_ADDRESS", label: "Proof of address", required: true },
      { type: "DBS", label: "Enhanced DBS", required: true },
      { type: "SAFEGUARDING", label: "Safeguarding training evidence", required: true },
      { type: "INSURANCE", label: "Appropriate care insurance", required: true },
    ],
  },
  {
    slug: "live-in-care",
    name: "Live-in Care",
    phase: "CARE",
    riskLevel: "CRITICAL",
    mode: "WAITLIST",
    description: "Live-in care scaffold with elevated safeguarding expectations.",
    sortOrder: 91,
    groupKey: "care",
    groupLabel: "Care",
    groupSort: 90,
    checklist: [
      ...baseIdentity,
      { type: "PROOF_OF_ADDRESS", label: "Proof of address", required: true },
      { type: "DBS", label: "Enhanced DBS", required: true },
      { type: "SAFEGUARDING", label: "Safeguarding training evidence", required: true },
      { type: "INSURANCE", label: "Appropriate care insurance", required: true },
    ],
  },
  {
    slug: "specialist-carer",
    name: "Specialist Carer",
    phase: "CARE",
    riskLevel: "CRITICAL",
    mode: "WAITLIST",
    description: "Specialist carer interest list — compliance tooling required before go-live.",
    sortOrder: 92,
    groupKey: "care",
    groupLabel: "Care",
    groupSort: 90,
    checklist: [
      ...baseIdentity,
      { type: "PROOF_OF_ADDRESS", label: "Proof of address", required: true },
      { type: "DBS", label: "Enhanced DBS", required: true },
      { type: "SAFEGUARDING", label: "Safeguarding training evidence", required: true },
      { type: "CERTIFICATE", label: "Specialist qualification evidence", required: true },
      { type: "INSURANCE", label: "Appropriate care insurance", required: true },
    ],
  },
];

export type CredentialLike = {
  type: CredentialType;
  verificationStatus: string;
};

export type ChecklistResult = {
  type: CredentialType;
  label: string;
  required: boolean;
  minCount: number;
  present: number;
  satisfied: boolean;
  notes?: string;
};

export function evaluateChecklist(
  checklist: ChecklistItem[],
  credentials: CredentialLike[],
): ChecklistResult[] {
  return checklist.map((item) => {
    const minCount = item.minCount ?? 1;
    const present = credentials.filter((c) => c.type === item.type).length;
    const satisfied = !item.required || present >= minCount;
    return {
      type: item.type,
      label: item.label,
      required: item.required,
      minCount,
      present,
      satisfied,
      notes: item.notes,
    };
  });
}

export function missingRequired(results: ChecklistResult[]): ChecklistResult[] {
  return results.filter((r) => r.required && !r.satisfied);
}

export function checklistComplete(results: ChecklistResult[]): boolean {
  return missingRequired(results).length === 0;
}
