import type { CredentialType } from "@prisma/client";

export type OfficialLink = {
  code: string;
  title: string;
  description: string;
  url: string;
  credentialTypes: CredentialType[];
};

/**
 * UK-first facilitation links. Aegis is not a government agency.
 * Keep URLs on official gov.uk / recognised guidance where possible.
 */
export const OFFICIAL_LINKS: OfficialLink[] = [
  {
    code: "RTW",
    title: "Prove your right to work",
    description: "Create or view a UKVI share code to prove right to work.",
    url: "https://www.gov.uk/prove-right-to-work",
    credentialTypes: ["RTW"],
  },
  {
    code: "ID_PASSPORT",
    title: "UK passport information",
    description: "Official guidance on passports as photo identity.",
    url: "https://www.gov.uk/browse/abroad/passports",
    credentialTypes: ["ID"],
  },
  {
    code: "DBS",
    title: "Apply for a basic DBS check",
    description: "Apply online for a basic Disclosure and Barring Service check.",
    url: "https://www.gov.uk/request-copy-criminal-record",
    credentialTypes: ["DBS"],
  },
  {
    code: "DBS_ENHANCED",
    title: "DBS checks overview",
    description: "Understand basic, standard and enhanced DBS checks.",
    url: "https://www.gov.uk/government/collections/dbs-checking-service-guidance--2",
    credentialTypes: ["DBS"],
  },
  {
    code: "SIA",
    title: "Apply for an SIA licence",
    description: "Security Industry Authority licence application.",
    url: "https://www.gov.uk/guidance/apply-for-an-sia-licence",
    credentialTypes: ["SIA"],
  },
  {
    code: "DRIVING",
    title: "View or share driving licence",
    description: "View your driving licence information online.",
    url: "https://www.gov.uk/view-driving-licence",
    credentialTypes: ["LICENCE"],
  },
  {
    code: "FOOD_HYGIENE",
    title: "Food hygiene training guidance",
    description: "Food Standards Agency guidance on food hygiene for businesses.",
    url: "https://www.food.gov.uk/business-guidance/safer-food-better-business",
    credentialTypes: ["CERTIFICATE"],
  },
  {
    code: "PL_INSURANCE",
    title: "Public liability insurance (guidance)",
    description: "Business insurance overview including public liability.",
    url: "https://www.gov.uk/business-insurance",
    credentialTypes: ["INSURANCE"],
  },
  {
    code: "ADDRESS",
    title: "Proof of address documents",
    description: "Common acceptable documents when proving your address.",
    url: "https://www.gov.uk/government/publications/proof-of-identity-checklist/proof-of-identity-checklist",
    credentialTypes: ["PROOF_OF_ADDRESS"],
  },
  {
    code: "SAFEGUARDING",
    title: "Safeguarding training (sector guidance)",
    description: "Skills for Care and sector safeguarding learning resources.",
    url: "https://www.skillsforcare.org.uk/",
    credentialTypes: ["SAFEGUARDING"],
  },
  {
    code: "AI_SAFETY_UK",
    title: "UK AI regulation & safety context",
    description:
      "UK government AI regulation white paper and safety context for deployers.",
    url: "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach",
    credentialTypes: ["AI_SAFETY"],
  },
  {
    code: "AI_SAFETY_NIST",
    title: "NIST AI Risk Management Framework",
    description: "International AI risk management framework for safety governance packs.",
    url: "https://www.nist.gov/itl/ai-risk-management-framework",
    credentialTypes: ["AI_SAFETY"],
  },
  {
    code: "ISO_42001",
    title: "ISO/IEC 42001 AI management systems",
    description: "Standard for AI management systems (governance evidence).",
    url: "https://www.iso.org/standard/81230.html",
    credentialTypes: ["AI_SAFETY", "POLICY_CLEARANCE"],
  },
  {
    code: "PRODUCT_SAFETY_UK",
    title: "UK product safety & CE/UKCA",
    description: "Product safety framework relevant to robot platform conformity.",
    url: "https://www.gov.uk/guidance/ce-marking",
    credentialTypes: ["ROBOT_CERT"],
  },
  {
    code: "HSE_ROBOTICS",
    title: "HSE robotics & machinery safety",
    description: "Health and Safety Executive guidance on machinery and automation risk.",
    url: "https://www.hse.gov.uk/work-equipment-machinery/",
    credentialTypes: ["ROBOT_CERT", "POLICY_CLEARANCE"],
  },
  {
    code: "CQC_CONTEXT",
    title: "CQC (care settings context)",
    description:
      "Care Quality Commission — context only. Aegis robot care-home roles are not a CQC registration product.",
    url: "https://www.cqc.org.uk/",
    credentialTypes: ["POLICY_CLEARANCE", "SAFEGUARDING"],
  },
];

export function linksForCredentialType(type: CredentialType): OfficialLink[] {
  return OFFICIAL_LINKS.filter((l) => l.credentialTypes.includes(type));
}

export function linksForMissingTypes(types: CredentialType[]): OfficialLink[] {
  const seen = new Set<string>();
  const out: OfficialLink[] = [];
  for (const t of types) {
    for (const link of linksForCredentialType(t)) {
      if (seen.has(link.code)) continue;
      seen.add(link.code);
      out.push(link);
    }
  }
  return out;
}
