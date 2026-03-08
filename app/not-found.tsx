import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center rounded-2xl border border-[#2D3A4B] bg-[#1B222D] px-8 py-10 shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
        <h1 className="text-5xl font-bold mb-4 text-white">404</h1>
        <p className="text-[#8CA1B8] mb-6">Diese Seite wurde nicht gefunden.</p>

        <Link
          href="/"
          className="inline-flex px-5 py-2.5 rounded-xl bg-[#1B222D] border border-[#2D3A4B] text-white hover:bg-[#212B38] hover:border-[#5EE287] transition-all duration-300"
        >
          Zurueck zur Startseite
        </Link>
      </div>
    </div>
  );
}