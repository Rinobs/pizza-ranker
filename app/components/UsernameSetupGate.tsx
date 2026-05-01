"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MAX_USERNAME_LENGTH, MIN_USERNAME_LENGTH } from "@/lib/username";

type ProfileResponse = {
  success: boolean;
  data?: {
    username: string | null;
    hasUsername: boolean;
    canSetUsername: boolean;
  };
  error?: string;
};

type SaveProfileResponse = {
  success: boolean;
  data?: {
    username: string | null;
    hasUsername: boolean;
    canSetUsername: boolean;
  };
  error?: string;
};

export default function UsernameSetupGate() {
  const router = useRouter();
  const { status } = useSession();
  const [profileChecked, setProfileChecked] = useState(false);
  const [hasUsername, setHasUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (status !== "authenticated") {
      setProfileChecked(false);
      setHasUsername(false);
      setUsernameInput("");
      setSaving(false);
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", {
          cache: "no-store",
        });

        const json = (await response.json()) as ProfileResponse;
        if (cancelled) return;

        if (!response.ok || !json.success) {
          setError(json.error || "Username-Status konnte nicht geladen werden.");
          setHasUsername(false);
          return;
        }

        setHasUsername(json.data?.hasUsername ?? Boolean(json.data?.username));
      } catch {
        if (!cancelled) {
          setError("Username-Status konnte nicht geladen werden.");
          setHasUsername(false);
        }
      } finally {
        if (!cancelled) {
          setProfileChecked(true);
        }
      }
    }

    setError(null);
    setProfileChecked(false);
    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status !== "authenticated" || !profileChecked || hasUsername) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[#081018]/82 px-4 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-xl border border-[#5A2E08] bg-[linear-gradient(180deg,#192330_0%,#111924_100%)] p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.5)]">
        <p className="text-xs uppercase tracking-[0.22em] text-[#F5963C]">Willkommen</p>
        <h2 className="mt-2 text-2xl font-bold text-[#F2FFF6] sm:text-3xl">
          Wähle jetzt deinen Username
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#C4D0DE] sm:text-base">
          Dein Username muss eindeutig sein und kann nach dem ersten Speichern nicht mehr geändert werden.
        </p>

        <div className="mt-6 space-y-3">
          <input
            type="text"
            value={usernameInput}
            maxLength={MAX_USERNAME_LENGTH}
            autoFocus
            onChange={(event) => {
              setUsernameInput(event.target.value);
              setError(null);
            }}
            placeholder="Eindeutigen Username eingeben"
            className="w-full rounded-xl border border-[#5A2E08] bg-[#0F1621] px-4 py-3 text-white outline-none transition-colors placeholder:text-[#7E91A8] focus:border-[#E8750A]"
          />

          <div className="flex items-center justify-between gap-3 text-xs text-[#9A8F83]">
            <span>
              {MIN_USERNAME_LENGTH}-{MAX_USERNAME_LENGTH} Zeichen
            </span>
            <span>{usernameInput.trim().length}/{MAX_USERNAME_LENGTH}</span>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              const candidate = usernameInput.trim();

              if (candidate.length < MIN_USERNAME_LENGTH || candidate.length > MAX_USERNAME_LENGTH) {
                setError(
                  `Username muss zwischen ${MIN_USERNAME_LENGTH} und ${MAX_USERNAME_LENGTH} Zeichen lang sein.`
                );
                return;
              }

              setSaving(true);
              setError(null);

              try {
                const response = await fetch("/api/profile", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ username: candidate }),
                });

                const json = (await response.json()) as SaveProfileResponse;

                if (!response.ok || !json.success) {
                  setError(json.error || "Username konnte nicht gespeichert werden.");
                  return;
                }

                setHasUsername(true);
                router.refresh();
              } catch {
                setError("Username konnte nicht gespeichert werden.");
              } finally {
                setSaving(false);
              }
            }}
            className="mt-2 w-full rounded-xl bg-[#E8750A] px-4 py-3 font-semibold text-[#1A0E04] transition-colors hover:bg-[#75F39B] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Speichere..." : "Username festlegen"}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      </div>
    </div>
  );
}

