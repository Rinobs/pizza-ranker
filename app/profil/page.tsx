"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiActivity,
  FiAward,
  FiBookmark,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiGrid,
  FiHeart,
  FiMessageCircle,
  FiPlus,
  FiSearch,
  FiSliders,
  FiStar,
  FiTarget,
  FiTrendingUp,
  FiTrash2,
  FiUploadCloud,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import BackButton from "@/app/components/BackButton";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import { ALL_PRODUCTS, getProductRouteSlug } from "@/app/data/products";
import { useUserCustomLists } from "@/app/hooks/useUserCustomLists";
import { useUserRatings } from "@/app/hooks/useUserRatings";
import { useUserProductLists } from "@/app/hooks/useUserProductLists";
import {
  PROFILE_AVATAR_MAX_FILE_BYTES,
  buildProfileBadges,
  buildProfileCompletion,
} from "@/lib/profile-features";
import { calculateProfilePoints, getProfileLevelInfo } from "@/lib/profile-gamification";
import {
  BadgeCard,
  CompletionItemCard,
  EmptyPanel,
  MetricCard,
  PersonListItem,
  SectionShell,
  SnapshotFeatureCard,
  TabButton,
  buildAvatarDataUrl,
  formatPercent,
  type TabItem,
} from "./profile-ui";

type RatedProduct = {
  slug: string;
  name: string;
  category: string;
  rating: number;
  comment: string;
};


type RatedSortMode =
  | "rating-desc"
  | "rating-asc"
  | "category-asc"
  | "category-desc"
  | "name-asc"
  | "name-desc";

type FollowProfile = {
  userId: string;
  username: string;
  isFollowing: boolean;
  followedAt: string | null;
};

type ProfileSearchResult = {
  userId: string;
  username: string;
  isFollowing: boolean;
};

type FollowListResponse = {
  success: boolean;
  data?: FollowProfile[];
  error?: string;
};

type ProfileSearchResponse = {
  success: boolean;
  data?: ProfileSearchResult[];
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

type FriendGameStanding = {
  userId: string;
  username: string;
  points: number;
  currentLevelName: string;
  ratingCount: number;
  commentCount: number;
  favoriteCount: number;
  followerCount: number;
  rank: number;
  isViewer: boolean;
};

type FriendGameData = {
  network: {
    followingCount: number;
    mutualFriendsCount: number;
    comparedAsFriends: boolean;
  };
  viewer: {
    username: string;
    points: number;
    currentLevelName: string;
    nextLevelName: string | null;
    pointsToNextLevel: number;
    ratingCount: number;
    commentCount: number;
    favoriteCount: number;
    followerCount: number;
    rank: number;
    totalPlayers: number;
  };
  standings: FriendGameStanding[];
  tasteMatch: {
    userId: string;
    username: string;
    matchScore: number;
    overlapCount: number;
    averageDifference: number;
  } | null;
  closestRival: {
    userId: string;
    username: string;
    points: number;
    currentLevelName: string;
    ratingCount: number;
    commentCount: number;
    favoriteCount: number;
    followerCount: number;
    rank: number;
    isViewer: boolean;
  } | null;
};

type FriendGameResponse = {
  success: boolean;
  data?: FriendGameData;
  error?: string;
};

type ProfileTab = "overview" | "stats" | "badges" | "social" | "collection" | "activity" | "settings";

type NoticeTone = "success" | "info";

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "short",
});

function formatShortDate(value: string | null) {
  if (!value) return "Gerade eben";

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "Gerade eben";

  return SHORT_DATE_FORMATTER.format(new Date(parsed));
}

const TAB_ITEMS: TabItem<ProfileTab>[] = [
  { id: "overview", label: "Übersicht", icon: FiGrid },
  { id: "stats", label: "Stats", icon: FiTrendingUp },
  { id: "badges", label: "Badges", icon: FiAward },
  { id: "social", label: "Social", icon: FiUsers },
  { id: "collection", label: "Sammlung", icon: FiBookmark },
  { id: "activity", label: "Aktivität", icon: FiActivity },
  { id: "settings", label: "Einstellungen", icon: FiEdit3 },
];

