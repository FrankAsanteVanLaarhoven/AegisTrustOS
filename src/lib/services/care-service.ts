import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/services/notify-service";

export async function createCareHousehold(input: {
  ownerClientId: string;
  recipientName: string;
  label?: string;
  city?: string;
  needsSummary?: string;
  needsTags?: string[];
  notes?: string;
  actorUserId: string;
}) {
  const household = await db.careHousehold.create({
    data: {
      ownerClientId: input.ownerClientId,
      recipientName: input.recipientName,
      label: input.label ?? "Home",
      city: input.city ?? "London",
      needsSummary: input.needsSummary,
      needsTagsJson: JSON.stringify(input.needsTags ?? []),
      notes: input.notes,
      members: {
        create: [
          {
            name: input.recipientName,
            role: "RECIPIENT",
            canApprove: false,
          },
        ],
      },
    },
  });

  await writeAudit({
    actorId: input.actorUserId,
    entityType: "CareHousehold",
    entityId: household.id,
    action: "CARE_HOUSEHOLD_CREATE",
    payload: { recipientName: input.recipientName },
  });

  return household;
}

export async function addCareCircleMember(input: {
  householdId: string;
  name: string;
  email?: string;
  role: "FAMILY" | "ADVOCATE" | "NEXT_OF_KIN" | "RECIPIENT";
  canApprove?: boolean;
  actorUserId: string;
}) {
  const member = await db.careCircleMember.create({
    data: {
      householdId: input.householdId,
      name: input.name,
      email: input.email,
      role: input.role,
      canApprove: input.canApprove ?? input.role !== "RECIPIENT",
    },
  });
  await writeAudit({
    actorId: input.actorUserId,
    entityType: "CareCircleMember",
    entityId: member.id,
    action: "CARE_CIRCLE_ADD",
    payload: { householdId: input.householdId, role: input.role },
  });
  return member;
}

export async function requestCarerApproval(input: {
  householdId: string;
  providerId: string;
  actorUserId: string;
}) {
  const approval = await db.carerApproval.upsert({
    where: {
      householdId_providerId: {
        householdId: input.householdId,
        providerId: input.providerId,
      },
    },
    create: {
      householdId: input.householdId,
      providerId: input.providerId,
      status: "PENDING",
    },
    update: {
      status: "PENDING",
      decidedAt: null,
      rationale: null,
    },
  });

  await writeAudit({
    actorId: input.actorUserId,
    entityType: "CarerApproval",
    entityId: approval.id,
    action: "CARER_APPROVAL_REQUESTED",
    payload: { householdId: input.householdId, providerId: input.providerId },
  });

  const household = await db.careHousehold.findUnique({
    where: { id: input.householdId },
    include: { owner: { include: { user: true } }, members: true },
  });
  if (household) {
    await notifyUser({
      userId: household.owner.userId,
      subject: "Aegis care — carer approval needed",
      body: `A carer is awaiting your security approval for ${household.recipientName}'s household. Sign in to Care circle to approve or decline.`,
      templateKey: "care.approval_requested",
    }).catch(() => undefined);
  }

  return approval;
}

export async function decideCarerApproval(input: {
  approvalId: string;
  decision: "APPROVED" | "DECLINED" | "REVOKED";
  actorUserId: string;
  rationale?: string;
}) {
  const approval = await db.carerApproval.update({
    where: { id: input.approvalId },
    data: {
      status: input.decision,
      approvedByUserId: input.actorUserId,
      rationale: input.rationale,
      decidedAt: new Date(),
    },
    include: {
      provider: { include: { user: true } },
      household: true,
    },
  });

  await writeAudit({
    actorId: input.actorUserId,
    entityType: "CarerApproval",
    entityId: approval.id,
    action: `CARER_${input.decision}`,
    payload: {
      householdId: approval.householdId,
      providerId: approval.providerId,
      rationale: input.rationale,
    },
  });

  await notifyUser({
    userId: approval.provider.userId,
    subject: `Aegis care — household ${input.decision.toLowerCase()}`,
    body: `Your approval status for ${approval.household.recipientName}'s household is now ${input.decision}.`,
    templateKey: "care.approval_decided",
  }).catch(() => undefined);

  return approval;
}

export async function isCarerApprovedForHousehold(
  householdId: string,
  providerId: string,
): Promise<boolean> {
  const row = await db.carerApproval.findUnique({
    where: {
      householdId_providerId: { householdId, providerId },
    },
  });
  return row?.status === "APPROVED";
}
