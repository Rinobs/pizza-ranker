"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import BackButton from "@/app/components/BackButton";

type PublicProfileData = {
  profile: {
    userId: string;
    username: string;
    followersCount: number;
    followingCount: number;
    isFollowing: boolean;
    isOwnProfile: boolean;
  };
  ratings: Array<{
    productSlug: string;
    name: string;
    category: string;
    rating: number;
    comment: string;
    updatedAt: string | null;
  }>;
  favorites: Array<{
    productSlug: string;
    name: string;
    category: string;
    insertedAt: string | null;
  }>;
  wantToTry: Array<{
    productSlug: string;
    name: string;
    category: string;
    insertedAt: string | null;
  }>;
};

type PublicProfileResponse = {
  success: boolean;
  data?: PublicProfileData;
  error?: string;
};

type ToggleFollowResponse = {
  success: boolean;
  data?: {
    targetUserId: string;
    active: boolean;
  };
  error?: string;
};

export default function PublicProfilePage() {
  const params = useParams<{ userId: string }>();
  const routeUserId = typeof params?.userId === "string" ? params.userId : "";
  const { data: session } = useSession();

  const [profileData, setProfileData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [followMessage, setFollowMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!routeUserId) {
        setError("Ungültige Profil-URL.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setFollowMessage(null);

      try {
        const response = await fetch(`/api/profiles/${routeUserId}`, {
          cache: "no-store",
        });

        const json = (await response.json()) as PublicProfileResponse;

        if (cancelled) return;

        if (!response.ok || !json.success || !json.data) {
          setProfileData(null);
          setError(json.error || "Profil konnte nicht geladen werden.");
          return;
        }

        setProfileData(json.data);
      } catch {
        if (!cancelled) {
          setProfileData(null);
          setError("Profil konnte nicht geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [routeUserId]);

  async function handleToggleFollow(active: boolean) {
    if (!profileData || profileData.profile.isOwnProfile) return;

    setFollowLoading(true);
    setFollowMessage(null);

    try {
      const response = await fetch("/api/follows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUserId: profileData.profile.userId,
          active,
        }),
      });

      const json = (await response.json()) as ToggleFollowResponse;

      if (!response.ok || !json.success) {
        setFollowMessage(json.error || "Folgen-Status konnte nicht geändert werden.");
        return;
      }

      setProfileData((prev) => {
        if (!prev) return prev;

        const nextFollowers = active
          ? prev.profile.followersCount + 1
          : Math.max(0, prev.profile.followersCount - 1);

        return {
          ...prev,
          profile: {
            ...prev.profile,
            isFollowing: active,
            followersCount: nextFollowers,
          },
        };
      });

      setFollowMessage(active ? "Du folgst diesem Profil." : "Du folgst diesem Profil nicht mehr.");
    } catch {
      setFollowMessage("Folgen-Status konnte nicht geändert werden.");
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 pb-24 text-white">
        <BackButton />
        <div className="rounded-2xl border border-[#2D3A4B] bg-[#1B222D] p-6 text-[#C4D0DE]">
          Profil wird geladen...
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 pb-24 text-white">
        <BackButton />
        <div className="rounded-2xl border border-[#2D3A4B] bg-[#1B222D] p-6">
          <p className="text-red-300">{error || "Profil konnte nicht geladen werden."}</p>
          <Link
            href="/profil"
            className="inline-flex mt-4 items-center rounded-lg bg-[#5EE287] px-4 py-2 font-semibold text-[#0C1910] hover:bg-[#75F39B]"
          >
            Zu meinem Profil
          </Link>
        </div>
      </div>
    );
  }

  const ratedCount = profileData.ratings.length;
  const ratedLabel = ratedCount === 1 ? "Produkt" : "Produkte";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 pb-24 text-white">
      <BackButton />

      <div className="rounded-3xl border border-[#2D3A4B] bg-[#1B222D]/95 p-5 sm:p-8 shadow-[0_14px_34px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#E8F6ED]">
              {profileData.profile.username}
            </h1>
            <p className="text-sm text-[#8CA1B8] mt-2">
              {ratedCount} {ratedLabel} bewertet
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2">
            {profileData.profile.isOwnProfile ? (
              <Link
                href="/profil"
                className="inline-flex items-center rounded-lg bg-[#5EE287] px-4 py-2 font-semibold text-[#0C1910] hover:bg-[#75F39B]"
              >
                Mein Profil bearbeiten
              </Link>
            ) : session?.user ? (
              <button
                type="button"
                disabled={followLoading}
                onClick={() => {
                  void handleToggleFollow(!profileData.profile.isFollowing);
                }}
                className={`px-4 py-2 rounded-lg font-semibold border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  profileData.profile.isFollowing
                    ? "bg-[#141C27] text-white border-[#2D3A4B] hover:border-red-300"
                    : "bg-[#5EE287] text-[#0C1910] border-[#5EE287] hover:bg-[#75F39B]"
                }`}
              >
                {followLoading
                  ? "Speichere..."
                  : profileData.profile.isFollowing
                    ? "Entfolgen"
                    : "Folgen"}
              </button>
            ) : (
              <p className="text-xs text-[#8CA1B8]">Logge dich ein, um zu folgen.</p>
            )}

            {followMessage && <p className="text-xs text-[#8AF5AC]">{followMessage}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
          <div className="rounded-xl border border-[#2D3A4B] bg-[#141C27] p-3">
            <p className="text-xs text-[#8CA1B8] uppercase tracking-wide">Follower</p>
            <p className="text-xl font-bold text-white">{profileData.profile.followersCount}</p>
          </div>
          <div className="rounded-xl border border-[#2D3A4B] bg-[#141C27] p-3">
            <p className="text-xs text-[#8CA1B8] uppercase tracking-wide">Folgt</p>
            <p className="text-xl font-bold text-white">{profileData.profile.followingCount}</p>
          </div>
          <div className="rounded-xl border border-[#2D3A4B] bg-[#141C27] p-3 col-span-2 sm:col-span-1">
            <p className="text-xs text-[#8CA1B8] uppercase tracking-wide">Bewertungen</p>
            <p className="text-xl font-bold text-white">{ratedCount}</p>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-[#E8F6ED] mb-4">Bewertete Produkte</h2>

          {profileData.ratings.length === 0 ? (
            <div className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4 text-[#8CA1B8]">
              Noch keine Bewertungen vorhanden.
            </div>
          ) : (
            <ul className="grid gap-3 sm:gap-4">
              {profileData.ratings.map((item) => (
                <li
                  key={`rating-${item.productSlug}`}
                  className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/produkt/${item.productSlug}`}
                        className="text-white font-semibold hover:text-[#8AF5AC] transition-colors"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-[#8CA1B8] mt-1">{item.category}</p>
                    </div>

                    <span className="shrink-0 rounded-lg bg-[#1E2A3A] border border-[#2D3A4B] px-2.5 py-1 text-sm text-yellow-300">
                      {item.rating > 0 ? `Rating ${item.rating.toFixed(1)}/5` : "Keine Sterne"}
                    </span>
                  </div>

                  <p className="text-sm text-[#C4D0DE] mt-3">
                    {item.comment || "Kein Kommentar hinterlegt."}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-[#E8F6ED] mb-4">Favoriten</h2>

          {profileData.favorites.length === 0 ? (
            <div className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4 text-[#8CA1B8]">
              Keine Favoriten vorhanden.
            </div>
          ) : (
            <ul className="grid gap-3 sm:gap-4">
              {profileData.favorites.map((item) => (
                <li
                  key={`favorite-${item.productSlug}`}
                  className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4"
                >
                  <Link
                    href={`/produkt/${item.productSlug}`}
                    className="text-white font-semibold hover:text-[#8AF5AC] transition-colors"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-[#8CA1B8] mt-1">{item.category}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-lg sm:text-xl font-semibold text-[#E8F6ED] mb-4">
            Produkte die probiert werden möchten
          </h2>

          {profileData.wantToTry.length === 0 ? (
            <div className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4 text-[#8CA1B8]">
              Keine Produkte auf der Probieren-Liste.
            </div>
          ) : (
            <ul className="grid gap-3 sm:gap-4">
              {profileData.wantToTry.map((item) => (
                <li
                  key={`want-${item.productSlug}`}
                  className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4"
                >
                  <Link
                    href={`/produkt/${item.productSlug}`}
                    className="text-white font-semibold hover:text-[#8AF5AC] transition-colors"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-[#8CA1B8] mt-1">{item.category}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

