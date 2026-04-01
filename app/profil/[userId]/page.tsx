"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { FiAward, FiBookmark, FiHeart, FiMessageCircle, FiStar, FiTarget, FiTrendingUp, FiUsers } from "react-icons/fi";
import BackButton from "@/app/components/BackButton";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import { buildProfileBadges, buildProfileCompletion } from "@/lib/profile-features";
import { calculateProfilePoints, getProfileLevelInfo } from "@/lib/profile-gamification";
import type { CustomList } from "@/lib/custom-lists";
import { BadgeCard, EmptyPanel, MetricCard, SectionShell } from "@/app/profil/profile-ui";

type PublicProfileData = {
  profile: {
    userId: string;
    username: string;
    bio: string | null;
    avatarUrl: string | null;
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
  customLists: CustomList[];
};

type PublicProfileResponse = {
  success: boolean;
  data?: PublicProfileData;
  error?: string;
};

type TasteCompareData = {
  viewer: {
    userId: string;
    username: string;
  };
  target: {
    userId: string;
    username: string;
  };
  comparison: {
    matchScore: number;
    overlapCount: number;
    averageDifference: number;
    strongestAgreements: Array<{
      productSlug: string;
      name: string;
      category: string;
      viewerRating: number;
      targetRating: number;
      difference: number;
    }>;
    strongestDisagreements: Array<{
      productSlug: string;
      name: string;
      category: string;
      viewerRating: number;
      targetRating: number;
      difference: number;
    }>;
    sharedFavoritesCount: number;
    sharedFavorites: Array<{
      productSlug: string;
      name: string;
      category: string;
    }>;
  } | null;
};

type TasteCompareResponse = {
  success: boolean;
  data?: TasteCompareData;
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
  const { data: session, status: sessionStatus } = useSession();

  const [profileData, setProfileData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [followMessage, setFollowMessage] = useState<string | null>(null);
  const [tasteCompareData, setTasteCompareData] = useState<TasteCompareData | null>(null);
  const [tasteCompareLoading, setTasteCompareLoading] = useState(false);
  const [tasteCompareError, setTasteCompareError] = useState<string | null>(null);
  const targetProfileUserId = profileData?.profile.userId ?? null;
  const isOwnPublicProfile = profileData?.profile.isOwnProfile ?? false;

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
        const response = await fetch(`/api/profiles/${routeUserId}`, { cache: "no-store" });
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
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [routeUserId]);

  useEffect(() => {
    let cancelled = false;

    if (
      sessionStatus === "loading" ||
      !targetProfileUserId ||
      isOwnPublicProfile ||
      !session?.user
    ) {
      setTasteCompareData(null);
      setTasteCompareError(null);
      setTasteCompareLoading(false);
      return;
    }

    async function loadTasteCompare() {
      setTasteCompareLoading(true);
      setTasteCompareError(null);

      try {
        const response = await fetch(
          `/api/profile/taste-compare/${targetProfileUserId}`,
          { cache: "no-store" }
        );
        const json = (await response.json()) as TasteCompareResponse;

        if (cancelled) return;

        if (!response.ok || !json.success || !json.data) {
          setTasteCompareData(null);
          setTasteCompareError(json.error || "Geschmacksvergleich konnte nicht geladen werden.");
          return;
        }

        setTasteCompareData(json.data);
      } catch {
        if (!cancelled) {
          setTasteCompareData(null);
          setTasteCompareError("Geschmacksvergleich konnte nicht geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setTasteCompareLoading(false);
        }
      }
    }

    void loadTasteCompare();

    return () => {
      cancelled = true;
    };
  }, [isOwnPublicProfile, session?.user, sessionStatus, targetProfileUserId]);

  async function handleToggleFollow(active: boolean) {
    if (!profileData || profileData.profile.isOwnProfile) return;

    setFollowLoading(true);
    setFollowMessage(null);

    try {
      const response = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: profileData.profile.userId, active }),
      });
      const json = (await response.json()) as ToggleFollowResponse;

      if (!response.ok || !json.success) {
        setFollowMessage(json.error || "Folgen-Status konnte nicht geändert werden.");
        return;
      }

      setProfileData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          profile: {
            ...prev.profile,
            isFollowing: active,
            followersCount: active ? prev.profile.followersCount + 1 : Math.max(0, prev.profile.followersCount - 1),
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

  const summary = useMemo(() => {
    if (!profileData) return null;

    const ratingCount = profileData.ratings.filter((item) => item.rating > 0).length;
    const commentCount = profileData.ratings.filter((item) => item.comment.trim().length > 0).length;
    const averageRating = ratingCount > 0 ? profileData.ratings.filter((item) => item.rating > 0).reduce((sum, item) => sum + item.rating, 0) / ratingCount : null;
    const points = calculateProfilePoints({ ratingCount, commentCount, favoriteCount: profileData.favorites.length, followerCount: profileData.profile.followersCount });
    const levelInfo = getProfileLevelInfo(points);
    const completion = buildProfileCompletion({
      hasUsername: true,
      bio: profileData.profile.bio,
      avatarUrl: profileData.profile.avatarUrl,
      ratingCount,
      commentCount,
      favoriteCount: profileData.favorites.length,
      followingCount: profileData.profile.followingCount,
    });
    const badges = buildProfileBadges({
      points,
      ratingCount,
      commentCount,
      favoriteCount: profileData.favorites.length,
      wantToTryCount: profileData.wantToTry.length,
      followerCount: profileData.profile.followersCount,
      followingCount: profileData.profile.followingCount,
      completionPercent: completion.percent,
      averageRating,
      isLeagueLeader: false,
    });

    return { ratingCount, commentCount, averageRating, points, levelInfo, completion, badges };
  }, [profileData]);

  if (loading) {
    return <div className="mx-auto -mt-10 max-w-6xl px-4 pb-24 text-white sm:-mt-12 sm:px-8 lg:px-12"><BackButton className="mb-5 sm:mb-6" /><div className="rounded-[30px] border border-[#2A394B] bg-[#141C27] p-5">Profil wird geladen...</div></div>;
  }

  if (error || !profileData || !summary) {
    return (
      <div className="mx-auto -mt-10 max-w-6xl px-4 pb-24 text-white sm:-mt-12 sm:px-8 lg:px-12">
        <BackButton className="mb-5 sm:mb-6" />
        <div className="rounded-[30px] border border-[#2A394B] bg-[#141C27] p-6">
          <p className="text-red-200">{error || "Profil konnte nicht geladen werden."}</p>
          <Link href="/profil" className="mt-4 inline-flex items-center rounded-2xl bg-[#5EE287] px-4 py-2 font-semibold text-[#0C1910] hover:bg-[#75F39B]">Zu meinem Profil</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto -mt-10 max-w-7xl px-4 pb-24 text-white sm:-mt-12 sm:px-8 lg:px-12">
      <BackButton className="mb-5 sm:mb-6" />

      <section className="overflow-hidden rounded-[36px] border border-[#2E4154] bg-[radial-gradient(circle_at_top_left,rgba(94,226,135,0.18),rgba(16,24,36,0.98)_40%),radial-gradient(circle_at_bottom_right,rgba(104,180,255,0.14),transparent_42%),linear-gradient(145deg,rgba(21,31,44,0.99),rgba(14,20,31,0.96))] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.34)] sm:p-8 lg:p-10">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <ProfileAvatar src={profileData.profile.avatarUrl} name={profileData.profile.username} size="xl" />
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.22em] text-[#9CC9AE]">Food Profil</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-[#F3FFF6] sm:text-5xl">{profileData.profile.username}</h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#C9D8E7] sm:text-lg">{profileData.profile.bio || "Noch keine Bio vorhanden. Dieses Profil sammelt aber schon Geschmackspunkte und Aktivität."}</p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#34503B] bg-[#173023] px-4 py-2 text-sm font-semibold text-[#D9FFE6]"><FiAward size={15} />{summary.levelInfo.currentLevelName}</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#2D3A4B] bg-[#111925]/90 px-4 py-2 text-sm font-semibold text-[#D6E2EF]"><FiTrendingUp size={15} />{summary.points} Punkte</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#2D3A4B] bg-[#111925]/90 px-4 py-2 text-sm font-semibold text-[#D6E2EF]"><FiUsers size={15} />{profileData.profile.followersCount} Follower</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 xl:items-end">
            {profileData.profile.isOwnProfile ? (
              <Link href="/profil" className="inline-flex items-center rounded-2xl bg-[#5EE287] px-5 py-3 font-semibold text-[#0C1910] hover:bg-[#79F29C]">Mein Profil bearbeiten</Link>
            ) : session?.user ? (
              <div className="flex flex-wrap gap-3 xl:justify-end">
                <a href="#taste-compare" className="inline-flex items-center gap-2 rounded-2xl border border-[#2D3A4B] bg-[#141C27] px-5 py-3 font-semibold text-white transition-colors hover:border-[#7CC8FF] hover:text-[#E8F5FF]"><FiTarget size={16} />Geschmack vergleichen</a>
                <button type="button" disabled={followLoading} onClick={() => { void handleToggleFollow(!profileData.profile.isFollowing); }} className={`rounded-2xl border px-5 py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${profileData.profile.isFollowing ? "border-[#2D3A4B] bg-[#141C27] text-white hover:border-red-300" : "border-[#5EE287] bg-[#5EE287] text-[#0C1910] hover:bg-[#79F29C]"}`}>{followLoading ? "Speichere..." : profileData.profile.isFollowing ? "Entfolgen" : "Folgen"}</button>
              </div>
            ) : (
              <p className="text-sm text-[#AFC1D3]">Logge dich ein, um diesem Profil zu folgen.</p>
            )}
            {followMessage && <p className="text-sm text-[#8AF5AC]">{followMessage}</p>}
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={FiUsers} label="Follower" value={String(profileData.profile.followersCount)} hint="Menschen, die diesem Profil folgen" />
        <MetricCard icon={FiUsers} label="Folgt" value={String(profileData.profile.followingCount)} hint="Profile, denen dieser User folgt" />
        <MetricCard icon={FiStar} label="Bewertungen" value={String(summary.ratingCount)} hint={summary.averageRating !== null ? `Durchschnitt ${summary.averageRating.toFixed(1)}` : "Noch keine Sterne vergeben"} />
        <MetricCard icon={FiMessageCircle} label="Kommentare" value={String(summary.commentCount)} hint={`${summary.completion.percent}% Profil-Completion`} />
      </div>

      {!profileData.profile.isOwnProfile && session?.user && (
        <div id="taste-compare" className="mt-8">
          <SectionShell eyebrow="Taste Compare" title={`Dein Geschmack vs. ${profileData.profile.username}`} description="Wir vergleichen eure gemeinsamen Ratings und machen sichtbar, wo ihr fast gleich tickt und wo ihr komplett unterschiedlich bewertet.">
            {tasteCompareLoading && <div className="rounded-[24px] border border-[#2A394B] bg-[#111925]/88 p-4 text-sm text-[#9EB0C3]">Geschmacksvergleich wird geladen...</div>}
            {!tasteCompareLoading && tasteCompareError && <div className="rounded-[24px] border border-[#6A3434] bg-[#2A1313] p-4 text-sm text-red-100">{tasteCompareError}</div>}
            {!tasteCompareLoading && !tasteCompareError && tasteCompareData?.comparison && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard icon={FiTrendingUp} label="Geschmacksmatch" value={`${tasteCompareData.comparison.matchScore}%`} hint={`auf Basis von ${tasteCompareData.comparison.overlapCount} gemeinsamen Bewertungen`} visual={{ kind: "ring", value: tasteCompareData.comparison.matchScore, label: "Gemeinsamer Score", valueLabel: `${tasteCompareData.comparison.matchScore}%`, tone: "sky" }} />
                  <MetricCard icon={FiStar} label="Gemeinsame Ratings" value={String(tasteCompareData.comparison.overlapCount)} hint="So viele Produkte habt ihr beide mit Sternen bewertet" visual={{ kind: "bars", value: Math.min(100, tasteCompareData.comparison.overlapCount * 15), label: "Überschneidung", valueLabel: `${tasteCompareData.comparison.overlapCount} Produkte`, tone: "mint" }} />
                  <MetricCard icon={FiTarget} label="Ø Differenz" value={`${tasteCompareData.comparison.averageDifference.toFixed(2)} Sterne`} hint="Je niedriger, desto ähnlicher eure Urteile" visual={{ kind: "bars", value: Math.max(0, 100 - (tasteCompareData.comparison.averageDifference / 4) * 100), label: "Nähe eurer Ratings", valueLabel: `${tasteCompareData.comparison.averageDifference.toFixed(2)} Sterne`, tone: "amber" }} />
                  <MetricCard icon={FiHeart} label="Gemeinsame Favoriten" value={String(tasteCompareData.comparison.sharedFavoritesCount)} hint={tasteCompareData.comparison.sharedFavoritesCount > 0 ? "Produkte, die ihr beide aktiv gefeiert habt" : "Noch keine identischen Favoriten gespeichert"} visual={{ kind: "ring", value: Math.min(100, tasteCompareData.comparison.sharedFavoritesCount * 25), label: "Übereinstimmende Favoriten", valueLabel: String(tasteCompareData.comparison.sharedFavoritesCount), tone: "rose" }} />
                </div>

                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-[26px] border border-[#2A394B] bg-[#111925]/88 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">Starke Übereinstimmungen</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">Hier seid ihr fast auf derselben Wellenlänge</h3>
                    <ul className="mt-4 grid gap-3">
                      {tasteCompareData.comparison.strongestAgreements.map((item) => (
                        <li key={`agreement-${item.productSlug}`} className="rounded-[20px] border border-[#2D3A4B] bg-[#101822] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <Link href={`/produkt/${item.productSlug}`} className="font-semibold text-white transition-colors hover:text-[#8AF5AC]">{item.name}</Link>
                              <p className="mt-1 text-sm text-[#8CA1B8]">{item.category}</p>
                            </div>
                            <span className="shrink-0 rounded-full border border-[#34503B] bg-[#173023] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#D9FFE6]">Δ {item.difference.toFixed(1)}</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1 text-xs font-semibold text-[#D6E2EF]">Du {item.viewerRating.toFixed(1)}</span>
                            <span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1 text-xs font-semibold text-[#D6E2EF]">{profileData.profile.username} {item.targetRating.toFixed(1)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-[26px] border border-[#2A394B] bg-[#111925]/88 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">Reibungspunkte</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">Hier geht euer Geschmack auseinander</h3>
                    {tasteCompareData.comparison.strongestDisagreements.length === 0 ? (
                      <p className="mt-4 rounded-[20px] border border-dashed border-[#35503D] bg-[#0F1722] px-4 py-3 text-sm text-[#AFC1D3]">Bei euren gemeinsamen Ratings seid ihr überraschend nah beieinander. Größere Ausreißer gibt es aktuell noch nicht.</p>
                    ) : (
                      <ul className="mt-4 grid gap-3">
                        {tasteCompareData.comparison.strongestDisagreements.map((item) => (
                          <li key={`disagreement-${item.productSlug}`} className="rounded-[20px] border border-[#2D3A4B] bg-[#101822] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <Link href={`/produkt/${item.productSlug}`} className="font-semibold text-white transition-colors hover:text-[#8AF5AC]">{item.name}</Link>
                                <p className="mt-1 text-sm text-[#8CA1B8]">{item.category}</p>
                              </div>
                              <span className="shrink-0 rounded-full border border-[#5A2A2A] bg-[#2A1111] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-red-200">Δ {item.difference.toFixed(1)}</span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1 text-xs font-semibold text-[#D6E2EF]">Du {item.viewerRating.toFixed(1)}</span>
                              <span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1 text-xs font-semibold text-[#D6E2EF]">{profileData.profile.username} {item.targetRating.toFixed(1)}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {tasteCompareData.comparison.sharedFavoritesCount > 0 && (
                  <div className="mt-6 rounded-[26px] border border-[#2A394B] bg-[#111925]/88 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">Gemeinsame Favoriten</p>
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      {tasteCompareData.comparison.sharedFavorites.map((item) => (
                        <Link key={`shared-favorite-${item.productSlug}`} href={`/produkt/${item.productSlug}`} className="inline-flex items-center rounded-full border border-[#34503B] bg-[#173023] px-4 py-2 text-sm font-semibold text-[#D9FFE6] transition-colors hover:bg-[#21402E]">
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            {!tasteCompareLoading && !tasteCompareError && tasteCompareData && !tasteCompareData.comparison && (
              <EmptyPanel icon={FiTarget} title="Noch zu wenig Überschneidung" description="Sobald ihr ein paar gemeinsame Produkte mit Sternen bewertet habt, zeigen wir hier direkt Gemeinsamkeiten und klare Unterschiede in eurem Geschmack." />
            )}
          </SectionShell>
        </div>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionShell eyebrow="Badges" title="Profil Vibes" description="Auch öffentliche Profile bekommen jetzt kleine Gamification-Signale für Aktivität und Profilpflege.">
          <div className="grid gap-4 md:grid-cols-2">
            {summary.badges.slice(0, 4).map((badge) => <BadgeCard key={badge.id} badge={badge} />)}
          </div>
        </SectionShell>

        <SectionShell eyebrow="Snapshot" title="Schneller Eindruck" description="Ein kompakter Blick auf Level, Aktivität und Sammler-Stil.">
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard icon={FiAward} label="Level" value={summary.levelInfo.currentLevelName} hint={summary.levelInfo.nextLevelName ? `${summary.levelInfo.pointsToNextLevel} Punkte bis ${summary.levelInfo.nextLevelName}` : "Top-Level erreicht"} />
            <MetricCard icon={FiHeart} label="Favoriten" value={String(profileData.favorites.length)} hint={profileData.customLists.length > 0 ? `${profileData.customLists.length} eigene Listen sichtbar` : profileData.wantToTry.length > 0 ? `${profileData.wantToTry.length} Produkte auf der Watchlist` : "Noch keine Watchlist sichtbar"} />
          </div>
        </SectionShell>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <SectionShell eyebrow="Bewertungen" title="Letzte Produkt-Meinungen">
          {profileData.ratings.length === 0 ? <EmptyPanel icon={FiStar} title="Noch keine Bewertungen" description="Dieses Profil hat bisher noch keine Produkte bewertet." /> : <ul className="grid gap-3">{profileData.ratings.slice(0, 6).map((item) => <li key={`rating-${item.productSlug}`} className="rounded-[24px] border border-[#2A394B] bg-[#111925]/88 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link href={`/produkt/${item.productSlug}`} className="font-semibold text-white transition-colors hover:text-[#8AF5AC]">{item.name}</Link><p className="mt-1 text-sm text-[#8CA1B8]">{item.category}</p></div><span className="shrink-0 rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1 text-sm font-semibold text-[#FFD86C]">{item.rating > 0 ? `Rating ${item.rating.toFixed(1)}/5` : "Nur Kommentar"}</span></div><p className="mt-4 text-sm text-[#D3DFEB]">{item.comment || "Kein Kommentar hinterlegt."}</p></li>)}</ul>}
        </SectionShell>

        <SectionShell eyebrow="Favoriten" title="Aktuelle Highlights">
          {profileData.favorites.length === 0 ? <EmptyPanel icon={FiHeart} title="Keine Favoriten" description="Bisher wurden noch keine Lieblingsprodukte gespeichert." /> : <ul className="grid gap-3">{profileData.favorites.slice(0, 6).map((item) => <li key={`favorite-${item.productSlug}`} className="rounded-[24px] border border-[#2A394B] bg-[#111925]/88 p-4"><Link href={`/produkt/${item.productSlug}`} className="font-semibold text-white transition-colors hover:text-[#8AF5AC]">{item.name}</Link><p className="mt-1 text-sm text-[#8CA1B8]">{item.category}</p></li>)}</ul>}
        </SectionShell>

        <SectionShell eyebrow="Watchlist" title="Was noch getestet werden soll">
          {profileData.wantToTry.length === 0 ? <EmptyPanel icon={FiBookmark} title="Watchlist ist leer" description="Aktuell wurden noch keine Produkte für später gespeichert." /> : <ul className="grid gap-3">{profileData.wantToTry.slice(0, 6).map((item) => <li key={`want-${item.productSlug}`} className="rounded-[24px] border border-[#2A394B] bg-[#111925]/88 p-4"><Link href={`/produkt/${item.productSlug}`} className="font-semibold text-white transition-colors hover:text-[#8AF5AC]">{item.name}</Link><p className="mt-1 text-sm text-[#8CA1B8]">{item.category}</p></li>)}</ul>}
        </SectionShell>
      </div>

      <div className="mt-8">
        <SectionShell eyebrow="Eigene Listen" title={`Kuratiert von ${profileData.profile.username}`} description="Benannte Listen zeigen schneller, wie dieser User Produkte thematisch sammelt und ordnet.">
          {profileData.customLists.length === 0 ? (
            <EmptyPanel icon={FiBookmark} title="Noch keine eigenen Listen" description="Dieses Profil hat bisher noch keine benannten Listen veröffentlicht." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {profileData.customLists.map((list) => (
                <div
                  key={list.id}
                  id={`custom-list-${list.id}`}
                  className="rounded-[26px] border border-[#2A394B] bg-[#111925]/88 p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{list.name}</h3>
                    <span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#D6E2EF]">
                      {list.itemCount} Produkte
                    </span>
                  </div>

                  {list.items.length === 0 ? (
                    <p className="mt-4 rounded-[20px] border border-dashed border-[#35503D] bg-[#0F1722] px-4 py-3 text-sm text-[#AFC1D3]">
                      Diese Liste ist aktuell noch leer.
                    </p>
                  ) : (
                    <ul className="mt-4 grid gap-3">
                      {list.items.slice(0, 6).map((item) => (
                        <li
                          key={`${list.id}-${item.productSlug}`}
                          className="rounded-[20px] border border-[#2D3A4B] bg-[#101822] px-4 py-3"
                        >
                          <Link
                            href={`/produkt/${item.routeSlug}`}
                            className="font-semibold text-white transition-colors hover:text-[#8AF5AC]"
                          >
                            {item.name}
                          </Link>
                          <p className="mt-1 text-sm text-[#8CA1B8]">{item.category}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionShell>
      </div>
    </div>
  );
}

