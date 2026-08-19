import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-[720px]">
      <p className="eyebrow mb-4">Phase 0</p>
      <h1 className="font-display text-display mb-4">Foundation</h1>
      <p className="font-reflective text-subheading text-ink-soft mb-10 italic">
        Tokens, type, and the ribbon are in. Features come next.
      </p>
      <Link href="/styleguide" className="btn-primary inline-block">
        Open the styleguide
      </Link>
    </div>
  );
}
