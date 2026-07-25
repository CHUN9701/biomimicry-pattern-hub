import Link from "next/link";

export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-5 md:px-10">
      <Link href="/" className="flex items-center gap-2.5 text-sm font-medium tracking-wide text-white/90">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-white/80 to-white/20 text-[11px] font-bold text-black">
          BH
        </span>
        Biomimicry Pattern Hub
      </Link>
      <nav className="flex items-center gap-2 text-sm text-white/70">
        <Link href="/about" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">
          About
        </Link>
        <Link href="/docs" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">
          Docs
        </Link>
      </nav>
    </header>
  );
}
