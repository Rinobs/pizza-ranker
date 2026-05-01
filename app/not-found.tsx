import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center rounded-lg border border-[#333333] bg-[#2A2A2A] px-8 py-10 shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
        <h1 className="text-5xl font-bold mb-4 text-white">404</h1>
        <p className="text-[#9A8F83] mb-6">Diese Seite wurde nicht gefunden.</p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex px-5 py-2.5 rounded-xl bg-[#2A2A2A] border border-[#333333] text-white hover:bg-[#2A2A2A] hover:border-[#E8750A] transition-all duration-300"
          >
            Zurück zur Startseite
          </Link>
          <Link
            href="/produkt-vorschlagen"
            className="inline-flex px-5 py-2.5 rounded-xl border border-[#5A2E08] bg-[#291808] text-[#FFE4C8] hover:bg-[#1E3A2A] hover:border-[#E8750A] transition-all duration-300"
          >
            Produkt vorschlagen
          </Link>
        </div>
      </div>
    </div>
  );
}
