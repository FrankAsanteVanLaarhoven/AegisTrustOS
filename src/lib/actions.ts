"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  CredentialType,
  IncidentSeverity,
  TrustDecision,
  TrustTier,
} from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { buildAssessment } from "@/lib/ai/assist";
import { CATEGORY_SEEDS } from "@/lib/compliance/matrix";
import { rankMatches, LONDON_CENTER } from "@/lib/matching/engine";
import { parseJsonArray } from "@/lib/utils";
import { renderTemplate } from "@/lib/contracts/templates";

async function requireUser(roles?: string[]) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (roles && !roles.includes(session.user.role)) throw new Error("Forbidden");
  return session.user;
}

export async function updateProviderProfile(formData: FormData) {
  const user = await requireUser(["PROVIDER"]);
  const profile = await db.providerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) throw new Error("No provider profile");

  const bio = String(formData.get("bio") ?? "");
  const city = String(formData.get("city") ?? "London");
  const area = String(formData.get("area") ?? "");
  const skills = String(formData.get("skills") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  await db.providerProfile.update({
    where: { id: profile.id },
    data: {
      bio,
      city,
      area: area || null,
      skillsJson: JSON.stringify(skills),
      lat: LONDON_CENTER.lat + (Math.random() - 0.5) * 0.08,
      lng: LONDON_CENTER.lng + (Math.random() - 0.5) * 0.12,
    },
  });

  await writeAudit({
    actorId: user.id,
    entityType: "ProviderProfile",
    entityId: profile.id,
    action: "PROFILE_UPDATE",
  });

  revalidatePath("/provider");
  redirect("/provider");
}

export async function addCredential(formData: FormData) {
  const user = await requireUser(["PROVIDER"]);
  const profile = await db.providerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) throw new Error("No provider profile");

  const type = String(formData.get("type") ?? "OTHER") as CredentialType;
  const title = String(formData.get("title") ?? "").trim();
  const issuer = String(formData.get("issuer") ?? "").trim();
  const number = String(formData.get("number") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!title) throw new Error("Title required");

  const freeText = `${title} ${issuer} ${number} ${notes}`;
  const { runExtraction, pickNumberFromExtraction } = await import(
    "@/lib/services/ocr-service"
  );
  const extraction = await runExtraction({
    text: freeText,
    hintType: type,
    fileName: title,
  });
  const extractedNumber =
    number || pickNumberFromExtraction(extraction.payload) || null;

  const cred = await db.credential.create({
    data: {
      providerId: profile.id,
      type,
      title,
      issuer: issuer || null,
      number: extractedNumber,
      notes: notes || null,
      verificationStatus: extraction.suggestedStatus,
      extractedJson: JSON.stringify(extraction.payload),
    },
  });

  await writeAudit({
    actorId: user.id,
    entityType: "Credential",
    entityId: cred.id,
    action: "CREDENTIAL_ADD",
    payload: {
      type,
      title,
      ocrEngine: extraction.payload.engine,
      confidence: extraction.payload.overallConfidence,
      manualReview: extraction.payload.requiresManualReview,
    },
  });

  revalidatePath("/provider/wallet");
  revalidatePath("/provider");
}

export async function applyToCategory(formData: FormData) {
  const user = await requireUser(["PROVIDER"]);
  const profile = await db.providerProfile.findUnique({
    where: { userId: user.id },
    include: { credentials: true, categories: { include: { category: true } } },
  });
  if (!profile) throw new Error("No provider profile");

  const categoryId = String(formData.get("categoryId") ?? "");
  const category = await db.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new Error("Category not found");

  const seed = CATEGORY_SEEDS.find((c) => c.slug === category.slug);
  const checklist = seed?.checklist ?? JSON.parse(category.checklistJson || "[]");
  const claimed = [
    ...profile.categories.map((c) => c.category.slug),
    category.slug,
  ];
  const assessment = buildAssessment({
    checklist,
    credentials: profile.credentials,
    claimedCategories: claimed,
    bio: profile.bio,
    skills: parseJsonArray(profile.skillsJson),
    freeText: profile.bio ?? "",
  });

  const isWaitlist = category.mode === "WAITLIST";
  const status = isWaitlist
    ? "WAITLIST"
    : assessment.missing.length
      ? "SUBMITTED"
      : "SUBMITTED";

  await db.providerCategory.upsert({
    where: {
      providerId_categoryId: { providerId: profile.id, categoryId },
    },
    update: {
      status,
      submittedAt: new Date(),
      aiSignalsJson: JSON.stringify(assessment),
    },
    create: {
      providerId: profile.id,
      categoryId,
      status,
      submittedAt: new Date(),
      aiSignalsJson: JSON.stringify(assessment),
    },
  });

  await db.providerProfile.update({
    where: { id: profile.id },
    data: {
      overallStatus: isWaitlist ? "SUBMITTED" : "IN_REVIEW",
      riskScore: assessment.riskScore,
    },
  });

  await writeAudit({
    actorId: user.id,
    entityType: "ProviderCategory",
    entityId: categoryId,
    action: isWaitlist ? "CATEGORY_WAITLIST" : "CATEGORY_SUBMIT",
    payload: { slug: category.slug, riskScore: assessment.riskScore },
    eventType: "provider.category_submitted",
  });

  revalidatePath("/provider");
  revalidatePath("/provider/categories");
  revalidatePath("/ops");
}

