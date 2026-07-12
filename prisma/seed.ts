import {
  PrismaClient,
  type UserRole,
  type TrustTier,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { CATEGORY_SEEDS } from "../src/lib/compliance/matrix";
import { NDA_TEMPLATE, SERVICE_TEMPLATE } from "../src/lib/contracts/templates";

const db = new PrismaClient();

const PASSWORD = "aegis-demo";

async function upsertUser(
  email: string,
  name: string,
  role: UserRole,
  passwordHash: string,
) {
  return db.user.upsert({
    where: { email },
    update: { name, role, passwordHash },
    create: { email, name, role, passwordHash },
  });
}

async function main() {
  console.log("Seeding Aegis…");
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // Categories
  for (const c of CATEGORY_SEEDS) {
    await db.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        phase: c.phase,
        riskLevel: c.riskLevel,
        mode: c.mode,
        description: c.description,
        checklistJson: JSON.stringify(c.checklist),
        sortOrder: c.sortOrder,
        groupKey: c.groupKey,
        groupLabel: c.groupLabel,
        groupSort: c.groupSort,
      },
      create: {
        slug: c.slug,
        name: c.name,
        phase: c.phase,
        riskLevel: c.riskLevel,
        mode: c.mode,
        description: c.description,
        checklistJson: JSON.stringify(c.checklist),
        sortOrder: c.sortOrder,
        groupKey: c.groupKey,
        groupLabel: c.groupLabel,
        groupSort: c.groupSort,
      },
    });
  }

  const ops = await upsertUser("ops@aegis.demo", "Aegis Ops", "OPS", passwordHash);
  const admin = await upsertUser("admin@aegis.demo", "Aegis Admin", "ADMIN", passwordHash);
  const clientUser = await upsertUser(
    "client@aegis.demo",
    "Alex Morgan",
    "CLIENT",
    passwordHash,
  );
  const eaUser = await upsertUser(
    "ea@aegis.demo",
    "Jordan Ellis (EA)",
    "CLIENT",
    passwordHash,
  );
  const paUser = await upsertUser(
    "pa@aegis.demo",
    "Sam Okonkwo",
    "PROVIDER",
    passwordHash,
  );
  const driverUser = await upsertUser(
    "driver@aegis.demo",
    "Chris Patel",
    "PROVIDER",
    passwordHash,
  );
  const stylistUser = await upsertUser(
    "stylist@aegis.demo",
    "Riley Chen",
    "PROVIDER",
    passwordHash,
  );
  const securityUser = await upsertUser(
    "security@aegis.demo",
    "Morgan Blake",
    "PROVIDER",
    passwordHash,
  );
  const agencyUser = await upsertUser(
    "agency@aegis.demo",
    "Priya Shah",
    "CLIENT",
    passwordHash,
  );

  const client = await db.clientProfile.upsert({
    where: { userId: clientUser.id },
    update: { organisation: "Morgan Holdings", clientRiskTier: "VIP", city: "London" },
    create: {
      userId: clientUser.id,
      organisation: "Morgan Holdings",
      clientRiskTier: "VIP",
      city: "London",
      notes: "Pilot UHNW client — London",
    },
  });

  await db.clientProfile.upsert({
    where: { userId: eaUser.id },
    update: { organisation: "Morgan Holdings EA Office", clientRiskTier: "ELEVATED" },
    create: {
      userId: eaUser.id,
      organisation: "Morgan Holdings EA Office",
      clientRiskTier: "ELEVATED",
      city: "London",
    },
  });

  await db.clientProfile.upsert({
    where: { userId: agencyUser.id },
    update: { organisation: "Mayfair Staffing Partners", clientRiskTier: "STANDARD" },
    create: {
      userId: agencyUser.id,
      organisation: "Mayfair Staffing Partners",
      clientRiskTier: "STANDARD",
      city: "London",
    },
  });

  const pa = await db.providerProfile.upsert({
    where: { userId: paUser.id },
    update: {
      overallStatus: "VERIFIED",
      riskScore: 22,
      city: "London",
      area: "Kensington",
      lat: 51.501,
      lng: -0.193,
      bio: "Former chief of staff. Discreet PA for executives and family offices. 8 years experience.",
      skillsJson: JSON.stringify(["calendar", "travel", "vendors", "discretion"]),
      lastReviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      reviewedById: ops.id,
    },
    create: {
      userId: paUser.id,
      overallStatus: "VERIFIED",
      riskScore: 22,
      city: "London",
      area: "Kensington",
      lat: 51.501,
      lng: -0.193,
      bio: "Former chief of staff. Discreet PA for executives and family offices. 8 years experience.",
      skillsJson: JSON.stringify(["calendar", "travel", "vendors", "discretion"]),
      lastReviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      reviewedById: ops.id,
    },
  });

  const driver = await db.providerProfile.upsert({
    where: { userId: driverUser.id },
    update: {
      overallStatus: "VERIFIED",
      riskScore: 28,
      city: "London",
      area: "Canary Wharf",
      lat: 51.505,
      lng: -0.023,
      bio: "Executive chauffeur. Clean licence. Airport and multi-day itineraries.",
      skillsJson: JSON.stringify(["chauffeur", "airport", "executive"]),
      lastReviewedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      reviewedById: ops.id,
    },
    create: {
      userId: driverUser.id,
      overallStatus: "VERIFIED",
      riskScore: 28,
      city: "London",
      area: "Canary Wharf",
      lat: 51.505,
      lng: -0.023,
      bio: "Executive chauffeur. Clean licence. Airport and multi-day itineraries.",
      skillsJson: JSON.stringify(["chauffeur", "airport", "executive"]),
      lastReviewedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      reviewedById: ops.id,
    },
  });

  const stylist = await db.providerProfile.upsert({
    where: { userId: stylistUser.id },
    update: {
      overallStatus: "IN_REVIEW",
      riskScore: 48,
      city: "London",
      area: "Shoreditch",
      lat: 51.526,
      lng: -0.078,
      bio: "Editorial stylist. Private clients and events. Mentions SIA incorrectly in draft bio for AI flag demo.",
      skillsJson: JSON.stringify(["styling", "wardrobe", "events"]),
    },
    create: {
      userId: stylistUser.id,
      overallStatus: "IN_REVIEW",
      riskScore: 48,
      city: "London",
      area: "Shoreditch",
      lat: 51.526,
      lng: -0.078,
      bio: "Editorial stylist. Private clients and events. Mentions SIA incorrectly in draft bio for AI flag demo.",
      skillsJson: JSON.stringify(["styling", "wardrobe", "events"]),
    },
  });

  const security = await db.providerProfile.upsert({
    where: { userId: securityUser.id },
    update: {
      overallStatus: "SUBMITTED",
      riskScore: 72,
      city: "London",
      area: "Westminster",
      bio: "Concierge security professional. SIA: AB12CD34. Awaiting vertical go-live.",
      skillsJson: JSON.stringify(["security", "concierge"]),
    },
    create: {
      userId: securityUser.id,
      overallStatus: "SUBMITTED",
      riskScore: 72,
      city: "London",
      area: "Westminster",
      lat: 51.499,
      lng: -0.124,
      bio: "Concierge security professional. SIA: AB12CD34. Awaiting vertical go-live.",
      skillsJson: JSON.stringify(["security", "concierge"]),
    },
  });

  const cats = await db.category.findMany();
  const bySlug = Object.fromEntries(cats.map((c) => [c.slug, c]));

  async function ensureCategory(
    providerId: string,
    slug: string,
    status: "VERIFIED" | "IN_REVIEW" | "WAITLIST" | "SUBMITTED",
    trustTier: TrustTier = "T2",
  ) {
    const categoryId = bySlug[slug].id;
    const submittedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    await db.providerCategory.upsert({
      where: { providerId_categoryId: { providerId, categoryId } },
      update: {
        status,
        trustTier,
        submittedAt,
        verifiedAt: status === "VERIFIED" ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) : null,
        aiSignalsJson: JSON.stringify({
          signals: [],
          disclaimer: "Advisory only",
        }),
      },
      create: {
        providerId,
        categoryId,
        status,
        trustTier,
        submittedAt,
        verifiedAt: status === "VERIFIED" ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) : null,
        aiSignalsJson: JSON.stringify({ signals: [], disclaimer: "Advisory only" }),
      },
    });
  }

  await ensureCategory(pa.id, "personal-assistant", "VERIFIED", "T2");
  await ensureCategory(driver.id, "chauffeur", "VERIFIED", "T2");
  await ensureCategory(stylist.id, "stylist", "IN_REVIEW", "T1");
  await ensureCategory(security.id, "concierge-security", "WAITLIST", "T1");

  async function addCred(
    providerId: string,
    type: Parameters<typeof db.credential.create>[0]["data"]["type"],
    title: string,
    status: "VERIFIED" | "PENDING" | "AI_FLAGGED" = "VERIFIED",
  ) {
    await db.credential.create({
      data: {
        providerId,
        type,
        title,
        issuer: "UK Authority / Employer",
        verificationStatus: status,
        issuedAt: new Date("2024-01-15"),
        expiresAt: new Date("2027-01-15"),
      },
    });
  }

  // Clear existing demo credentials to avoid dupes on re-seed
  await db.credential.deleteMany({
    where: { providerId: { in: [pa.id, driver.id, stylist.id, security.id] } },
  });
  await db.trustReview.deleteMany({
    where: { providerId: { in: [pa.id, driver.id] } },
  });
  await db.idvCheck.deleteMany({
    where: { providerProfileId: { in: [pa.id, driver.id, stylist.id] } },
  });

  for (const pid of [pa.id, driver.id]) {
    await addCred(pid, "ID", "Passport");
    await addCred(pid, "RTW", "Right to work share code evidence");
    await addCred(pid, "REFERENCE", "Reference — former employer");
    await addCred(pid, "REFERENCE", "Reference — client family office");
  }
  await addCred(driver.id, "LICENCE", "UK full driving licence");
  await addCred(driver.id, "INSURANCE", "Hire & reward insurance");

  await addCred(stylist.id, "ID", "Passport", "PENDING");
  await addCred(stylist.id, "RTW", "RTW evidence", "PENDING");
  await addCred(stylist.id, "REFERENCE", "Reference one", "PENDING");

  await addCred(security.id, "ID", "Passport", "PENDING");
  await addCred(security.id, "RTW", "RTW", "PENDING");
  await addCred(security.id, "SIA", "SIA licence AB12CD34", "AI_FLAGGED");

  await db.idvCheck.create({
    data: {
      providerProfileId: pa.id,
      vendor: "MOCK",
      status: "PASSED",
      livenessScore: 0.98,
      externalRef: "mock_pa_seed",
      completedAt: new Date(),
      rawResultJson: JSON.stringify({ simulated: true, pass: true }),
    },
  });
  await db.idvCheck.create({
    data: {
      providerProfileId: driver.id,
      vendor: "MOCK",
      status: "PASSED",
      livenessScore: 0.96,
      externalRef: "mock_driver_seed",
      completedAt: new Date(),
      rawResultJson: JSON.stringify({ simulated: true, pass: true }),
    },
  });

  await db.trustReview.create({
    data: {
      providerId: pa.id,
      reviewerId: ops.id,
      decision: "CLEAR",
      rationale: "Complete identity pack, strong references, London PA track record.",
      categorySlug: "personal-assistant",
      checklistSnapshotJson: JSON.stringify({ complete: true }),
      aiSignalsJson: JSON.stringify({ riskScore: 22 }),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });
  await db.trustReview.create({
    data: {
      providerId: driver.id,
      reviewerId: ops.id,
      decision: "CLEAR",
      rationale: "Licence + insurance verified. Advisory risk acceptable.",
      categorySlug: "chauffeur",
      checklistSnapshotJson: JSON.stringify({ complete: true }),
      aiSignalsJson: JSON.stringify({ riskScore: 28 }),
      createdAt: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000),
    },
  });

  // Aegis Passports for verified demo providers
  await db.verificationInterview.deleteMany({});
  await db.aegisPassport.deleteMany({});
  const exp = new Date();
  exp.setFullYear(exp.getFullYear() + 1);
  await db.aegisPassport.create({
    data: {
      providerId: pa.id,
      passportNumber: "AGS-UK-PADEMO01",
      publicSlug: "sam-okonkwo-pa",
      status: "ACTIVE",
      tier: "T2",
      verifiedCategoriesJson: JSON.stringify(["personal-assistant"]),
      expiresAt: exp,
    },
  });
  await db.aegisPassport.create({
    data: {
      providerId: driver.id,
      passportNumber: "AGS-UK-DRVDEMO1",
      publicSlug: "chris-patel-chauffeur",
      status: "ACTIVE",
      tier: "T2",
      verifiedCategoriesJson: JSON.stringify(["chauffeur"]),
      expiresAt: exp,
    },
  });
  await db.verificationInterview.create({
    data: {
      providerId: stylist.id,
      reviewerId: ops.id,
      roomCode: "demo-room-stylist",
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: "SCHEDULED",
      outcome: "PENDING",
      notes: "Final face-to-face confidence check before clearance.",
      consentVideo: true,
    },
  });

  // Clean transactional demo data
  await db.review.deleteMany({});
  await db.serviceLog.deleteMany({});
  await db.incident.deleteMany({});
  await db.booking.deleteMany({});
  await db.contract.deleteMany({});
  await db.match.deleteMany({});
  await db.serviceRequest.deleteMany({});
  await db.auditEvent.deleteMany({});
  await db.trustPlaybookStep.deleteMany({});
  await db.partnerMembership.deleteMany({});
  await db.partnerOrg.deleteMany({});

  const startPast = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const endPast = new Date(startPast.getTime() + 4 * 60 * 60 * 1000);

  const completedReq = await db.serviceRequest.create({
    data: {
      clientId: client.id,
      categoryId: bySlug["personal-assistant"].id,
      title: "Week-on diary & travel support",
      brief:
        "Need discreet PA for investor week in London — calendar, car logistics, dinner reservations.",
      location: "London",
      area: "Mayfair",
      startAt: startPast,
      endAt: endPast,
      status: "COMPLETED",
      discretionLevel: "HIGH",
      budgetBand: "PREMIUM",
      minTrustTier: "T2",
      skillsJson: JSON.stringify(["calendar", "travel", "discretion"]),
    },
  });

  await db.match.create({
    data: {
      requestId: completedReq.id,
      providerId: pa.id,
      score: 88,
      reasonsJson: JSON.stringify([
        "Trust tier T2",
        "Based in London",
        "Skills: calendar, travel, discretion",
      ]),
      status: "ACCEPTED",
    },
  });

  const contract = await db.contract.create({
    data: {
      requestId: completedReq.id,
      providerId: pa.id,
      clientId: client.id,
      type: "SERVICE",
      templateKey: "SERVICE",
      bodyMarkdown: SERVICE_TEMPLATE,
      status: "SIGNED",
      signedAtClient: startPast,
      signedAtProvider: startPast,
    },
  });

  await db.contract.create({
    data: {
      requestId: completedReq.id,
      providerId: pa.id,
      clientId: client.id,
      type: "NDA",
      templateKey: "NDA",
      bodyMarkdown: NDA_TEMPLATE,
      status: "SIGNED",
      signedAtClient: startPast,
      signedAtProvider: startPast,
    },
  });

  const booking = await db.booking.create({
    data: {
      requestId: completedReq.id,
      contractId: contract.id,
      providerId: pa.id,
      clientId: client.id,
      scheduledStart: startPast,
      scheduledEnd: endPast,
      status: "COMPLETED",
      location: "Mayfair, London",
    },
  });

  await db.serviceLog.createMany({
    data: [
      {
        bookingId: booking.id,
        kind: "CHECK_IN",
        body: "Arrived Mayfair residence.",
        createdById: paUser.id,
        createdAt: startPast,
      },
      {
        bookingId: booking.id,
        kind: "NOTE",
        body: "Diary locked for investor dinners; chauffeur briefed.",
        createdById: paUser.id,
      },
      {
        bookingId: booking.id,
        kind: "CHECK_OUT",
        body: "Handover complete.",
        createdById: paUser.id,
        createdAt: endPast,
      },
    ],
  });

  await db.review.create({
    data: {
      bookingId: booking.id,
      rating: 5,
      body: "Exceptional discretion and pace. Will rebook.",
      createdById: clientUser.id,
    },
  });

  // Open request for matching demo
  const openReq = await db.serviceRequest.create({
    data: {
      clientId: client.id,
      categoryId: bySlug["chauffeur"].id,
      title: "Heathrow → City + evening standby",
      brief: "VIP arrival Terminal 5, transfer to City dinner, standby until 23:00.",
      location: "London",
      area: "City of London",
      startAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
      status: "OPEN",
      discretionLevel: "HIGH",
      budgetBand: "PREMIUM",
      minTrustTier: "T1",
      skillsJson: JSON.stringify(["chauffeur", "airport", "executive"]),
    },
  });

  await db.match.create({
    data: {
      requestId: openReq.id,
      providerId: driver.id,
      score: 91,
      reasonsJson: JSON.stringify([
        "Trust tier T2",
        "Within ~8km service radius",
        "Skills: chauffeur, airport, executive",
      ]),
      status: "SUGGESTED",
    },
  });

  // Demo incident (resolved historically for rate demo) + one open
  await db.incident.create({
    data: {
      bookingId: booking.id,
      providerId: pa.id,
      clientId: client.id,
      severity: "LOW",
      status: "RESOLVED",
      summary: "Minor schedule conflict with restaurant reservation — resolved same day.",
      resolution: "Rebooked restaurant; client satisfied.",
      openedById: ops.id,
      openedAt: endPast,
      closedAt: new Date(endPast.getTime() + 3 * 60 * 60 * 1000),
    },
  });

  await db.incident.create({
    data: {
      providerId: stylist.id,
      severity: "MED",
      status: "OPEN",
      summary: "Ops note: incomplete reference pack on stylist application.",
      openedById: ops.id,
    },
  });

  const playbook = [
    {
      code: "TS-01",
      title: "Never auto-clear on AI signals",
      verticalPhase: "CORE",
      sortOrder: 1,
      bodyMarkdown:
        "AI extracts, flags, and triages only. A human OPS/ADMIN reviewer must record a TrustReview decision before any VERIFIED status.",
    },
    {
      code: "TS-02",
      title: "Evidence pack completeness",
      verticalPhase: "CORE",
      sortOrder: 2,
      bodyMarkdown:
        "Required credentials from the category compliance matrix must be present. Gaps → REQUEST_MORE, not silent pass.",
    },
    {
      code: "TS-03",
      title: "Security vertical (SIA)",
      verticalPhase: "SECURITY",
      sortOrder: 3,
      bodyMarkdown:
        "Concierge/event security requires valid SIA evidence and elevated ops review. Vertical remains WAITLIST until operational controls ship.",
    },
    {
      code: "TS-04",
      title: "Care vertical (safeguarding)",
      verticalPhase: "CARE",
      sortOrder: 4,
      bodyMarkdown:
        "Care roles require Enhanced DBS + safeguarding evidence. Platform is not a CQC-registered agency. No medication workflows in MVP.",
    },
    {
      code: "TS-05",
      title: "Incident escalation",
      verticalPhase: "CORE",
      sortOrder: 5,
      bodyMarkdown:
        "HIGH/CRITICAL incidents: acknowledge within 1 hour (pilot SLA), escalate to senior ops, freeze provider if safety risk, document resolution in audit log.",
    },
    {
      code: "TS-06",
      title: "Client communication",
      verticalPhase: "CORE",
      sortOrder: 6,
      bodyMarkdown:
        "Do not overclaim vetting depth. Use: platform-facilitated checks + human review. Offer reassignment paths on incidents.",
    },
  ];

  for (const step of playbook) {
    await db.trustPlaybookStep.create({ data: step });
  }

  const partner = await db.partnerOrg.create({
    data: {
      name: "Mayfair Staffing Partners",
      slug: "mayfair-staffing",
      type: "AGENCY",
      status: "ACTIVE",
      contactEmail: "agency@aegis.demo",
      brandingJson: JSON.stringify({ primary: "#0b1f33", accent: "#c4a35a" }),
    },
  });

  await db.partnerMembership.create({
    data: {
      partnerOrgId: partner.id,
      userId: agencyUser.id,
      role: "OWNER",
    },
  });

  await db.auditEvent.createMany({
    data: [
      {
        actorId: ops.id,
        entityType: "ProviderProfile",
        entityId: pa.id,
        action: "TRUST_CLEAR",
        payloadJson: JSON.stringify({ category: "personal-assistant" }),
      },
      {
        actorId: ops.id,
        entityType: "ProviderProfile",
        entityId: driver.id,
        action: "TRUST_CLEAR",
        payloadJson: JSON.stringify({ category: "chauffeur" }),
      },
      {
        actorId: clientUser.id,
        entityType: "ServiceRequest",
        entityId: openReq.id,
        action: "REQUEST_OPEN",
        payloadJson: JSON.stringify({ title: openReq.title }),
      },
      {
        actorId: admin.id,
        entityType: "System",
        entityId: "seed",
        action: "SEED_COMPLETE",
        payloadJson: JSON.stringify({ at: new Date().toISOString() }),
      },
    ],
  });

  console.log("Seed complete. Demo password for all accounts:", PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
