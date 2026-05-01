"use client";

import { useMemo, useState } from "react";

type ImportSummaryCategory = {
  tag: string;
  label: string;
  imported: number;
  skipped: number;
  errors: number;
};

type ImportEvent =
  | {
      type: "start";
      totalCategories: number;
      maxImportsPerCategory: number;
      totalTargetImports: number;
    }
  | {
      type: "progress";
      percent: number;
      currentCategoryTag: string;
      currentCategoryLabel: string;
      currentCategoryIndex: number;
      totalCategories: number;
      categoryImported: number;
      categorySkipped: number;
      categoryErrors: number;
      imported: number;
      skipped: number;
      errors: number;
      message: string;
    }
  | {
      type: "summary";
      percent: 100;
      imported: number;
      skipped: number;
      errors: number;
      categories: ImportSummaryCategory[];
    };

const CATEGORY_LABELS = [
  "pizzas",
  "chips-and-crisps",
  "ice-creams",
  "protein-bars",
  "protein-powders",
  "snacks",
];

function parseSseChunk(chunk: string) {
  const dataLines = chunk
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim());

  if (dataLines.length === 0) {
    return null;
  }

  try {
    return JSON.parse(dataLines.join("\n")) as ImportEvent;
  } catch {
    return null;
  }
}

export default function ImportOpenFoodFactsAdminPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [percent, setPercent] = useState(0);
  const [imported, setImported] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [errors, setErrors] = useState(0);
  const [currentCategoryLabel, setCurrentCategoryLabel] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState("Bereit für den Einmalimport.");
  const [summaryCategories, setSummaryCategories] = useState<ImportSummaryCategory[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [totalTargetImports, setTotalTargetImports] = useState(0);

  const hasSummary = summaryCategories.length > 0;
  const orderedSummaryCategories = useMemo(() => {
    if (summaryCategories.length === 0) {
      return CATEGORY_LABELS.map((tag) => ({
        tag,
        label: tag,
        imported: 0,
        skipped: 0,
        errors: 0,
      }));
    }

    const byTag = new Map(summaryCategories.map((category) => [category.tag, category] as const));

    return CATEGORY_LABELS.map(
      (tag) =>
        byTag.get(tag) ?? {
          tag,
          label: tag,
          imported: 0,
          skipped: 0,
          errors: 0,
        }
    );
  }, [summaryCategories]);

  async function handleImportStart() {
    setIsRunning(true);
    setPercent(0);
    setImported(0);
    setSkipped(0);
    setErrors(0);
    setCurrentCategoryLabel(null);
    setCurrentStep("Import wird gestartet...");
    setSummaryCategories([]);
    setErrorMessage(null);
    setLogs([]);
    setTotalTargetImports(0);

    try {
      const response = await fetch("/api/admin/import-openfoodfacts", {
        method: "POST",
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(json?.error || "Import konnte nicht gestartet werden.");
      }

      if (!response.body) {
        throw new Error("Der Server hat keinen Fortschrittsstream geliefert.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const event = parseSseChunk(chunk);
          if (!event) {
            continue;
          }

          if (event.type === "start") {
            setPercent(0);
            setTotalTargetImports(event.totalTargetImports);
            setCurrentStep(
              `Import startet für ${event.totalCategories} Kategorien mit bis zu ${event.maxImportsPerCategory} Produkten je Kategorie.`
            );
            continue;
          }

          if (event.type === "progress") {
            setPercent(event.percent);
            setImported(event.imported);
            setSkipped(event.skipped);
            setErrors(event.errors);
            setCurrentCategoryLabel(event.currentCategoryLabel);
            setCurrentStep(event.message);
            setLogs((current) => [event.message, ...current].slice(0, 14));
            continue;
          }

          setPercent(100);
          setImported(event.imported);
          setSkipped(event.skipped);
          setErrors(event.errors);
          setCurrentCategoryLabel(null);
          setCurrentStep("Import abgeschlossen.");
          setSummaryCategories(event.categories);
          setLogs((current) => ["Import abgeschlossen.", ...current].slice(0, 14));
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Der Import wurde abgebrochen."
      );
      setCurrentStep("Import fehlgeschlagen.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(232,117,10,0.08),transparent_24%),linear-gradient(180deg,#141414_0%,#141414_52%,#141414_100%)] px-4 pb-24 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl pt-6">
        <section className="rounded-xl border border-[#2A2A2A] bg-[linear-gradient(145deg,rgba(20,20,20,0.98),rgba(14,14,14,0.97))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)] sm:p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-[#9CC9AE]">
            Admin Import
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#FFF0E4] sm:text-4xl">
            Open Food Facts einmalig importieren
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#C9D8E7] sm:text-base">
            Importiert deutsche Produkte mit Bild und vollständigen Nährwerten aus den
            OFF-Kategorien Pizza, Chips, Eis, Proteinriegel, Proteinpulver und Snacks.
            Bereits bekannte Barcodes werden automatisch übersprungen.
          </p>

          <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
            <span className="rounded-full border border-[#333333] bg-[#222222] px-3 py-1.5 text-[#C4B8AC]">
              Land: en:germany
            </span>
            <span className="rounded-full border border-[#333333] bg-[#222222] px-3 py-1.5 text-[#C4B8AC]">
              Max. 200 pro Kategorie
            </span>
            <span className="rounded-full border border-[#333333] bg-[#222222] px-3 py-1.5 text-[#C4B8AC]">
              Nur mit Bild + Nährwerten
            </span>
          </div>

          <div className="mt-8 flex flex-col gap-4 rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#FFF0E4]">
                  {currentCategoryLabel
                    ? `Aktuell: ${currentCategoryLabel}`
                    : "Importstatus"}
                </p>
                <p className="mt-2 text-sm text-[#A89880]">{currentStep}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void handleImportStart();
                }}
                disabled={isRunning}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#E8750A] px-5 py-3 font-semibold text-[#1A0E04] transition-colors hover:bg-[#F5963C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRunning ? "Import läuft..." : "Import starten"}
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-[#9A8F83]">
                <span>Fortschritt</span>
                <span>{percent}%</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#0E1520]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#E8750A,#7CC8FF)] transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
              {totalTargetImports > 0 ? (
                <p className="mt-2 text-xs text-[#9A8F83]">
                  Zielrahmen: bis zu {totalTargetImports} neue Produkte über alle Kategorien.
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-[#5A2E08] bg-[#221508] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#9CC9AE]">Importiert</p>
                <p className="mt-2 text-3xl font-black text-[#FFF0E4]">{imported}</p>
              </div>
              <div className="rounded-md border border-[#333333] bg-[#222222] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#9A8F83]">Übersprungen</p>
                <p className="mt-2 text-3xl font-black text-[#FFF0E4]">{skipped}</p>
              </div>
              <div className="rounded-md border border-[#5A2A2A] bg-[#2A1111] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-red-200">Fehler</p>
                <p className="mt-2 text-3xl font-black text-[#FBE7E7]">{errors}</p>
              </div>
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-6 rounded-lg border border-[#6A3434] bg-[#2A1313] p-4 text-sm text-red-100">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <section className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#9A8F83]">
                    Kategorien
                  </p>
                  <h2 className="mt-2 text-xl font-black tracking-tight text-[#FFF0E4]">
                    Importübersicht
                  </h2>
                </div>
                {hasSummary ? (
                  <span className="rounded-full border border-[#5A2E08] bg-[#221508] px-3 py-1 text-xs font-semibold text-[#FFE4C8]">
                    Final
                  </span>
                ) : null}
              </div>

              <div className="mt-5 space-y-3">
                {orderedSummaryCategories.map((category) => (
                  <div
                    key={category.tag}
                    className="rounded-md border border-[#333333] bg-[#222222] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-white">{category.label}</p>
                      <span className="text-xs uppercase tracking-[0.16em] text-[#9A8F83]">
                        {category.tag}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
                      <span className="rounded-full border border-[#5A2E08] bg-[#221508] px-3 py-1 text-[#FFE4C8]">
                        {category.imported} importiert
                      </span>
                      <span className="rounded-full border border-[#333333] bg-[#1C1C1C] px-3 py-1 text-[#DDD0C4]">
                        {category.skipped} übersprungen
                      </span>
                      <span className="rounded-full border border-[#5A2A2A] bg-[#2A1111] px-3 py-1 text-red-200">
                        {category.errors} Fehler
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#9A8F83]">
                Live Log
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-[#FFF0E4]">
                Letzte Schritte
              </h2>

              <div className="mt-5 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div
                      key={`${log}-${index}`}
                      className="rounded-lg border border-[#243242] bg-[#0F1722] px-3 py-2 text-sm text-[#DDD0C4]"
                    >
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-[#334458] bg-[#0F1722] px-4 py-3 text-sm text-[#9EB0C3]">
                    Noch kein Import gestartet.
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