export async function runIdvCheck() {
  const user = await requireUser(["PROVIDER"]);
  const profile = await db.providerProfile.findUnique({
    where: { userId: user.id },
    include: { user: true },
  });
  if (!profile) throw new Error("No provider profile");

  const { startProviderIdv } = await import("@/lib/services/idv-service");
  await startProviderIdv({
    providerProfileId: profile.id,
    fullName: profile.user.name,
    email: profile.user.email,
    actorId: user.id,
  });

  revalidatePath("/provider");
  revalidatePath("/provider/wallet");
}

/** Stripe Connect Express onboarding (or stub account link). */
export async function startConnectOnboarding() {
  const user = await requireUser(["PROVIDER"]);
  const profile = await db.providerProfile.findUnique({
    where: { userId: user.id },
    include: { user: true },
  });
  if (!profile) throw new Error("No provider profile");

  const { getContainer } = await import("@/lib/container");
  const { payments } = getContainer();
  if (!payments.ensureConnectAccount) {
    throw new Error("Connect onboarding not available on this payments backend");
  }

  const base =
    process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3010";
  const link = await payments.ensureConnectAccount({
    providerId: profile.id,
    email: profile.user.email,
    refreshUrl: `${base}/provider/wallet?connect=refresh`,
    returnUrl: `${base}/provider/wallet?connect=return`,
  });

  await writeAudit({
    actorId: user.id,
    entityType: "ProviderProfile",
    entityId: profile.id,
    action: "CONNECT_ONBOARD_START",
    payload: { accountId: link.accountId, status: link.status },
    eventType: "payment.connect_linked",
  });

  revalidatePath("/provider/wallet");
  redirect(link.url);
}

export async function trustDecision(formData: FormData) {
  const user = await requireUser(["OPS", "ADMIN"]);
  const providerId = String(formData.get("providerId") ?? "");
  const decision = String(formData.get("decision") ?? "") as TrustDecision;
  const rationale = String(formData.get("rationale") ?? "").trim();
  const categorySlug = String(formData.get("categorySlug") ?? "") || null;
  const trustTier = (String(formData.get("trustTier") ?? "T1") || "T1") as TrustTier;

  if (!providerId || !rationale || !decision) throw new Error("Missing fields");

  const { recordTrustDecision } = await import("@/lib/services/trust-service");
  await recordTrustDecision({
    providerId,
    reviewerId: user.id,
    decision,
    rationale,
    categorySlug,
    trustTier,
  });

  revalidatePath("/ops");
  revalidatePath(`/ops/providers/${providerId}`);
  revalidatePath("/ops/kpis");
  redirect(`/ops/providers/${providerId}`);
}