export default function ProfilPage() {
  const {
    user,
    ratings,
    comments,
    loaded: ratingsLoaded,
    username,
    hasUsername,
    bio,
    avatarUrl,
    supportsProfileDetails,
    saveUsername,
    saveProfileDetails,
    profileLoaded,
    savingUsername,
    savingProfileDetails,
    profileError,
    usernameLimits,
    profileLimits,
  } = useUserRatings();
  const { favoriteSlugs, wantToTrySlugs, triedSlugs, loaded: listsLoaded } =
    useUserProductLists();
  const {
    customLists,
    loaded: customListsLoaded,
    creatingList,
    deletingListId,
    error: customListsError,
    createCustomList,
    deleteCustomList,
    customListItemCount,
  } = useUserCustomLists();

  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [usernameInput, setUsernameInput] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [customListInput, setCustomListInput] = useState("");
  const [customListMessage, setCustomListMessage] = useState<string | null>(null);
  const [profileNotice, setProfileNotice] = useState<{ tone: NoticeTone; text: string } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);

  const [selectedRatedCategory, setSelectedRatedCategory] = useState("all");
  const [ratedSortMode, setRatedSortMode] = useState<RatedSortMode>("rating-desc");
  const [profileSearchQuery, setProfileSearchQuery] = useState("");
  const [profileSearchResults, setProfileSearchResults] = useState<ProfileSearchResult[]>([]);
  const [searchingProfiles, setSearchingProfiles] = useState(false);
  const [profileSearchError, setProfileSearchError] = useState<string | null>(null);
  const [profileSearchPerformed, setProfileSearchPerformed] = useState(false);
  const [followingProfiles, setFollowingProfiles] = useState<FollowProfile[]>([]);
  const [followerProfiles, setFollowerProfiles] = useState<FollowProfile[]>([]);
  const [followsLoaded, setFollowsLoaded] = useState(false);
  const [openFollowList, setOpenFollowList] = useState<"following" | "followers" | null>(null);
  const [followMessage, setFollowMessage] = useState<string | null>(null);
  const [followMutationUserId, setFollowMutationUserId] = useState<string | null>(null);
  const [friendGameData, setFriendGameData] = useState<FriendGameData | null>(null);
  const [friendGameLoaded, setFriendGameLoaded] = useState(false);
  const [friendGameError, setFriendGameError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileLoaded) return;
    setUsernameInput(username);
    setBioInput(bio);
  }, [bio, profileLoaded, username]);

  useEffect(() => {
    if (!avatarUrl) {
      setIsAvatarMenuOpen(false);
    }
  }, [avatarUrl]);

  useEffect(() => {
    if (!isAvatarMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        avatarMenuRef.current &&
        event.target instanceof Node &&
        !avatarMenuRef.current.contains(event.target)
      ) {
        setIsAvatarMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isAvatarMenuOpen]);

  const productBySlug = useMemo(() => {
    const map = new Map<string, (typeof ALL_PRODUCTS)[number]>();
    for (const product of ALL_PRODUCTS) {
      map.set(getProductRouteSlug(product), product);
    }
    return map;
  }, []);

  const ratedProducts = useMemo(() => {
    const slugs = new Set<string>([...Object.keys(ratings), ...Object.keys(comments)]);
    const result: RatedProduct[] = [];

    for (const slug of slugs) {
      const rating = typeof ratings[slug] === "number" ? ratings[slug] : 0;
      const comment = typeof comments[slug] === "string" ? comments[slug].trim() : "";
      if (rating <= 0 && comment.length === 0) continue;
      const product = productBySlug.get(slug);
      result.push({
        slug,
        name: product?.name ?? slug,
        category: product?.category ?? "Unbekannt",
        rating,
        comment,
      });
    }

    result.sort((left, right) => {
      if (left.rating !== right.rating) return right.rating - left.rating;
      return left.name.localeCompare(right.name, "de");
    });

    return result;
  }, [comments, productBySlug, ratings]);

  const ratedCategories = useMemo(() => {
    const categories = Array.from(new Set(ratedProducts.map((product) => product.category)));
    categories.sort((left, right) => left.localeCompare(right, "de"));
    return categories;
  }, [ratedProducts]);

  const visibleRatedProducts = useMemo(() => {
    const filtered =
      selectedRatedCategory === "all"
        ? [...ratedProducts]
        : ratedProducts.filter((product) => product.category === selectedRatedCategory);

    filtered.sort((left, right) => {
      if (ratedSortMode === "rating-desc") return right.rating - left.rating || left.name.localeCompare(right.name, "de");
      if (ratedSortMode === "rating-asc") return left.rating - right.rating || left.name.localeCompare(right.name, "de");
      if (ratedSortMode === "category-asc") return left.category.localeCompare(right.category, "de") || left.name.localeCompare(right.name, "de");
      if (ratedSortMode === "category-desc") return right.category.localeCompare(left.category, "de") || left.name.localeCompare(right.name, "de");
      if (ratedSortMode === "name-asc") return left.name.localeCompare(right.name, "de");
      return right.name.localeCompare(left.name, "de");
    });

    return filtered;
  }, [ratedProducts, ratedSortMode, selectedRatedCategory]);

  const favoriteProducts = useMemo(() => {
    return favoriteSlugs
      .map((slug) => {
        const product = productBySlug.get(slug);
        return { slug, name: product?.name ?? slug, category: product?.category ?? "Unbekannt" };
      })
      .sort((left, right) => left.name.localeCompare(right.name, "de"));
  }, [favoriteSlugs, productBySlug]);

  const wantToTryProducts = useMemo(() => {
    return wantToTrySlugs
      .map((slug) => {
        const product = productBySlug.get(slug);
        return { slug, name: product?.name ?? slug, category: product?.category ?? "Unbekannt" };
      })
      .sort((left, right) => left.name.localeCompare(right.name, "de"));
  }, [productBySlug, wantToTrySlugs]);

  const triedProducts = useMemo(() => {
    return triedSlugs
      .map((slug) => {
        const product = productBySlug.get(slug);
        return { slug, name: product?.name ?? slug, category: product?.category ?? "Unbekannt" };
      })
      .sort((left, right) => left.name.localeCompare(right.name, "de"));
  }, [productBySlug, triedSlugs]);

  const ratingCount = ratedProducts.filter((product) => product.rating > 0).length;
  const commentCount = ratedProducts.filter((product) => product.comment.length > 0).length;
  const averageRating = ratingCount > 0
    ? ratedProducts.filter((product) => product.rating > 0).reduce((sum, product) => sum + product.rating, 0) / ratingCount
    : null;
  const topCategory = Array.from(
    ratedProducts.reduce((map, product) => map.set(product.category, (map.get(product.category) ?? 0) + 1), new Map<string, number>()).entries()
  ).sort((left, right) => right[1] - left[1])[0] ?? null;
  const topRatedProduct = ratedProducts.find((product) => product.rating > 0) ?? null;
  const ratingCoverage = ratingCount > 0 ? (commentCount / ratingCount) * 100 : 0;
  const followingCount = followingProfiles.length;
  const followersCount = followerProfiles.length;
  const socialReach = followingCount + followersCount;
  const collectionCount =
    favoriteProducts.length +
    wantToTryProducts.length +
    triedProducts.length +
    customListItemCount;
  const favoriteShare = collectionCount > 0 ? (favoriteProducts.length / collectionCount) * 100 : 0;
  const watchlistShare = collectionCount > 0 ? (wantToTryProducts.length / collectionCount) * 100 : 0;
  const topCategoryShare = topCategory && ratedProducts.length > 0 ? (topCategory[1] / ratedProducts.length) * 100 : 0;
  const basePoints = calculateProfilePoints({ ratingCount, commentCount, favoriteCount: favoriteProducts.length, followerCount: followersCount });
  const profilePoints = friendGameData?.viewer.points ?? basePoints;
  const levelInfo = getProfileLevelInfo(profilePoints);
  const viewerLeadsLeague = friendGameData?.viewer.rank === 1;
  const leagueStandings = friendGameData?.standings.slice(0, 6) ?? [];
  const profileCompletion = buildProfileCompletion({ hasUsername, bio, avatarUrl, ratingCount, commentCount, favoriteCount: favoriteProducts.length, followingCount });
  const profileBadges = buildProfileBadges({
    points: profilePoints,
    ratingCount,
    commentCount,
    favoriteCount: favoriteProducts.length,
    wantToTryCount: wantToTryProducts.length,
    followerCount: followersCount,
    followingCount,
    completionPercent: profileCompletion.percent,
    averageRating,
    isLeagueLeader: viewerLeadsLeague,
  });
  const unlockedBadgeCount = profileBadges.filter((badge) => badge.unlocked).length;
  const currentLevelProgress = !levelInfo.nextLevelMinPoints
    ? 100
    : Math.max(0, Math.min(100, ((profilePoints - levelInfo.currentLevelMinPoints) / (levelInfo.nextLevelMinPoints - levelInfo.currentLevelMinPoints)) * 100));
  const profileSnapshotCards = (
    <div className="grid gap-4 lg:auto-rows-fr lg:grid-cols-3">
      <SnapshotFeatureCard
        icon={FiStar}
        label="Signature Produkt"
        title={topRatedProduct ? <Link href={`/produkt/${topRatedProduct.slug}`} className="block text-xl font-semibold leading-tight text-white transition-colors hover:text-[#8AF5AC]">{topRatedProduct.name}</Link> : "Noch offen"}
        titleClassName={topRatedProduct ? undefined : "text-xl font-semibold text-white"}
        description={topRatedProduct ? "Dein aktuell bestbewerteter Pick und damit das Aushängeschild deines Profils." : "Sobald du dein erstes Produkt bewertest, landet hier automatisch dein persönliches Highlight."}
        footer={topRatedProduct ? <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#D6E2EF]">{topRatedProduct.category}</span><span className="rounded-full border border-[#4E4322] bg-[#2B2414] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#FFD86C]">Rating {topRatedProduct.rating.toFixed(1)}/5</span></div> : "Noch kein Signature Produkt gespeichert"}
      />

      <SnapshotFeatureCard
        icon={FiTrendingUp}
        label="Liga Momentum"
        title={friendGameData ? `#${friendGameData.viewer.rank}` : "Noch offen"}
        titleClassName={friendGameData ? "text-4xl font-black tracking-tight text-white" : "text-xl font-semibold text-white"}
        description={friendGameData ? viewerLeadsLeague ? "Du führst deine aktuelle Liga an und gibst gerade das Tempo vor." : friendGameData.closestRival ? `Nächster Rivale: ${friendGameData.closestRival.username}. Ein kleiner Push kann die Reihenfolge kippen.` : "Deine Liga füllt sich gerade. Bald entstehen hier echte Rivalitäten." : "Sobald Social-Daten geladen sind, siehst du hier deinen aktuellen Platz in der Liga."}
        footer={friendGameData ? <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#D6E2EF]">unter {friendGameData.viewer.totalPlayers} Profilen</span><span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${viewerLeadsLeague ? "border-[#34503B] bg-[#173023] text-[#D9FFE6]" : "border-[#2D3A4B] bg-[#141C27] text-[#D6E2EF]"}`}>{viewerLeadsLeague ? "Liga-Führung" : friendGameData.closestRival ? `Rivale ${friendGameData.closestRival.username}` : "Momentum baut sich auf"}</span></div> : "Noch keine Liga-Daten verfügbar"}
      />

      <SnapshotFeatureCard
        icon={FiZap}
        label="Level Leiste"
        title={friendGameData?.viewer.currentLevelName ?? levelInfo.currentLevelName}
        titleClassName="text-xl font-semibold leading-tight text-white"
        description={levelInfo.nextLevelName ? `${levelInfo.pointsToNextLevel} Punkte fehlen noch bis ${levelInfo.nextLevelName}.` : "Du hast aktuell das höchste Level auf deinem Profil erreicht."}
        support={<div><div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-[#8CA1B8]"><span>Fortschritt</span><span>{Math.round(currentLevelProgress)}%</span></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-[#0E1520]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#5EE287,#7CC8FF)] transition-all duration-500" style={{ width: formatPercent(currentLevelProgress) }} /></div></div>}
        footer={<div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#D6E2EF]">{profilePoints} Punkte gesammelt</span><span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${levelInfo.nextLevelName ? "border-[#34506D] bg-[#132234] text-[#DCEEFF]" : "border-[#34503B] bg-[#173023] text-[#D9FFE6]"}`}>{levelInfo.nextLevelName ? `Nächstes Level ${levelInfo.nextLevelName}` : "Top-Level erreicht"}</span></div>}
      />
    </div>
  );

  const loadFollowProfiles = useCallback(async () => {
    if (!user) {
      setFollowingProfiles([]);
      setFollowerProfiles([]);
      setOpenFollowList(null);
      setFollowsLoaded(true);
      return;
    }

    setFollowsLoaded(false);
    try {
      const [followingResponse, followersResponse] = await Promise.all([
        fetch("/api/follows?type=following", { cache: "no-store" }),
        fetch("/api/follows?type=followers", { cache: "no-store" }),
      ]);
      const [followingJson, followersJson] = (await Promise.all([
        followingResponse.json(),
        followersResponse.json(),
      ])) as [FollowListResponse, FollowListResponse];

      setFollowingProfiles(
        !followingResponse.ok || !followingJson.success
          ? []
          : Array.isArray(followingJson.data)
            ? followingJson.data
            : []
      );
      setFollowerProfiles(
        !followersResponse.ok || !followersJson.success
          ? []
          : Array.isArray(followersJson.data)
            ? followersJson.data
            : []
      );
    } catch {
      setFollowingProfiles([]);
      setFollowerProfiles([]);
    } finally {
      setFollowsLoaded(true);
    }
  }, [user]);

  const loadFriendGame = useCallback(async () => {
    if (!user) {
      setFriendGameData(null);
      setFriendGameError(null);
      setFriendGameLoaded(true);
      return;
    }

    setFriendGameLoaded(false);
    setFriendGameError(null);
    try {
      const response = await fetch("/api/profile/friends-game", { cache: "no-store" });
      const json = (await response.json()) as FriendGameResponse;

      if (!response.ok || !json.success || !json.data) {
        setFriendGameData(null);
        setFriendGameError(json.error || "Freundesliga konnte nicht geladen werden.");
        return;
      }

      setFriendGameData(json.data);
    } catch {
      setFriendGameData(null);
      setFriendGameError("Freundesliga konnte nicht geladen werden.");
    } finally {
      setFriendGameLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    void loadFollowProfiles();
  }, [loadFollowProfiles]);

  useEffect(() => {
    void loadFriendGame();
  }, [loadFriendGame]);

  async function handleSearchProfiles() {
    const query = profileSearchQuery.trim();
    setProfileSearchPerformed(true);
    setProfileSearchError(null);
    setFollowMessage(null);

    if (query.length < 2) {
      setProfileSearchResults([]);
      setProfileSearchError("Bitte gib mindestens 2 Zeichen ein.");
      return;
    }

    setSearchingProfiles(true);
    try {
      const response = await fetch(`/api/profiles/search?q=${encodeURIComponent(query)}`, {
        cache: "no-store",
      });
      const json = (await response.json()) as ProfileSearchResponse;

      if (!response.ok || !json.success) {
        setProfileSearchResults([]);
        setProfileSearchError(json.error || "Profile konnten nicht geladen werden.");
        return;
      }

      setProfileSearchResults(Array.isArray(json.data) ? json.data : []);
    } catch {
      setProfileSearchResults([]);
      setProfileSearchError("Profile konnten nicht geladen werden.");
    } finally {
      setSearchingProfiles(false);
    }
  }

  async function handleToggleFollow(targetUserId: string, active: boolean, usernameText: string) {
    setFollowMutationUserId(targetUserId);
    setFollowMessage(null);
    setProfileSearchError(null);

    try {
      const response = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, active }),
      });
      const json = (await response.json()) as ToggleFollowResponse;

      if (!response.ok || !json.success) {
        setFollowMessage(json.error || "Folgen-Status konnte nicht geändert werden.");
        return;
      }

      setProfileSearchResults((prev) =>
        prev.map((entry) =>
          entry.userId === targetUserId ? { ...entry, isFollowing: active } : entry
        )
      );
      setFollowMessage(
        active ? `Du folgst jetzt ${usernameText}.` : `Du folgst ${usernameText} nicht mehr.`
      );
      await Promise.all([loadFollowProfiles(), loadFriendGame()]);
    } catch {
      setFollowMessage("Folgen-Status konnte nicht geändert werden.");
    } finally {
      setFollowMutationUserId(null);
    }
  }

  async function handleSaveBio() {
    const response = await saveProfileDetails({ bio: bioInput.trim() || null });
    if (response.success) {
      setProfileNotice({ tone: "success", text: "Bio erfolgreich gespeichert." });
    }
  }

  async function handleRemoveAvatar() {
    const response = await saveProfileDetails({ avatarUrl: null });
    if (response.success) {
      setIsAvatarMenuOpen(false);
      setProfileNotice({ tone: "success", text: "Profilbild wurde entfernt." });
    }
  }

  async function handleAvatarUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      setProfileNotice({ tone: "info", text: "Bitte wähle eine gültige Bilddatei aus." });
      return;
    }

    if (file.size > PROFILE_AVATAR_MAX_FILE_BYTES) {
      setProfileNotice({ tone: "info", text: "Bitte wähle ein Bild unter 4 MB." });
      return;
    }

    setUploadingAvatar(true);
    setIsAvatarMenuOpen(false);
    setProfileNotice(null);

    try {
      const avatarDataUrl = await buildAvatarDataUrl(file);
      const response = await saveProfileDetails({ avatarUrl: avatarDataUrl });
      if (response.success) {
        setProfileNotice({ tone: "success", text: "Profilbild erfolgreich gespeichert." });
      }
    } catch {
      setProfileNotice({ tone: "info", text: "Profilbild konnte nicht verarbeitet werden." });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleCreateCustomList() {
    const response = await createCustomList(customListInput);

    if (!response.success || !response.data) {
      return;
    }

    setCustomListInput("");
    setCustomListMessage(`Liste "${response.data.name}" wurde erstellt.`);
  }

  async function handleDeleteCustomListEntry(listId: string, name: string) {
    if (!window.confirm(`Liste "${name}" wirklich löschen?`)) {
      return;
    }

    const response = await deleteCustomList(listId);

    if (!response.success) {
      return;
    }

    setCustomListMessage(`Liste "${name}" wurde gelöscht.`);
  }

  if (!profileLoaded) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-24 text-white sm:px-8 lg:px-12">
        <BackButton />
        <div className="rounded-[30px] border border-[#2A394B] bg-[#141C27] p-5">
          Profil wird geladen...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-24 text-white sm:px-8 lg:px-12">
        <BackButton />
        <div className="overflow-hidden rounded-[34px] border border-[#2D3A4B] bg-[radial-gradient(circle_at_top_left,rgba(94,226,135,0.18),rgba(20,28,39,0.97)_42%),linear-gradient(145deg,rgba(19,28,40,0.98),rgba(15,22,33,0.95))] p-8 shadow-[0_18px_42px_rgba(0,0,0,0.34)]">
          <p className="text-xs uppercase tracking-[0.22em] text-[#8CA1B8]">Profil</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#F3FFF6] sm:text-4xl">
            Dein FoodRanker Profil
          </h1>
          <p className="mt-4 max-w-2xl text-base text-[#C7D5E4]">
            Logge dich ein, um dein Profil zu personalisieren, Badges freizuschalten und deine eigene Food-Crew im Blick zu behalten.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center rounded-2xl border border-[#5EE287] bg-[#173023] px-5 py-3 font-semibold text-[#D9FFE6] transition-colors hover:bg-[#21402E]"
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 text-white sm:px-8 lg:px-12">
      <BackButton />

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.currentTarget.value = "";
          if (file) {
            void handleAvatarUpload(file);
          }
        }}
      />

      <section className="relative overflow-hidden rounded-[38px] border border-[#2E4154] bg-[radial-gradient(circle_at_top_left,rgba(94,226,135,0.20),rgba(16,24,36,0.98)_40%),radial-gradient(circle_at_bottom_right,rgba(104,180,255,0.14),transparent_42%),linear-gradient(145deg,rgba(21,31,44,0.99),rgba(14,20,31,0.96))] p-6 shadow-[0_26px_70px_rgba(0,0,0,0.36)] sm:p-8 lg:p-10">
        <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="space-y-3">
              <ProfileAvatar
                src={avatarUrl}
                name={hasUsername ? username : "FoodRanker"}
                size="xl"
                onAction={supportsProfileDetails && hasUsername ? () => avatarInputRef.current?.click() : undefined}
                actionLabel="Bild wechseln"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!supportsProfileDetails || !hasUsername || uploadingAvatar || savingProfileDetails}
                  onClick={() => {
                    setIsAvatarMenuOpen(false);
                    avatarInputRef.current?.click();
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[#2D3A4B] bg-[#111925]/90 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:border-[#5EE287] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiUploadCloud size={16} />
                  {uploadingAvatar ? "Lade Bild..." : avatarUrl ? "Bild ändern" : "Bild hochladen"}
                </button>
                {avatarUrl && (
                  <div ref={avatarMenuRef} className="relative">
                    <button
                      type="button"
                      aria-label="Profilbildoptionen öffnen"
                      aria-expanded={isAvatarMenuOpen}
                      aria-haspopup="menu"
                      disabled={savingProfileDetails || uploadingAvatar}
                      onClick={() => {
                        setIsAvatarMenuOpen((current) => !current);
                      }}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2D3A4B] bg-[#111925]/90 text-[#D3DFEB] transition-all duration-300 hover:border-[#5EE287] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="sr-only">Profilbildoptionen öffnen</span>
                      <span className="flex flex-col items-center gap-0.5">
                        <span className="block h-1 w-1 rounded-full bg-current" />
                        <span className="block h-1 w-1 rounded-full bg-current" />
                        <span className="block h-1 w-1 rounded-full bg-current" />
                      </span>
                    </button>

                    {isAvatarMenuOpen && (
                      <div className="absolute left-0 top-12 z-20 min-w-[190px] rounded-2xl border border-[#2D3A4B] bg-[#0F1722] p-2 shadow-[0_18px_42px_rgba(0,0,0,0.38)]">
                        <button
                          type="button"
                          className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-200 transition-colors hover:bg-[#2A1111] disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={savingProfileDetails || uploadingAvatar}
                          onClick={() => {
                            void handleRemoveAvatar();
                          }}
                        >
                          Profilbild entfernen
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.24em] text-[#9CC9AE]">Mein Food Profil</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-[#F3FFF6] sm:text-5xl">
                {hasUsername ? username : "Gestalte dein Profil"}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#C9D8E7] sm:text-lg">
                {bio
                  ? bio
                  : hasUsername
                    ? "Füge jetzt noch ein Profilbild, eine kurze Bio und mehr Aktivität hinzu, damit dein Profil nach dir aussieht."
                    : "Lege zuerst deinen festen Username fest. Danach kannst du Bio, Profilbild und deine komplette Food-Identity ausbauen."}
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#34503B] bg-[#173023] px-4 py-2 text-sm font-semibold text-[#D9FFE6]"><FiZap size={15} />{profilePoints} Punkte</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#2D3A4B] bg-[#111925]/90 px-4 py-2 text-sm font-semibold text-[#D6E2EF]"><FiAward size={15} />{friendGameData?.viewer.currentLevelName ?? levelInfo.currentLevelName}</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#2D3A4B] bg-[#111925]/90 px-4 py-2 text-sm font-semibold text-[#D6E2EF]"><FiCheckCircle size={15} />{profileCompletion.percent}% komplett</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#2D3A4B] bg-[#111925]/90 px-4 py-2 text-sm font-semibold text-[#D6E2EF]"><FiUsers size={15} />{friendGameData?.network.mutualFriendsCount ?? 0} Food-Friends</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
            <MetricCard icon={FiStar} label="Bewertungen" value={String(ratingCount)} hint={ratingCount > 0 ? `${ratedProducts.length} Einträge insgesamt` : "Zeit für deinen ersten Rating-Run"} />
            <MetricCard icon={FiTrendingUp} label="Durchschnitt" value={averageRating !== null ? averageRating.toFixed(1) : "-"} hint={averageRating !== null ? "Dein persönlicher Bewertungs-Schnitt" : "Noch keine Sterne gesammelt"} accent={averageRating !== null ? "text-[#FFD86C]" : undefined} />
            <MetricCard icon={FiUsers} label="Social Reach" value={String(socialReach)} hint={`${followingCount} folgst du, ${followersCount} folgen dir`} />
            <MetricCard icon={FiTarget} label="Nächstes Level" value={levelInfo.nextLevelName ? `${levelInfo.pointsToNextLevel} P` : "Max"} hint={levelInfo.nextLevelName ? `bis ${levelInfo.nextLevelName}` : "Du hast das Top-Level erreicht"} />
          </div>
        </div>
      </section>

      {(profileNotice || profileError) && (
        <div className={`mt-6 rounded-[24px] border px-4 py-3 text-sm ${profileError ? "border-[#6A3434] bg-[#2A1313] text-red-100" : profileNotice?.tone === "success" ? "border-[#2D5B41] bg-[#173023] text-[#D9FFE6]" : "border-[#41586F] bg-[#122233] text-[#DCEEFF]"}`}>
          {profileError || profileNotice?.text}
        </div>
      )}

      <div className="mt-8 grid gap-3 md:grid-cols-3 xl:grid-cols-7">
        {TAB_ITEMS.map((item) => (
          <TabButton
            key={item.id}
            item={item}
            active={activeTab === item.id}
            count={
              item.id === "stats"
                  ? ratingCount
                  : item.id === "badges"
                    ? unlockedBadgeCount
                    : item.id === "social"
                      ? socialReach
                      : item.id === "collection"
                        ? collectionCount
                        : item.id === "activity"
                          ? ratedProducts.length
                          : item.id === "settings"
                            ? profileCompletion.completedCount
                            : undefined
            }
            onClick={() => setActiveTab(item.id)}
          />
        ))}
      </div>

      <div className="mt-8 space-y-6">
        {activeTab === "overview" && (
          <SectionShell eyebrow="Profil" title="Dein Snapshot" description="Hier landet nur das, was dein Profil nach außen ausmacht: Lieblingsprodukt, Liga-Momentum und dein aktuelles Level." action={<button type="button" onClick={() => setActiveTab("settings")} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[#2D3A4B] bg-[#141C27] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-[#5EE287] hover:text-[#E8FFF0]"><FiEdit3 size={15} />Profil bearbeiten</button>}>
            {profileSnapshotCards}
          </SectionShell>
        )}

        {activeTab === "stats" && (
          <SectionShell eyebrow="Statistiken" title="Dein Geschmack in Zahlen" description="Hier siehst du kompakt, wie aktiv, fokussiert und charakteristisch dein Profil gerade wirkt.">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={FiMessageCircle} label="Kommentarquote" value={formatPercent(ratingCoverage)} hint={commentCount > 0 ? `${commentCount} Kommentare zu deinen Ratings` : "Noch keine Kommentare gespeichert"} visual={{ kind: "ring", value: ratingCoverage, label: "Mit Kommentar erklärt", valueLabel: formatPercent(ratingCoverage), tone: "sky" }} />
              <MetricCard icon={FiHeart} label="Favoriten" value={String(favoriteProducts.length)} hint={favoriteProducts.length > 0 ? "Deine aktuelle Hall of Fame" : "Speichere Highlights für dein Profil"} visual={{ kind: "bars", value: favoriteShare, label: "Anteil deiner Sammlung", valueLabel: formatPercent(favoriteShare), tone: "rose" }} />
              <MetricCard icon={FiBookmark} label="Watchlist" value={String(wantToTryProducts.length)} hint={wantToTryProducts.length > 0 ? "Produkte auf deiner Probieren-Liste" : "Baue dir eine Watchlist auf"} visual={{ kind: "bars", value: watchlistShare, label: "Für später reserviert", valueLabel: formatPercent(watchlistShare), tone: "amber" }} />
              <MetricCard icon={FiTarget} label="Top Kategorie" value={topCategory ? topCategory[0] : "-"} hint={topCategory ? `${topCategory[1]} Einträge in deinem stärksten Bereich` : "Noch keine dominante Kategorie"} visual={{ kind: "ring", value: topCategoryShare, label: "Anteil deiner Einträge", valueLabel: formatPercent(topCategoryShare), tone: "mint" }} />
            </div>
          </SectionShell>
        )}

        {activeTab === "badges" && (
          <SectionShell eyebrow="Badges" title="Freigeschaltete Profil-Vibes" description="Mehr Aktivität und ein rundes Profil schalten automatisch neue kleine Status-Momente frei." action={<span className="inline-flex rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#D6E2EF]">{unlockedBadgeCount}/{profileBadges.length} offen</span>}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {profileBadges.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </div>
          </SectionShell>
        )}

        {activeTab === "settings" && (
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <SectionShell eyebrow="Profil Setup" title="Dein Auftritt" description="Username, Bio und Look bearbeitest du jetzt gesammelt in deinem eigenen Einstellungsbereich.">
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-[26px] border border-[#2A394B] bg-[#111925]/88 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">Username</p>
                  {hasUsername ? (
                    <div className="mt-3 rounded-[22px] border border-[#35503D] bg-[linear-gradient(135deg,rgba(94,226,135,0.12),rgba(15,22,33,0.95))] px-4 py-4">
                      <p className="text-sm font-semibold text-white">{username}</p>
                      <p className="mt-2 text-sm text-[#BFE7CC]">Dein Username ist fest gespeichert und bereit für die Freundes-Suche.</p>
                    </div>
                  ) : (
                    <>
                      <div className="mt-3 space-y-3">
                        <input
                          type="text"
                          value={usernameInput}
                          maxLength={usernameLimits.max}
                          onChange={(event) => {
                            setUsernameInput(event.target.value);
                            setProfileNotice(null);
                          }}
                          placeholder="Eindeutigen Username eingeben"
                          className="w-full rounded-2xl border border-[#2D3A4B] bg-[#0F1621] px-4 py-3 text-white outline-none transition-colors placeholder:text-[#7F93A8] focus:border-[#5EE287]"
                        />
                        <button
                          type="button"
                          disabled={savingUsername}
                          onClick={async () => {
                            const response = await saveUsername(usernameInput);
                            if (response.success) {
                              setProfileNotice({ tone: "success", text: "Username erfolgreich gespeichert." });
                            }
                          }}
                          className="inline-flex min-h-11 items-center rounded-2xl bg-[#5EE287] px-5 py-3 font-semibold text-[#0C1910] transition-colors hover:bg-[#79F29C] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingUsername ? "Speichere..." : "Username festlegen"}
                        </button>
                      </div>
                      <p className="mt-3 text-sm text-[#9EB0C3]">Dein Username braucht {usernameLimits.min} bis {usernameLimits.max} Zeichen und kann danach nicht mehr geändert werden.</p>
                    </>
                  )}
                </div>

                <div className="rounded-[26px] border border-[#2A394B] bg-[#111925]/88 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">Bio</p>
                      <p className="mt-2 text-sm text-[#9EB0C3]">Zeig in zwei Sätzen, was deinen Geschmack ausmacht.</p>
                    </div>
                    <span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1 text-xs font-semibold text-[#D6E2EF]">{bioInput.length}/{profileLimits.bioMax}</span>
                  </div>

                  {!supportsProfileDetails && <p className="mt-4 rounded-2xl border border-[#41586F] bg-[#122233] px-4 py-3 text-sm text-[#DCEEFF]">Bio und Profilbild werden aktiv, sobald die neuen Profilspalten in Supabase eingespielt sind.</p>}

                  <textarea
                    value={bioInput}
                    maxLength={profileLimits.bioMax}
                    onChange={(event) => {
                      setBioInput(event.target.value);
                      setProfileNotice(null);
                    }}
                    disabled={!supportsProfileDetails || !hasUsername}
                    placeholder={hasUsername ? "Zum Beispiel: Crunchy Fan, Vanille first, Kommentare immer ehrlich." : "Lege zuerst deinen Username fest, dann kannst du deine Bio speichern."}
                    className="mt-4 min-h-32 w-full rounded-[22px] border border-[#2D3A4B] bg-[#0F1621] px-4 py-3 text-white outline-none transition-colors placeholder:text-[#7F93A8] focus:border-[#5EE287] disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={!supportsProfileDetails || !hasUsername || savingProfileDetails}
                      onClick={() => {
                        void handleSaveBio();
                      }}
                      className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#5EE287] px-5 py-3 font-semibold text-[#0C1910] transition-colors hover:bg-[#79F29C] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiEdit3 size={16} />
                      {savingProfileDetails ? "Speichere..." : "Bio speichern"}
                    </button>
                    <button
                      type="button"
                      disabled={!supportsProfileDetails || !hasUsername || savingProfileDetails}
                      onClick={() => setBioInput(bio)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[#2D3A4B] bg-[#141C27] px-5 py-3 font-semibold text-white transition-colors hover:border-[#5EE287] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiClock size={16} />
                      Zurücksetzen
                    </button>
                  </div>
                </div>
              </div>
            </SectionShell>

            <SectionShell eyebrow="Completion" title="Profil Fortschritt" description="Fortschritt und Profilpflege bleiben sichtbar, aber bewusst außerhalb deiner Hauptansicht.">
              <div className="rounded-[26px] border border-[#2A394B] bg-[#111925]/88 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-4xl font-black tracking-tight text-white">{profileCompletion.percent}%</p>
                    <p className="mt-2 text-sm text-[#9EB0C3]">{profileCompletion.completedCount} von {profileCompletion.totalCount} Profil-Meilensteinen erledigt.</p>
                  </div>
                  <div className="rounded-[22px] border border-[#2D3A4B] bg-[#141C27] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">Level Fortschritt</p>
                    <p className="mt-2 text-sm font-semibold text-white">{friendGameData?.viewer.currentLevelName ?? levelInfo.currentLevelName}</p>
                    <p className="mt-1 text-xs text-[#AFC1D3]">{levelInfo.nextLevelName ? `${levelInfo.pointsToNextLevel} Punkte bis ${levelInfo.nextLevelName}` : "Maximales Level erreicht"}</p>
                  </div>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#0E1520]">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#5EE287,#8BC9FF)] transition-all duration-500" style={{ width: formatPercent(profileCompletion.percent) }} />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {profileCompletion.items.map((item) => (
                    <CompletionItemCard key={item.id} label={item.label} description={item.description} completed={item.completed} />
                  ))}
                </div>
              </div>
            </SectionShell>
          </div>
        )}

        {activeTab === "social" && (
          <>
            <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
              <SectionShell eyebrow="People" title="Profile suchen und vernetzen" description="Finde andere User, folge ihnen und baue dir eine kleine Food-Crew auf.">
                <form onSubmit={(event) => { event.preventDefault(); void handleSearchProfiles(); }} className="rounded-[26px] border border-[#2A394B] bg-[#111925]/88 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="flex min-h-12 flex-1 items-center gap-3 rounded-2xl border border-[#2D3A4B] bg-[#0F1621] px-4 py-3 focus-within:border-[#5EE287] transition-colors"><FiSearch className="text-[#8CA1B8]" /><input type="text" value={profileSearchQuery} onChange={(event) => { setProfileSearchQuery(event.target.value); setProfileSearchError(null); }} placeholder="Username suchen" className="w-full bg-transparent text-white outline-none placeholder:text-[#7F93A8]" /></div>
                    <button type="submit" disabled={searchingProfiles} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#5EE287] px-5 py-3 font-semibold text-[#0C1910] transition-colors hover:bg-[#79F29C] disabled:cursor-not-allowed disabled:opacity-60">{searchingProfiles ? "Suche..." : "Suchen"}</button>
                  </div>
                  <p className="mt-3 text-sm text-[#9EB0C3]">Suche nach Usernames, folge spannenden Profilen und bring deine Liga in Bewegung.</p>
                  {profileSearchError && <p className="mt-3 text-sm text-red-200">{profileSearchError}</p>}
                  {followMessage && <p className="mt-3 text-sm text-[#8AF5AC]">{followMessage}</p>}
                </form>

                <div className="mt-5">
                  {searchingProfiles && <div className="rounded-[24px] border border-[#2A394B] bg-[#111925]/88 p-4 text-sm text-[#9EB0C3]">Suche läuft...</div>}
                  {!searchingProfiles && profileSearchResults.length > 0 && (
                    <ul className="grid gap-3">
                      {profileSearchResults.map((entry) => (
                        <PersonListItem
                          key={`search-profile-${entry.userId}`}
                          username={entry.username}
                          href={`/profil/${entry.userId}`}
                          subtitle={entry.isFollowing ? "Schon in deiner Food-Crew" : "Noch nicht vernetzt"}
                          action={<button type="button" disabled={followMutationUserId === entry.userId} onClick={() => { void handleToggleFollow(entry.userId, !entry.isFollowing, entry.username); }} className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${entry.isFollowing ? "border-[#2D3A4B] bg-[#141C27] text-white hover:border-red-300" : "border-[#5EE287] bg-[#5EE287] text-[#0C1910] hover:bg-[#79F29C]"}`}>{followMutationUserId === entry.userId ? "Speichere..." : entry.isFollowing ? "Entfolgen" : "Folgen"}</button>}
                        />
                      ))}
                    </ul>
                  )}
                  {!searchingProfiles && profileSearchPerformed && profileSearchResults.length === 0 && !profileSearchError && <EmptyPanel icon={FiUsers} title="Keine Treffer" description="Versuche einen anderen Username oder einen etwas allgemeineren Suchbegriff." />}
                </div>
              </SectionShell>

              <SectionShell eyebrow="Netzwerk" title="Follower und Following" description="Öffne gezielt deine Listen und springe schnell in fremde Profile hinein.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <button type="button" onClick={() => setOpenFollowList((prev) => prev === "following" ? null : "following")} className="rounded-[26px] border border-[#2A394B] bg-[#111925]/88 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#5EE287]/25"><p className="text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">Ich folge</p><p className="mt-3 text-3xl font-black tracking-tight text-white">{followingCount}</p><p className="mt-2 text-sm text-[#AFC1D3]">Tippe, um deine Following-Liste ein- oder auszublenden.</p></button>
                  <button type="button" onClick={() => setOpenFollowList((prev) => prev === "followers" ? null : "followers")} className="rounded-[26px] border border-[#2A394B] bg-[#111925]/88 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#5EE287]/25"><p className="text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">Follower</p><p className="mt-3 text-3xl font-black tracking-tight text-white">{followersCount}</p><p className="mt-2 text-sm text-[#AFC1D3]">So viele Leute verfolgen bereits deine Food-Meinungen.</p></button>
                </div>

                <div className="mt-5">
                  {!followsLoaded && <div className="rounded-[24px] border border-[#2A394B] bg-[#111925]/88 p-4 text-sm text-[#9EB0C3]">Netzwerk wird geladen...</div>}
                  {followsLoaded && openFollowList === null && <EmptyPanel icon={FiUsers} title="Wähle eine Liste" description="Mit einem Klick auf die Karten oben öffnest du entweder die Profile, denen du folgst, oder deine Follower." />}
                  {followsLoaded && openFollowList === "following" && (followingCount === 0 ? <EmptyPanel icon={FiUsers} title="Noch niemand in deiner Crew" description="Suche oben nach Profilen, um deine erste kleine Food-Crew aufzubauen." /> : <ul className="grid gap-3">{followingProfiles.map((entry) => <PersonListItem key={`following-${entry.userId}`} username={entry.username} href={`/profil/${entry.userId}`} subtitle="Du folgst diesem Profil" action={<button type="button" disabled={followMutationUserId === entry.userId} onClick={() => { void handleToggleFollow(entry.userId, false, entry.username); }} className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-60">{followMutationUserId === entry.userId ? "Speichere..." : "Entfolgen"}</button>} />)}</ul>)}
                  {followsLoaded && openFollowList === "followers" && (followersCount === 0 ? <EmptyPanel icon={FiUsers} title="Noch keine Follower" description="Mit mehr Bewertungen, Kommentaren und einem schönen Profil wächst deine Reichweite fast automatisch." /> : <ul className="grid gap-3">{followerProfiles.map((entry) => <PersonListItem key={`follower-${entry.userId}`} username={entry.username} href={`/profil/${entry.userId}`} subtitle={entry.isFollowing ? "Ihr seid bereits verbunden" : "Folgt dir schon"} action={<button type="button" disabled={followMutationUserId === entry.userId} onClick={() => { void handleToggleFollow(entry.userId, !entry.isFollowing, entry.username); }} className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${entry.isFollowing ? "border-[#2D3A4B] bg-[#141C27] text-white hover:border-red-300" : "border-[#5EE287] bg-[#5EE287] text-[#0C1910] hover:bg-[#79F29C]"}`}>{followMutationUserId === entry.userId ? "Speichere..." : entry.isFollowing ? "Entfolgen" : "Zurückfolgen"}</button>} />)}</ul>)}
                </div>
              </SectionShell>
            </div>

            <SectionShell eyebrow="Freundesliga" title="Deine Social-Gamification" description="Rang, Level, Geschmacksmatch und Liga-Tabelle machen dein Profil lebendiger." action={friendGameData ? <span className="inline-flex rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#D6E2EF]">{friendGameData.network.comparedAsFriends ? `${friendGameData.network.mutualFriendsCount} Food-Friends` : `${friendGameData.network.followingCount} verglichene Profile`}</span> : null}>
              {!friendGameLoaded && <div className="rounded-[24px] border border-[#2A394B] bg-[#111925]/88 p-4 text-sm text-[#9EB0C3]">Freundesliga wird geladen...</div>}
              {friendGameLoaded && friendGameError && <div className="rounded-[24px] border border-[#6A3434] bg-[#2A1313] p-4 text-sm text-red-100">{friendGameError}</div>}
              {friendGameLoaded && !friendGameError && friendGameData && <><div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4"><MetricCard icon={FiAward} label="Level" value={friendGameData.viewer.currentLevelName} hint={`${friendGameData.viewer.points} Punkte aus Ratings, Kommentaren und Social-Signal`} /><MetricCard icon={FiTrendingUp} label="Liga Rang" value={`#${friendGameData.viewer.rank}`} hint={`von ${friendGameData.viewer.totalPlayers} Profilen in deiner aktuellen Liga`} /><MetricCard icon={FiHeart} label="Geschmacksmatch" value={friendGameData.tasteMatch ? `${friendGameData.tasteMatch.matchScore}%` : "-"} hint={friendGameData.tasteMatch ? `Bester Match mit ${friendGameData.tasteMatch.username}` : "Noch kein gemeinsamer Bewertungs-Match"} /><MetricCard icon={FiTarget} label="Nächster Boost" value={friendGameData.viewer.nextLevelName ? `${friendGameData.viewer.pointsToNextLevel} P` : "Max"} hint={friendGameData.viewer.nextLevelName ? `bis ${friendGameData.viewer.nextLevelName}` : "Aktuell oberstes Profil-Level"} /></div>{friendGameData.network.followingCount === 0 ? <div className="mt-6"><EmptyPanel icon={FiUsers} title="Starte deine Liga" description="Folge ein paar Profilen, damit hier Vergleiche, Geschmacksmatches und kleine Ranglisten entstehen." /></div> : <div className="mt-6 rounded-[28px] border border-[#2A394B] bg-[#111925]/88 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-lg font-semibold text-white">Liga-Tabelle</h3><p className="mt-1 text-sm text-[#9EB0C3]">{friendGameData.network.comparedAsFriends ? "Gegenseitige Follows zählen hier als echte Food-Friends." : "Bis zu gegenseitigen Follows vergleichst du dich mit den Profilen, denen du folgst."}</p></div><span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#D6E2EF]">Top {leagueStandings.length}</span></div><ul className="mt-5 grid gap-3">{leagueStandings.map((entry) => <li key={`league-${entry.userId}`} className={`flex items-center justify-between gap-3 rounded-[24px] border p-4 transition-all duration-300 ${entry.isViewer ? "border-[#5EE287] bg-[linear-gradient(135deg,rgba(94,226,135,0.14),rgba(20,28,39,0.96))]" : "border-[#2D3A4B] bg-[#101822] hover:-translate-y-1 hover:border-[#5EE287]/25"}`}><div className="flex min-w-0 items-center gap-3"><span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#2D3A4B] bg-[#141C27] text-sm font-black text-white">#{entry.rank}</span><div className="min-w-0">{entry.isViewer ? <p className="font-semibold text-white">Du</p> : <Link href={`/profil/${entry.userId}`} className="font-semibold text-white transition-colors hover:text-[#8AF5AC]">{entry.username}</Link>}<p className="mt-1 text-xs text-[#8CA1B8]">{entry.currentLevelName} | {entry.ratingCount} Bewertungen | {entry.commentCount} Kommentare | {entry.favoriteCount} Favoriten</p></div></div><div className="text-right"><p className="text-lg font-black text-[#8AF5AC]">{entry.points}</p><p className="text-xs uppercase tracking-[0.16em] text-[#8CA1B8]">Punkte</p></div></li>)}</ul></div>}</>}
            </SectionShell>
          </>
        )}

        {activeTab === "collection" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={FiHeart} label="Favoriten" value={String(favoriteProducts.length)} hint={favoriteProducts.length > 0 ? "Deine persönliche Best-of-Liste" : "Füge Produkte als Favorit hinzu"} />
              <MetricCard icon={FiBookmark} label="Want to Try" value={String(wantToTryProducts.length)} hint={wantToTryProducts.length > 0 ? "Produkte für später gespeichert" : "Baue dir eine Watchlist auf"} />
              <MetricCard icon={FiCheckCircle} label="Probiert" value={String(triedProducts.length)} hint={triedProducts.length > 0 ? "Schon getestet, auch ohne Sterne" : "Markiere Produkte als probiert"} />
              <MetricCard icon={FiGrid} label="Sammlung gesamt" value={String(collectionCount)} hint="Favoriten, Watchlist, probiert und eigene Listen zusammen" />
            </div>

            <SectionShell eyebrow="Eigene Listen" title="Deine benannten Sammlungen" description="Erstelle Listen mit eigenem Namen und baue dir kleine Themenwelten wie Protein-Favoriten, Date-Night-Pizzen oder Guilty Pleasures.">
              <div className="rounded-[26px] border border-[#2A394B] bg-[#111925]/88 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Neue Liste anlegen</p>
                    <p className="mt-2 text-sm text-[#9EB0C3]">Der Name ist frei wählbar. Produkte fügst du danach direkt auf den Produktseiten hinzu.</p>
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                    <input
                      type="text"
                      value={customListInput}
                      maxLength={40}
                      onChange={(event) => {
                        setCustomListInput(event.target.value);
                        setCustomListMessage(null);
                      }}
                      placeholder="Zum Beispiel Protein-Favoriten"
                      className="min-h-11 w-full min-w-[260px] rounded-2xl border border-[#2D3A4B] bg-[#0F1621] px-4 py-3 text-white outline-none transition-colors placeholder:text-[#7F93A8] focus:border-[#5EE287]"
                    />
                    <button
                      type="button"
                      disabled={creatingList}
                      onClick={() => {
                        void handleCreateCustomList();
                      }}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#5EE287] px-5 py-3 font-semibold text-[#0C1910] transition-colors hover:bg-[#79F29C] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FiPlus size={16} />
                      {creatingList ? "Erstelle..." : "Liste anlegen"}
                    </button>
                  </div>
                </div>

                {(customListsError || customListMessage) && (
                  <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${customListsError ? "border-[#6A3434] bg-[#2A1313] text-red-100" : "border-[#2D5B41] bg-[#173023] text-[#D9FFE6]"}`}>
                    {customListsError || customListMessage}
                  </div>
                )}
              </div>

              {!customListsLoaded ? (
                <div className="rounded-[24px] border border-[#2A394B] bg-[#111925]/88 p-4 text-sm text-[#9EB0C3]">
                  Eigene Listen werden geladen...
                </div>
              ) : customLists.length === 0 ? (
                <EmptyPanel icon={FiGrid} title="Noch keine eigenen Listen" description="Lege hier deine erste benannte Liste an. Danach kannst du Produkte direkt auf den Produktseiten zuordnen." />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {customLists.map((list) => (
                    <div
                      key={list.id}
                      className="rounded-[26px] border border-[#2A394B] bg-[#111925]/88 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#5EE287]/25"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-white">{list.name}</h3>
                            <span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#D6E2EF]">
                              {list.itemCount} Produkte
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-[#8CA1B8]">
                            Zuletzt aktiv {formatShortDate(list.updatedAt || list.insertedAt)}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={deletingListId === list.id}
                          onClick={() => {
                            void handleDeleteCustomListEntry(list.id, list.name);
                          }}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#5A2A2A] bg-[#2A1111] text-red-200 transition-colors hover:bg-[#3A1717] disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Liste ${list.name} löschen`}
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>

                      {list.items.length === 0 ? (
                        <p className="mt-4 rounded-[20px] border border-dashed border-[#35503D] bg-[#0F1722] px-4 py-3 text-sm text-[#AFC1D3]">
                          Die Liste ist noch leer. Füge Produkte direkt auf deren Detailseiten hinzu.
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

            <div className="grid gap-6 xl:grid-cols-3">
              <SectionShell eyebrow="Favoriten" title="Deine Hall of Fame" description="Die Produkte, die du immer wieder empfehlen würdest.">
                {!listsLoaded ? <div className="rounded-[24px] border border-[#2A394B] bg-[#111925]/88 p-4 text-sm text-[#9EB0C3]">Favoriten werden geladen...</div> : favoriteProducts.length === 0 ? <EmptyPanel icon={FiHeart} title="Noch keine Favoriten" description="Sobald du auf Produktseiten Favoriten speicherst, entsteht hier deine persönliche Food Hall of Fame." /> : <ul className="grid gap-3">{favoriteProducts.map((item) => <li key={`favorite-${item.slug}`} className="rounded-[24px] border border-[#2A394B] bg-[#111925]/88 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#5EE287]/25"><Link href={`/produkt/${item.slug}`} className="font-semibold text-white transition-colors hover:text-[#8AF5AC]">{item.name}</Link><p className="mt-1 text-sm text-[#8CA1B8]">{item.category}</p></li>)}</ul>}
              </SectionShell>

              <SectionShell eyebrow="Watchlist" title="Produkte für später" description="Hier landen die Dinge, die du als Nächstes testen möchtest.">
                {!listsLoaded ? <div className="rounded-[24px] border border-[#2A394B] bg-[#111925]/88 p-4 text-sm text-[#9EB0C3]">Watchlist wird geladen...</div> : wantToTryProducts.length === 0 ? <EmptyPanel icon={FiBookmark} title="Noch keine Watchlist" description="Speichere Produkte auf deiner Probieren-Liste, damit dein Profil mehr Tiefe und Zukunftspläne zeigt." /> : <ul className="grid gap-3">{wantToTryProducts.map((item) => <li key={`want-to-try-${item.slug}`} className="rounded-[24px] border border-[#2A394B] bg-[#111925]/88 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#5EE287]/25"><Link href={`/produkt/${item.slug}`} className="font-semibold text-white transition-colors hover:text-[#8AF5AC]">{item.name}</Link><p className="mt-1 text-sm text-[#8CA1B8]">{item.category}</p></li>)}</ul>}
              </SectionShell>

              <SectionShell eyebrow="Probiert" title="Bereits getestet" description="Produkte, die du schon probiert hast, auch wenn du noch keine Sterne vergeben willst.">
                {!listsLoaded ? <div className="rounded-[24px] border border-[#2A394B] bg-[#111925]/88 p-4 text-sm text-[#9EB0C3]">Probiert-Liste wird geladen...</div> : triedProducts.length === 0 ? <EmptyPanel icon={FiCheckCircle} title="Noch nichts als probiert markiert" description="Auf Produktseiten kannst du Lebensmittel einfach als bereits probiert abhaken, ohne direkt ein Rating abzugeben." /> : <ul className="grid gap-3">{triedProducts.map((item) => <li key={`tried-${item.slug}`} className="rounded-[24px] border border-[#2A394B] bg-[#111925]/88 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#7CC8FF]/35"><Link href={`/produkt/${item.slug}`} className="font-semibold text-white transition-colors hover:text-[#BDE4FF]">{item.name}</Link><p className="mt-1 text-sm text-[#8CA1B8]">{item.category}</p></li>)}</ul>}
              </SectionShell>
            </div>
          </>
        )}

        {activeTab === "activity" && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <MetricCard icon={FiStar} label="Aktive Ratings" value={String(ratingCount)} hint={ratingCount > 0 ? "Produkte mit Sternenbewertung" : "Noch keine Sterne vergeben"} />
              <MetricCard icon={FiMessageCircle} label="Kommentare" value={String(commentCount)} hint={commentCount > 0 ? "So oft hast du Kontext hinterlassen" : "Noch keine Kommentare gespeichert"} />
              <MetricCard icon={FiSliders} label="Kommentarquote" value={formatPercent(ratingCoverage)} hint="Wie oft du deine Sterne auch erklärst" />
            </div>

            <SectionShell eyebrow="Aktivität" title="Deine Produkt-Historie" description={ratingsLoaded ? `Du hast bisher ${ratedProducts.length} Einträge gespeichert.` : "Deine gespeicherten Ratings und Kommentare werden geladen."}>
              {!ratingsLoaded && <div className="rounded-[24px] border border-[#2A394B] bg-[#111925]/88 p-4 text-sm text-[#9EB0C3]">Bewertungen werden geladen...</div>}
              {ratingsLoaded && ratedProducts.length > 0 && <div className="grid gap-3 sm:grid-cols-2 mb-5"><select value={selectedRatedCategory} onChange={(event) => setSelectedRatedCategory(event.target.value)} className="w-full rounded-2xl border border-[#2D3A4B] bg-[#141C27] px-4 py-3 text-white outline-none transition-colors focus:border-[#5EE287]"><option value="all">Alle Produktarten</option>{ratedCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select><select value={ratedSortMode} onChange={(event) => setRatedSortMode(event.target.value as RatedSortMode)} className="w-full rounded-2xl border border-[#2D3A4B] bg-[#141C27] px-4 py-3 text-white outline-none transition-colors focus:border-[#5EE287]"><option value="rating-desc">Bewertung: hoch zu niedrig</option><option value="rating-asc">Bewertung: niedrig zu hoch</option><option value="category-asc">Produktart: A-Z</option><option value="category-desc">Produktart: Z-A</option><option value="name-asc">Name: A-Z</option><option value="name-desc">Name: Z-A</option></select></div>}
              {ratingsLoaded && ratedProducts.length === 0 && <EmptyPanel icon={FiStar} title="Noch keine Aktivität" description="Sobald du Produkte bewertest oder kommentierst, baut sich hier automatisch deine persönliche Food-Historie auf." />}
              {ratingsLoaded && ratedProducts.length > 0 && visibleRatedProducts.length === 0 && <EmptyPanel icon={FiSliders} title="Kein Treffer für diesen Filter" description="In dieser Kategorie hast du aktuell noch keine Einträge." />}
              {ratingsLoaded && visibleRatedProducts.length > 0 && <ul className="grid gap-3 sm:gap-4">{visibleRatedProducts.map((item) => <li key={item.slug} className="rounded-[26px] border border-[#2A394B] bg-[#111925]/88 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#5EE287]/25"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link href={`/produkt/${item.slug}`} className="font-semibold text-white transition-colors hover:text-[#8AF5AC]">{item.name}</Link><p className="mt-1 text-sm text-[#8CA1B8]">{item.category}</p></div><span className="shrink-0 rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1 text-sm font-semibold text-[#FFD86C]">{item.rating > 0 ? `Rating ${item.rating.toFixed(1)}/5` : "Nur Kommentar"}</span></div><p className="mt-4 text-sm leading-relaxed text-[#D3DFEB]">{item.comment || "Kein Kommentar hinterlegt."}</p></li>)}</ul>}
            </SectionShell>
          </>
        )}
      </div>
    </div>
  );
}




