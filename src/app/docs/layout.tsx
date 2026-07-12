import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Internal docs only — not shown in public navigation. */
export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "OPS")) {
    redirect("/");
  }
  return <>{children}</>;
}