export async function createServiceRequest(formData: FormData) {
  const user = await requireUser(["CLIENT"]);
  const client = await db.clientProfile.findUnique({ where: { userId: user.id } });
  if (!client) throw new Error("No client profile");

  const categoryId = String(formData.get("categoryId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const brief = String(formData.get("brief") ?? "").trim();
  const location = String(formData.get("location") ?? "London").trim() || "London";
  const area = String(formData.get("area") ?? "").trim();
  const startAt = new Date(String(formData.get("startAt") ?? ""));
  const minTrustTier = (String(formData.get("minTrustTier") ?? "T1") ||
    "T1") as TrustTier;
  const discretionLevel = String(formData.get("discretionLevel") ?? "STANDARD");
  const skills = String(formData.get("skills") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const category = await db.category.findUnique({ where: { id: categoryId } });
  if (!category || category.mode !== "ACTIVE") {
    throw new Error("Category not bookable yet");
  }
  if (!title || !brief || Number.isNaN(startAt.getTime())) {
    throw new Error("Invalid request");
  }

  const careHouseholdId = String(formData.get("careHouseholdId") ?? "") || null;
  if (category.requiresFamilyApproval && !careHouseholdId) {
    throw new Error("Care household required for this category");
  }
  if (careHouseholdId) {
    const hh = await db.careHousehold.findFirst({
      where: { id: careHouseholdId, ownerClientId: client.id },
    });
    if (!hh) throw new Error("Invalid care household");
  }

  const { getEnv } = await import("@/config/env");
  const { resolveDefaultTenantId } = await import("@/lib/tenancy");
  const tenantId = await resolveDefaultTenantId(user.id);

  const req = await db.serviceRequest.create({
    data: {
      clientId: client.id,
      categoryId,
      title,
      brief,
      location,
      area: area || null,
      startAt,
      status: "OPEN",
      minTrustTier,
      discretionLevel,
      skillsJson: JSON.stringify(skills),
      budgetBand: String(formData.get("budgetBand") ?? "PREMIUM") || "PREMIUM",
      jurisdiction: getEnv().JURISDICTION_DEFAULT,
      tenantId,
      careHouseholdId,
    },
  });

  // Auto-match
  const providers = await db.providerProfile.findMany({
    where: { overallStatus: { not: "SUSPENDED" } },
    include: {
      user: true,
      categories: { include: { category: true } },
      carerApprovals: careHouseholdId
        ? { where: { householdId: careHouseholdId, status: "APPROVED" } }
        : false,
      bookings: {
        where: { clientId: client.id, status: "COMPLETED" },
        select: { id: true },
      },
    },
  });

  const { getProviderRatingMap } = await import(
    "@/lib/services/ratings-service"
  );
  const ratingMap = await getProviderRatingMap(providers.map((p) => p.id));

  const candidates = providers.flatMap((p) =>
    p.categories
      .filter((c) => c.categoryId === categoryId)
      .filter(() => {
        // Family-approved pathway: only approved carers match for booking readiness
        // Unapproved can still be shortlisted via request approval UI
        if (!category.requiresFamilyApproval) return true;
        // Include all VERIFIED for visibility; contract gate enforces approval
        return true;
      })
      .map((c) => ({
        providerId: p.id,
        name: p.user.name,
        city: p.city,
        area: p.area,
        lat: p.lat,
        lng: p.lng,
        serviceRadiusKm: p.serviceRadiusKm,
        skills: parseJsonArray(p.skillsJson),
        riskScore: p.riskScore,
        trustTier: c.trustTier,
        categoryStatus: c.status,
        categorySlug: c.category.slug,
        priorBookingsWithClient: p.bookings.length,
        suspended: p.overallStatus === "SUSPENDED",
        reviewAvg: ratingMap.get(p.id)?.average ?? null,
      })),
  );

  const ranked = rankMatches(
    {
      categorySlug: category.slug,
      location,
      area,
      lat: LONDON_CENTER.lat,
      lng: LONDON_CENTER.lng,
      minTrustTier,
      skills,
      clientId: client.id,
    },
    candidates,
  );

  for (const m of ranked) {
    await db.match.create({
      data: {
        requestId: req.id,
        providerId: m.providerId,
        score: m.score,
        reasonsJson: JSON.stringify(m.reasons),
        status: "SUGGESTED",
      },
    });
  }

  if (ranked.length) {
    await db.serviceRequest.update({
      where: { id: req.id },
      data: { status: "MATCHED" },
    });
  }

  await writeAudit({
    actorId: user.id,
    entityType: "ServiceRequest",
    entityId: req.id,
    action: "REQUEST_CREATE",
    payload: { matches: ranked.length },
    eventType: ranked.length ? "request.matched" : "request.created",
  });

  revalidatePath("/client");
  redirect(`/client/requests/${req.id}`);
}

export async function shortlistMatch(formData: FormData) {
  const user = await requireUser(["CLIENT"]);
  const matchId = String(formData.get("matchId") ?? "");
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: { request: { include: { client: true } } },
  });
  if (!match || match.request.client.userId !== user.id) throw new Error("Forbidden");

  await db.match.update({
    where: { id: matchId },
    data: { status: "SHORTLISTED" },
  });

  revalidatePath(`/client/requests/${match.requestId}`);
}

export async function createAndSignContracts(formData: FormData) {
  const user = await requireUser(["CLIENT"]);
  const requestId = String(formData.get("requestId") ?? "");
  const providerId = String(formData.get("providerId") ?? "");

  const req = await db.serviceRequest.findUnique({
    where: { id: requestId },
    include: {
      client: { include: { user: true } },
      category: true,
    },
  });
  if (!req || req.client.userId !== user.id) throw new Error("Forbidden");

  const provider = await db.providerProfile.findUnique({
    where: { id: providerId },
    include: { user: true },
  });
  if (!provider) throw new Error("Provider not found");

  // Family/recipient security gate for care pathway
  if (req.category.requiresFamilyApproval) {
    if (!req.careHouseholdId) {
      throw new Error("Care household required before engagement");
    }
    const { isCarerApprovedForHousehold } = await import(
      "@/lib/services/care-service"
    );
    const ok = await isCarerApprovedForHousehold(
      req.careHouseholdId,
      providerId,
    );
    if (!ok) {
      throw new Error(
        "Family/recipient must approve this carer for the household before booking",
      );
    }
  }

  const vars = {
    clientName: req.client.user.name,
    providerName: provider.user.name,
    title: req.title,
    location: req.location,
  };

  const now = new Date();
  for (const type of ["NDA", "SERVICE"] as const) {
    await db.contract.create({
      data: {
        requestId,
        providerId,
        clientId: req.clientId,
        type,
        templateKey: type,
        bodyMarkdown: renderTemplate(type, vars),
        status: "SIGNED",
        signedAtClient: now,
        signedAtProvider: now,
      },
    });
  }

  await db.match.updateMany({
    where: { requestId, providerId },
    data: { status: "ACCEPTED" },
  });

  await db.serviceRequest.update({
    where: { id: requestId },
    data: { status: "CONTRACTED" },
  });

  const serviceContract = await db.contract.findFirst({
    where: { requestId, providerId, type: "SERVICE" },
  });

  const booking = await db.booking.create({
    data: {
      requestId,
      contractId: serviceContract?.id,
      providerId,
      clientId: req.clientId,
      scheduledStart: req.startAt,
      scheduledEnd: req.endAt,
      status: "SCHEDULED",
      location: [req.area, req.location].filter(Boolean).join(", "),
    },
  });

  await writeAudit({
    actorId: user.id,
    entityType: "Booking",
    entityId: booking.id,
    action: "BOOKING_CREATE",
    payload: { requestId, providerId },
    eventType: "booking.created",
  });

  {
    const { notifyBookingCreated } = await import("@/lib/services/notify-service");
    await notifyBookingCreated({
      clientUserId: req.client.userId,
      providerUserId: provider.userId,
      title: req.title,
      bookingId: booking.id,
    }).catch(() => undefined);
  }

  revalidatePath("/client");
  revalidatePath(`/client/requests/${requestId}`);
  revalidatePath("/provider");
  redirect(`/client/bookings`);
}

export async function addServiceLog(formData: FormData) {
  const user = await requireUser(["PROVIDER", "OPS", "ADMIN", "CLIENT"]);
  const bookingId = String(formData.get("bookingId") ?? "");
  const kind = String(formData.get("kind") ?? "NOTE") as
    | "CHECK_IN"
    | "NOTE"
    | "INCIDENT"
    | "CHECK_OUT";
  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Body required");

  await db.serviceLog.create({
    data: {
      bookingId,
      kind,
      body,
      createdById: user.id,
    },
  });

  if (kind === "CHECK_IN") {
    await db.booking.update({
      where: { id: bookingId },
      data: { status: "IN_PROGRESS" },
    });
  }
  if (kind === "CHECK_OUT") {
    await db.booking.update({
      where: { id: bookingId },
      data: { status: "COMPLETED" },
    });
    const booking = await db.booking.findUnique({ where: { id: bookingId } });
    if (booking) {
      await db.serviceRequest.update({
        where: { id: booking.requestId },
        data: { status: "COMPLETED" },
      });
    }
  }

  revalidatePath("/provider/bookings");
  revalidatePath("/client/bookings");
}

function clampRating(n: number) {
  return Math.min(5, Math.max(1, Math.round(n)));
}

export async function leaveReview(formData: FormData) {
  const user = await requireUser(["CLIENT"]);
  const bookingId = String(formData.get("bookingId") ?? "");
  const rating = clampRating(Number(formData.get("rating") ?? 5));
  const reliability = clampRating(Number(formData.get("reliability") ?? rating));
  const professionalism = clampRating(
    Number(formData.get("professionalism") ?? rating),
  );
  const communication = clampRating(
    Number(formData.get("communication") ?? rating),
  );
  const body = String(formData.get("body") ?? "").trim();

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { client: true },
  });
  if (!booking || booking.client.userId !== user.id) throw new Error("Forbidden");
  if (booking.status !== "COMPLETED") throw new Error("Booking not completed");

  await db.review.upsert({
    where: {
      bookingId_direction: {
        bookingId,
        direction: "CLIENT_TO_PROVIDER",
      },
    },
    update: {
      rating,
      reliability,
      professionalism,
      communication,
      body: body || null,
    },
    create: {
      bookingId,
      direction: "CLIENT_TO_PROVIDER",
      rating,
      reliability,
      professionalism,
      communication,
      body: body || null,
      createdById: user.id,
      visibility: "PUBLIC",
    },
  });

  await writeAudit({
    actorId: user.id,
    entityType: "Review",
    entityId: bookingId,
    action: "MEMBER_RATING_CLIENT_TO_PROVIDER",
    payload: { rating, reliability, professionalism, communication },
  });

  revalidatePath("/client/bookings");
  revalidatePath("/provider");
  revalidatePath("/ops/kpis");
}

