import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { apiOk, apiErr } from "@/lib/api/envelope";
import { getContainer } from "@/lib/container";
import { runExtraction, pickNumberFromExtraction } from "@/lib/services/ocr-service";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return apiErr("UNAUTHORIZED");
  if (session.user.role !== "PROVIDER") return apiErr("FORBIDDEN");

  const profile = await db.providerProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: true },
  });
  if (!profile) return apiErr("NOT_FOUND");

  let body: {
    idImageDataUrl?: string;
    selfieDataUrl?: string;
    livenessScore?: number;
  };
  try {
    body = await req.json();
  } catch {
    return apiErr("VALIDATION");
  }

  if (!body.idImageDataUrl || !body.selfieDataUrl) {
    return apiErr("VALIDATION", "ID and selfie captures required");
  }

  function dataUrlToBuffer(dataUrl: string): Buffer {
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    return Buffer.from(base64, "base64");
  }

  const idBuf = dataUrlToBuffer(body.idImageDataUrl);
  const selfieBuf = dataUrlToBuffer(body.selfieDataUrl);

  const { storage, idv } = getContainer();
  const idKey = `idv/${profile.id}/id-${nanoid(8)}.jpg`;
  const selfieKey = `idv/${profile.id}/selfie-${nanoid(8)}.jpg`;

  const idStored = await storage.put({
    key: idKey,
    data: idBuf,
    contentType: "image/jpeg",
    encrypt: true,
  });
  const selfieStored = await storage.put({
    key: selfieKey,
    data: selfieBuf,
    contentType: "image/jpeg",
    encrypt: true,
  });

  // OCR + deterministic validation on ID image
  const extraction = await runExtraction({
    image: idBuf,
    contentType: "image/jpeg",
    hintType: "ID",
    fileName: "camera-id.jpg",
    text: profile.user.name,
  });

  const started = await idv.startCheck({
    fullName: profile.user.name,
    email: profile.user.email,
  });
  const result = await idv.getResult(started.sessionId);

  const check = await db.idvCheck.create({
    data: {
      providerProfileId: profile.id,
      vendor: started.vendor === "MOCK" ? "MOCK" : "OTHER",
      externalRef: started.sessionId,
      status: result.status,
      livenessScore: body.livenessScore ?? result.livenessScore,
      completedAt: new Date(),
      rawResultJson: JSON.stringify({
        ...result.raw,
        idObjectKey: idStored.key,
        selfieObjectKey: selfieStored.key,
        encrypted: true,
        clientLiveness: body.livenessScore,
        ocr: extraction.payload,
      }),
    },
  });

  const number = pickNumberFromExtraction(extraction.payload) ?? null;

  await db.credential.create({
    data: {
      providerId: profile.id,
      type: "ID",
      title: "Camera-captured photo ID",
      number,
      verificationStatus: extraction.suggestedStatus,
      notes: extraction.payload.requiresManualReview
        ? "OCR flagged for manual review"
        : "Captured via on-site identity flow (encrypted store)",
      filePath: idStored.key,
      extractedJson: JSON.stringify({
        source: "camera_idv",
        checkId: check.id,
        storageKey: idStored.key,
        ocr: extraction.payload,
      }),
    },
  });

  await writeAudit({
    actorId: session.user.id,
    entityType: "IdvCheck",
    entityId: check.id,
    action: "IDV_CAMERA_COMPLETE",
    payload: {
      status: result.status,
      liveness: body.livenessScore,
      encrypted: true,
      ocrConfidence: extraction.payload.overallConfidence,
      ocrManualReview: extraction.payload.requiresManualReview,
    },
    eventType: "provider.idv_completed",
  });

  return apiOk({
    checkId: check.id,
    status: result.status,
    livenessScore: body.livenessScore ?? result.livenessScore,
    encrypted: true,
    ocr: {
      documentKind: extraction.payload.documentKind,
      overallConfidence: extraction.payload.overallConfidence,
      requiresManualReview: extraction.payload.requiresManualReview,
      fields: extraction.payload.fields,
      reasons: extraction.payload.reasons,
    },
  });
}
