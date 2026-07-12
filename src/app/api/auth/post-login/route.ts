import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const role = session?.user?.role;
  const dest =
    role === "PROVIDER"
      ? "/provider"
      : role === "CLIENT"
        ? "/client"
        : role === "OPS"
          ? "/ops"
          : role === "ADMIN"
            ? "/admin"
            : "/";
  return NextResponse.redirect(new URL(dest, process.env.NEXTAUTH_URL ?? "http://localhost:3010"));
}