export async function leaveProviderReview(formData: FormData) {
  const user = await requireUser(["PROVIDER"]);
  const bookingId = String(formData.get("bookingId") ?? "");
  const rating = clampRating(Number(formData.get("rating") ?? 5));
  const reliability = clampRating(Number(formData.get("reliability") ?? rating));
  const professionalism = clampRating(
    Number(formData.get("professionalism") ?? rating),
  );
  const communication = clampRating(
    Number(formData.get("communication") ?? rating),
  );
  const body = String(formData.get("body") ?? "").trim();

  const profile = await db.providerProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) throw new Error("No provider profile");

  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.providerId !== profile.id) throw new Error("Forbidden");
  if (booking.status !== "COMPLETED") throw new Error("Booking not completed");

  await db.review.upsert({
    where: {
      bookingId_direction: {
        bookingId,
        direction: "PROVIDER_TO_CLIENT",
      },
    },
    update: {
      rating,
      reliability,
      professionalism,
      communication,
      body: body || null,
    },
    create: {
      bookingId,
      direction: "PROVIDER_TO_CLIENT",
      rating,
      reliability,
      professionalism,
      communication,
      body: body || null,
      createdById: user.id,
      visibility: "PUBLIC",
    },
  });

  await writeAudit({
    actorId: user.id,
    entityType: "Review",
    entityId: bookingId,
    action: "MEMBER_RATING_PROVIDER_TO_CLIENT",
    payload: { rating },
  });

  revalidatePath("/provider/bookings");
  revalidatePath("/client");
  revalidatePath("/ops/kpis");
}

