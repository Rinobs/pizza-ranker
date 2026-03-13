"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { FiAward, FiBookmark, FiHeart, FiMessageCircle, FiStar, FiTrendingUp, FiUsers } from "react-icons/fi";
import BackButton from "@/app/components/BackButton";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import { buildProfileBadges, buildProfileCompletion } from "@/lib/profile-features";
import { calculateProfilePoints, getProfileLevelInfo } from "@/lib/profile-gamification";
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
        setError("Ungueltige Profil-URL.");
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
        setFollowMessage(json.error || "Folgen-Status konnte nicht geaendert werden.");
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
      setFollowMessage("Folgen-Status konnte nicht geaendert werden.");
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
    return <div className="mx-auto max-w-6xl px-4 pb-24 text-white sm:px-8 lg:px-12"><BackButton /><div className="rounded-[30px] border border-[#2A394B] bg-[#141C27] p-5">Profil wird geladen...</div></div>;
  }

  if (error || !profileData || !summary) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-24 text-white sm:px-8 lg:px-12">
        <BackButton />
        <div className="rounded-[30px] border border-[#2A394B] bg-[#141C27] p-6">
          <p className="text-red-200">{error || "Profil konnte nicht geladen werden."}</p>
          <Link href="/profil" className="mt-4 inline-flex items-center rounded-2xl bg-[#5EE287] px-4 py-2 font-semibold text-[#0C1910] hover:bg-[#75F39B]">Zu meinem Profil</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 text-white sm:px-8 lg:px-12">
      <BackButton />

      <section className="overflow-hidden rounded-[36px] border border-[#2E4154] bg-[radial-gradient(circle_at_top_left,rgba(94,226,135,0.18),rgba(16,24,36,0.98)_40%),radial-gradient(circle_at_bottom_right,rgba(104,180,255,0.14),transparent_42%),linear-gradient(145deg,rgba(21,31,44,0.99),rgba(14,20,31,0.96))] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.34)] sm:p-8 lg:p-10">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <ProfileAvatar src={profileData.profile.avatarUrl} name={profileData.profile.username} size="xl" />
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.22em] text-[#9CC9AE]">Food Profil</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-[#F3FFF6] sm:text-5xl">{profileData.profile.username}</h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#C9D8E7] sm:text-lg">{profileData.profile.bio || "Noch keine Bio vorhanden. Dieses Profil sammelt aber schon Geschmackspunkte und Aktivitaet."}</p>
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
              <button type="button" disabled={followLoading} onClick={() => { void handleToggleFollow(!profileData.profile.isFollowing); }} className={`rounded-2xl border px-5 py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${profileData.profile.isFollowing ? "border-[#2D3A4B] bg-[#141C27] text-white hover:border-red-300" : "border-[#5EE287] bg-[#5EE287] text-[#0C1910] hover:bg-[#79F29C]"}`}>{followLoading ? "Speichere..." : profileData.profile.isFollowing ? "Entfolgen" : "Folgen"}</button>
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

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionShell eyebrow="Badges" title="Profil Vibes" description="Auch oeffentliche Profile bekommen jetzt kleine Gamification-Signale fuer Aktivitaet und Profilpflege.">
          <div className="grid gap-4 md:grid-cols-2">
            {summary.badges.slice(0, 4).map((badge) => <BadgeCard key={badge.id} badge={badge} />)}
          </div>
        </SectionShell>

        <SectionShell eyebrow="Snapshot" title="Schneller Eindruck" description="Ein kompakter Blick auf Level, Aktivitaet und Sammler-Stil.">
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard icon={FiAward} label="Level" value={summary.levelInfo.currentLevelName} hint={summary.levelInfo.nextLevelName ? `${summary.levelInfo.pointsToNextLevel} Punkte bis ${summary.levelInfo.nextLevelName}` : "Top-Level erreicht"} />
            <MetricCard icon={FiHeart} label="Favoriten" value={String(profileData.favorites.length)} hint={profileData.wantToTry.length > 0 ? `${profileData.wantToTry.length} Produkte auf der Watchlist` : "Noch keine Watchlist sichtbar"} />
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
          {profileData.wantToTry.length === 0 ? <EmptyPanel icon={FiBookmark} title="Watchlist ist leer" description="Aktuell wurden noch keine Produkte fuer spaeter gespeichert." /> : <ul className="grid gap-3">{profileData.wantToTry.slice(0, 6).map((item) => <li key={`want-${item.productSlug}`} className="rounded-[24px] border border-[#2A394B] bg-[#111925]/88 p-4"><Link href={`/produkt/${item.productSlug}`} className="font-semibold text-white transition-colors hover:text-[#8AF5AC]">{item.name}</Link><p className="mt-1 text-sm text-[#8CA1B8]">{item.category}</p></li>)}</ul>}
        </SectionShell>
      </div>
    </div>
  );
}
