import { readFile } from "fs/promises";
import path from "path";

export default async function ArchitectureDocPage() {
  const file = path.join(process.cwd(), "docs/ARCHITECTURE.md");
  let content = "";
  try {
    content = await readFile(file, "utf8");
  } catch {
    content = "Architecture doc not found.";
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <article className="prose-aegis whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
        {content}
      </article>
    </div>
  );
}