export async function openIncident(formData: FormData) {
  const user = await requireUser(["OPS", "ADMIN", "CLIENT", "PROVIDER"]);
  const summary = String(formData.get("summary") ?? "").trim();
  const severity = (String(formData.get("severity") ?? "LOW") ||
    "LOW") as IncidentSeverity;
  const bookingId = String(formData.get("bookingId") ?? "") || null;
  const providerId = String(formData.get("providerId") ?? "") || null;

  if (!summary) throw new Error("Summary required");

  const incident = await db.incident.create({
    data: {
      summary,
      severity,
      bookingId,
      providerId,
      openedById: user.id,
      status: "OPEN",
    },
  });

  await writeAudit({
    actorId: user.id,
    entityType: "Incident",
    entityId: incident.id,
    action: "INCIDENT_OPEN",
    payload: { severity },
    eventType: "incident.opened",
  });

  // HIGH/CRITICAL → suspend passport (trust freeze)
  if (
    providerId &&
    (severity === "HIGH" || severity === "CRITICAL")
  ) {
    const passport = await db.aegisPassport.findUnique({
      where: { providerId },
    });
    if (passport && passport.status === "ACTIVE") {
      await db.aegisPassport.update({
        where: { providerId },
        data: { status: "SUSPENDED" },
      });
      await writeAudit({
        actorId: user.id,
        entityType: "AegisPassport",
        entityId: passport.id,
        action: "PASSPORT_SUSPEND_INCIDENT",
        payload: { incidentId: incident.id, severity },
      });
      const prov = await db.providerProfile.findUnique({
        where: { id: providerId },
        select: { userId: true },
      });
      if (prov) {
        const { notifyPassportSuspended } = await import(
          "@/lib/services/notify-service"
        );
        await notifyPassportSuspended(
          prov.userId,
          `Incident ${severity}: ${summary}`,
        ).catch(() => undefined);
      }
    }
    await db.providerProfile.update({
      where: { id: providerId },
      data: { overallStatus: "SUSPENDED" },
    }).catch(() => undefined);
  }

  {
    const { notifyIncident } = await import("@/lib/services/notify-service");
    let providerUserId: string | null = null;
    if (providerId) {
      const p = await db.providerProfile.findUnique({
        where: { id: providerId },
        select: { userId: true },
      });
      providerUserId = p?.userId ?? null;
    }
    await notifyIncident({
      summary,
      severity,
      providerUserId,
    }).catch(() => undefined);
  }

  revalidatePath("/ops/incidents");
  revalidatePath("/ops/kpis");
}

