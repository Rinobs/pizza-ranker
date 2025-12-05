export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#14181C] text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4">404</h1>
        <p className="text-gray-400 mb-6">Diese Seite wurde nicht gefunden.</p>

        <a
          href="/"
          className="px-4 py-2 rounded-lg bg-[#4CAF50] hover:bg-[#43A047] transition"
        >
          Zurück zur Startseite
        </a>
      </div>
    </div>
  );
}
