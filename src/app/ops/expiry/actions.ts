"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { runCredentialExpirySweep } from "@/lib/services/expiry-service";

export async function runExpirySweepAction() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "OPS" && session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  await runCredentialExpirySweep({ notify: true });
  revalidatePath("/ops/expiry");
  revalidatePath("/ops");
}