export async function resolveIncident(formData: FormData) {
  const user = await requireUser(["OPS", "ADMIN"]);
  const id = String(formData.get("incidentId") ?? "");
  const resolution = String(formData.get("resolution") ?? "").trim();

  await db.incident.update({
    where: { id },
    data: {
      status: "RESOLVED",
      resolution,
      closedAt: new Date(),
    },
  });

  await writeAudit({
    actorId: user.id,
    entityType: "Incident",
    entityId: id,
    action: "INCIDENT_RESOLVE",
    eventType: "incident.resolved",
  });

  revalidatePath("/ops/incidents");
  revalidatePath("/ops/kpis");
}

export async function joinSecurityWaitlist() {
  const user = await requireUser(["PROVIDER"]);
  const profile = await db.providerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) throw new Error("No provider profile");
  const cat = await db.category.findUnique({ where: { slug: "concierge-security" } });
  if (!cat) throw new Error("Category missing");

  await db.providerCategory.upsert({
    where: {
      providerId_categoryId: { providerId: profile.id, categoryId: cat.id },
    },
    update: { status: "WAITLIST", submittedAt: new Date() },
    create: {
      providerId: profile.id,
      categoryId: cat.id,
      status: "WAITLIST",
      submittedAt: new Date(),
    },
  });

  revalidatePath("/verticals/security");
  revalidatePath("/provider");
}

export async function joinCareWaitlist() {
  const user = await requireUser(["PROVIDER"]);
  const profile = await db.providerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) throw new Error("No provider profile");
  const cat = await db.category.findUnique({ where: { slug: "home-care" } });
  if (!cat) throw new Error("Category missing");

  await db.providerCategory.upsert({
    where: {
      providerId_categoryId: { providerId: profile.id, categoryId: cat.id },
    },
    update: { status: "WAITLIST", submittedAt: new Date() },
    create: {
      providerId: profile.id,
      categoryId: cat.id,
      status: "WAITLIST",
      submittedAt: new Date(),
    },
  });

  revalidatePath("/verticals/care");
  revalidatePath("/provider");
}

export async function joinRobotWaitlist() {
  const user = await requireUser(["PROVIDER"]);
  const profile = await db.providerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) throw new Error("No provider profile");
  const cat = await db.category.findUnique({
    where: { slug: "robot-care-home-support" },
  });
  if (!cat) throw new Error("Category missing");

  await db.providerCategory.upsert({
    where: {
      providerId_categoryId: { providerId: profile.id, categoryId: cat.id },
    },
    update: { status: "WAITLIST", submittedAt: new Date() },
    create: {
      providerId: profile.id,
      categoryId: cat.id,
      status: "WAITLIST",
      submittedAt: new Date(),
    },
  });

  await writeAudit({
    actorId: user.id,
    entityType: "ProviderCategory",
    entityId: cat.id,
    action: "ROBOT_CARE_WAITLIST",
    payload: { slug: cat.slug },
    eventType: "provider.category_submitted",
  });

  revalidatePath("/verticals/robots");
  revalidatePath("/provider");
  revalidatePath("/provider/categories");
}

export async function createCareHouseholdAction(formData: FormData) {
  const user = await requireUser(["CLIENT"]);
  const client = await db.clientProfile.findUnique({ where: { userId: user.id } });
  if (!client) throw new Error("No client profile");

  const recipientName = String(formData.get("recipientName") ?? "").trim();
  if (!recipientName) throw new Error("Recipient name required");

  const tags = String(formData.get("needsTags") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const { createCareHousehold } = await import("@/lib/services/care-service");
  await createCareHousehold({
    ownerClientId: client.id,
    recipientName,
    label: String(formData.get("label") ?? "Home") || "Home",
    city: String(formData.get("city") ?? "London") || "London",
    needsSummary: String(formData.get("needsSummary") ?? "") || undefined,
    needsTags: tags,
    notes: String(formData.get("notes") ?? "") || undefined,
    actorUserId: user.id,
  });

  revalidatePath("/client/care");
  redirect("/client/care");
}

export async function addCareCircleMemberAction(formData: FormData) {
  const user = await requireUser(["CLIENT"]);
  const client = await db.clientProfile.findUnique({ where: { userId: user.id } });
  if (!client) throw new Error("No client profile");

  const householdId = String(formData.get("householdId") ?? "");
  const hh = await db.careHousehold.findFirst({
    where: { id: householdId, ownerClientId: client.id },
  });
  if (!hh) throw new Error("Household not found");

  const { addCareCircleMember } = await import("@/lib/services/care-service");
  await addCareCircleMember({
    householdId,
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "") || undefined,
    role: (String(formData.get("role") ?? "FAMILY") || "FAMILY") as
      | "FAMILY"
      | "ADVOCATE"
      | "NEXT_OF_KIN"
      | "RECIPIENT",
    canApprove: String(formData.get("canApprove") ?? "true") === "true",
    actorUserId: user.id,
  });

  revalidatePath("/client/care");
}

