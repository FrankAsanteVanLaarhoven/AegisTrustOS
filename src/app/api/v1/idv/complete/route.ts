import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { apiOk, apiErr } from "@/lib/api/envelope";
import { getIdvProvider } from "@/lib/idv/provider";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
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

  const uploadDir = path.join(process.cwd(), "uploads", "idv", profile.id);
  await mkdir(uploadDir, { recursive: true });
  const idPath = path.join(uploadDir, `id-${nanoid(8)}.jpg`);
  const selfiePath = path.join(uploadDir, `selfie-${nanoid(8)}.jpg`);

  async function saveDataUrl(dataUrl: string, filePath: string) {
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    await writeFile(filePath, Buffer.from(base64, "base64"));
  }

  await saveDataUrl(body.idImageDataUrl, idPath);
  await saveDataUrl(body.selfieDataUrl, selfiePath);

  const idv = getIdvProvider();
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
        idFile: idPath,
        selfieFile: selfiePath,
        clientLiveness: body.livenessScore,
      }),
    },
  });

  await db.credential.create({
    data: {
      providerId: profile.id,
      type: "ID",
      title: "Camera-captured photo ID",
      verificationStatus: result.status === "PASSED" ? "PENDING" : "AI_FLAGGED",
      notes: "Captured via on-site identity flow",
      filePath: idPath,
      extractedJson: JSON.stringify({ source: "camera_idv", checkId: check.id }),
    },
  });

  await writeAudit({
    actorId: session.user.id,
    entityType: "IdvCheck",
    entityId: check.id,
    action: "IDV_CAMERA_COMPLETE",
    payload: { status: result.status, liveness: body.livenessScore },
    eventType: "provider.idv_completed",
  });

  return apiOk({
    checkId: check.id,
    status: result.status,
    livenessScore: body.livenessScore ?? result.livenessScore,
  });
}