export async function requestCarerApprovalAction(formData: FormData) {
  const user = await requireUser(["CLIENT"]);
  const client = await db.clientProfile.findUnique({ where: { userId: user.id } });
  if (!client) throw new Error("No client profile");

  const householdId = String(formData.get("householdId") ?? "");
  const providerId = String(formData.get("providerId") ?? "");
  const hh = await db.careHousehold.findFirst({
    where: { id: householdId, ownerClientId: client.id },
  });
  if (!hh) throw new Error("Household not found");

  const { requestCarerApproval } = await import("@/lib/services/care-service");
  await requestCarerApproval({
    householdId,
    providerId,
    actorUserId: user.id,
  });

  revalidatePath("/client/care");
  revalidatePath(`/client/requests`);
}

export async function decideCarerApprovalAction(formData: FormData) {
  const user = await requireUser(["CLIENT"]);
  const client = await db.clientProfile.findUnique({ where: { userId: user.id } });
  if (!client) throw new Error("No client profile");

  const approvalId = String(formData.get("approvalId") ?? "");
  const decision = String(formData.get("decision") ?? "") as
    | "APPROVED"
    | "DECLINED"
    | "REVOKED";
  const approval = await db.carerApproval.findUnique({
    where: { id: approvalId },
    include: { household: true },
  });
  if (!approval || approval.household.ownerClientId !== client.id) {
    throw new Error("Forbidden");
  }

  const { decideCarerApproval } = await import("@/lib/services/care-service");
  await decideCarerApproval({
    approvalId,
    decision,
    actorUserId: user.id,
    rationale: String(formData.get("rationale") ?? "") || undefined,
  });

  revalidatePath("/client/care");
}

export async function scheduleVerificationInterview(formData: FormData) {
  const user = await requireUser(["OPS", "ADMIN"]);
  const providerId = String(formData.get("providerId") ?? "");
  const when = String(formData.get("scheduledAt") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!providerId || !when) throw new Error("Missing fields");

  const { nanoid } = await import("nanoid");
  const roomCode = `room-${nanoid(10)}`;
  const interview = await db.verificationInterview.create({
    data: {
      providerId,
      reviewerId: user.id,
      roomCode,
      scheduledAt: new Date(when),
      status: "SCHEDULED",
      notes: notes || null,
      consentVideo: true,
    },
  });

  await writeAudit({
    actorId: user.id,
    entityType: "VerificationInterview",
    entityId: interview.id,
    action: "INTERVIEW_SCHEDULED",
    payload: { roomCode, providerId },
  });

  revalidatePath(`/ops/providers/${providerId}`);
  redirect(`/verify/room/${roomCode}`);
}

export async function markInterviewLive(formData: FormData) {
  const user = await requireUser(["OPS", "ADMIN", "PROVIDER"]);
  const interviewId = String(formData.get("interviewId") ?? "");
  await db.verificationInterview.update({
    where: { id: interviewId },
    data: { status: "LIVE" },
  });
  await writeAudit({
    actorId: user.id,
    entityType: "VerificationInterview",
    entityId: interviewId,
    action: "INTERVIEW_LIVE",
  });
  revalidatePath("/verify/room");
}

export async function completeInterview(formData: FormData) {
  const user = await requireUser(["OPS", "ADMIN"]);
  const interviewId = String(formData.get("interviewId") ?? "");
  const outcome = String(formData.get("outcome") ?? "PROCEED_CLEAR") as
    | "PROCEED_CLEAR"
    | "REQUEST_MORE"
    | "REJECT_RECOMMEND";
  const notes = String(formData.get("notes") ?? "").trim();

  const interview = await db.verificationInterview.update({
    where: { id: interviewId },
    data: {
      status: "COMPLETED",
      outcome,
      notes: notes || undefined,
      completedAt: new Date(),
      reviewerId: user.id,
    },
  });

  await writeAudit({
    actorId: user.id,
    entityType: "VerificationInterview",
    entityId: interviewId,
    action: "INTERVIEW_COMPLETED",
    payload: { outcome },
  });

  revalidatePath(`/ops/providers/${interview.providerId}`);
  revalidatePath(`/verify/room/${interview.roomCode}`);
}

/** Public London pilot interest (no auth). */
export async function submitPilotInterest(formData: FormData) {
  // Honeypot — bots fill hidden fields
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot) {
    redirect("/pilot?ok=1");
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const organisation = String(formData.get("organisation") ?? "").trim();
  const persona = String(formData.get("persona") ?? "").trim();
  const side = String(formData.get("side") ?? "buyer"); // buyer | provider | agency
  const nextUseCase = String(formData.get("nextUseCase") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const categoriesRaw = String(formData.get("categories") ?? "").trim();
  const categories = categoriesRaw
    ? categoriesRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  if (!name || !email.includes("@")) {
    redirect("/pilot?error=invalid");
  }

  // Soft rate limit: 5 submissions per email per hour
  const { rateLimit } = await import("@/lib/security");
  const rl = rateLimit({
    key: `pilot:${email}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    redirect("/pilot?error=rate");
  }

  const { createPublicInterest } = await import("@/lib/services/pilot-service");
  const kindSide =
    side === "provider" ? "SUPPLY" : side === "agency" ? "AGENCY" : null;

  let lead;
  if (kindSide) {
    lead = await db.pilotLead.create({
      data: {
        kind: kindSide,
        status: "NEW",
        name,
        email,
        organisation: organisation || null,
        persona: persona || side,
        city: "London",
        categoriesJson: JSON.stringify(categories),
        nextUseCase: nextUseCase || null,
        notes: notes || null,
        source: "landing",
      },
    });
  } else {
    lead = await createPublicInterest({
      name,
      email,
      organisation,
      persona: persona || "buyer",
      categories,
      nextUseCase,
      notes,
      source: "landing",
    });
  }

  await writeAudit({
    entityType: "PilotLead",
    entityId: lead.id,
    action: "PILOT_INTEREST",
    payload: { email, side, categories },
  });

  try {
    const { getEnv } = await import("@/config/env");
    const { notifyUser } = await import("@/lib/services/notify-service");
    const opsEmail = getEnv().PILOT_NOTIFY_EMAIL ?? "ops@aegis.demo";
    await notifyUser({
      email: opsEmail,
      subject: `Pilot interest: ${name}`,
      body: [
        `${name} <${email}> registered pilot interest.`,
        organisation ? `Org: ${organisation}` : null,
        `Side: ${side}`,
        nextUseCase ? `Use case: ${nextUseCase}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      templateKey: "pilot_interest",
    });
  } catch {
    /* non-blocking */
  }

  redirect("/pilot?ok=1");
}

/** Ops: log demand-validation interview from DEMAND_VALIDATION capture sheet. */
export async function logPilotInterview(formData: FormData) {
  const user = await requireUser(["OPS", "ADMIN"]);
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  if (!name || !email.includes("@")) throw new Error("Name and email required");

  const interestRaw = formData.get("interestScore");
  const interestScore =
    interestRaw === "" || interestRaw == null
      ? null
      : Number(interestRaw);

  const pilotRaw = String(formData.get("pilotWilling") ?? "");
  const pilotWilling =
    pilotRaw === "yes" ? true : pilotRaw === "no" ? false : null;

  const trustRaw = String(formData.get("trustIncident") ?? "");
  const trustIncident =
    trustRaw === "yes" ? true : trustRaw === "no" ? false : null;

  const categories = String(formData.get("categories") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const pains = String(formData.get("pains") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const { createInterviewLead } = await import("@/lib/services/pilot-service");
  const lead = await createInterviewLead({
    name,
    email,
    organisation: String(formData.get("organisation") ?? "").trim() || undefined,
    persona: String(formData.get("persona") ?? "").trim() || undefined,
    categories,
    interestScore: Number.isFinite(interestScore) ? interestScore : null,
    nextUseCase: String(formData.get("nextUseCase") ?? "").trim() || undefined,
    wtpNotes: String(formData.get("wtpNotes") ?? "").trim() || undefined,
    pains,
    trustIncident,
    pilotWilling,
    warmIntros: Number(formData.get("warmIntros") ?? 0) || 0,
    objections: String(formData.get("objections") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
    source: "ops",
    createdById: user.id,
  });

  await writeAudit({
    actorId: user.id,
    entityType: "PilotLead",
    entityId: lead.id,
    action: "PILOT_INTERVIEW_LOGGED",
    payload: {
      interestScore: lead.interestScore,
      pilotWilling: lead.pilotWilling,
    },
  });

  revalidatePath("/ops/pilot");
  revalidatePath("/ops/kpis");
  redirect("/ops/pilot?saved=1");
}

export async function updatePilotLeadStatus(formData: FormData) {
  const user = await requireUser(["OPS", "ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as
    | "NEW"
    | "CONTACTED"
    | "INTERVIEWED"
    | "PILOT_YES"
    | "PILOT_NO"
    | "NURTURE"
    | "CLOSED";
  if (!id || !status) throw new Error("id and status required");

  const { updateLeadStatus } = await import("@/lib/services/pilot-service");
  await updateLeadStatus(id, status);

  await writeAudit({
    actorId: user.id,
    entityType: "PilotLead",
    entityId: id,
    action: "PILOT_STATUS",
    payload: { status },
  });

  revalidatePath("/ops/pilot");
}
