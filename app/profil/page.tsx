"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiActivity,
  FiAward,
  FiBookmark,
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiCoffee,
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
import ProductCardImage from "@/app/components/ProductCardImage";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import {
  DEFAULT_PRODUCT_IMAGE,
} from "@/app/data/products";
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
  imageUrl: string;
};

type CollectionProduct = {
  slug: string;
  name: string;
  category: string;
  imageUrl: string;
  rating: number;
};

type ResolvedProfileProduct = {
  productSlug: string;
  routeSlug: string;
  name: string;
  category: string;
  imageUrl: string;
};

type ResolveProductsResponse = {
  success: boolean;
  data?: ResolvedProfileProduct[];
  error?: string;
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
    overlapProducts: Array<{
      productSlug: string;
      name: string;
      category: string;
      imageUrl: string;
      viewerRating: number;
      targetRating: number;
      difference: number;
    }>;
    strongestAgreements: Array<{
      productSlug: string;
      name: string;
      category: string;
      imageUrl: string;
      viewerRating: number;
      targetRating: number;
      difference: number;
    }>;
    strongestDisagreements: Array<{
      productSlug: string;
      name: string;
      category: string;
      imageUrl: string;
      viewerRating: number;
      targetRating: number;
      difference: number;
    }>;
    sharedFavoritesCount: number;
    sharedFavorites: Array<{
      productSlug: string;
      name: string;
      category: string;
      imageUrl: string;
    }>;
  } | null;
};

type TasteCompareResponse = {
  success: boolean;
  data?: TasteCompareData;
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

function CollectionProductCard({
  item,
  accent = "mint",
}: {
  item: CollectionProduct;
  accent?: "mint" | "amber" | "sky";
}) {
  const styles =
    accent === "amber"
      ? {
          card: "hover:border-[#FFD37A]/30",
          title: "hover:text-[#FFD37A]",
          imageBorder: "border-[#5C4723]",
          badge: item.rating > 0
            ? "border-[#5C4723] bg-[#2C2110] text-[#FFD37A]"
            : "border-[#4E4030] bg-[#1C1A16] text-[#D3C5A3]",
        }
      : accent === "sky"
        ? {
            card: "hover:border-[#7CC8FF]/35",
            title: "hover:text-[#BDE4FF]",
            imageBorder: "border-[#2C4F68]",
            badge: item.rating > 0
              ? "border-[#2C4F68] bg-[#112231] text-[#BDE4FF]"
              : "border-[#344B5C] bg-[#131B24] text-[#A89880]",
          }
        : {
            card: "hover:border-[#E8750A]/25",
            title: "hover:text-[#F5963C]",
            imageBorder: "border-[#5A2E08]",
            badge: item.rating > 0
              ? "border-[#5A2E08] bg-[#291808] text-[#FFE4C8]"
              : "border-[#5A2E08] bg-[#101B14] text-[#B8D6C0]",
          };

  return (
    <li
      className={`rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-3.5 transition-all duration-300 hover:-translate-y-1 ${styles.card}`}
    >
      <Link href={`/produkt/${item.slug}`} className="flex items-center gap-4">
        <div
          className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-[#1C1C1C] shadow-[0_16px_30px_rgba(0,0,0,0.22)] ${styles.imageBorder}`}
        >
          <ProductCardImage
            routeSlug={item.slug}
            alt={item.name}
            fallbackSrc={item.imageUrl}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`line-clamp-2 text-sm font-semibold text-white transition-colors ${styles.title}`}>
                {item.name}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#9A8F83]">
                {item.category}
              </p>
            </div>

            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles.badge}`}
            >
              <FiStar size={11} />
              {item.rating > 0 ? item.rating.toFixed(1) : "Kein Rating"}
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

function TasteMatchCard({
  match,
  expanded,
  loading,
  onToggle,
}: {
  match: FriendGameData["tasteMatch"];
  expanded: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  if (!match) {
    return (
      <MetricCard
        icon={FiHeart}
        label="Geschmacksmatch"
        value="-"
        hint="Noch kein gemeinsamer Bewertungs-Match"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="group flex h-full w-full flex-col rounded-lg border border-[#34506D] bg-[linear-gradient(135deg,rgba(20,33,48,0.98),rgba(20,20,20,0.94))] p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#7CC8FF]/55 hover:shadow-[0_18px_40px_rgba(0,0,0,0.26)]"
      aria-expanded={expanded}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.18em] text-[#9A8F83]">Geschmacksmatch</p>
          <p className="mt-3 text-2xl font-black tracking-tight text-white">{match.matchScore}%</p>
          <p className="mt-2 text-sm text-[#D6E5F5]">
            Bester Match mit {match.username} auf Basis von {match.overlapCount} gemeinsamen Bewertungen.
          </p>

          <div className="mt-4 rounded-md border border-[#28425C] bg-[#1C1C1C] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A8F83]">
                Gemeinsame Produkte
              </p>
              <span className="text-xs font-black tracking-[0.08em] text-[#DCEEFF]">
                {match.overlapCount}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[#A89880]">
              <span>Ø Differenz {match.averageDifference.toFixed(2)} Sterne</span>
              <span className="inline-flex items-center gap-1 font-semibold text-[#BDE4FF]">
                {loading ? "Lädt..." : expanded ? "Produkte ausblenden" : "Produkte ansehen"}
                <FiChevronDown
                  size={16}
                  className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                />
              </span>
            </div>
          </div>
        </div>

        <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#34506D] bg-[#132234] text-[#DCEEFF] transition-transform duration-300 group-hover:scale-105 group-hover:border-[#7CC8FF]/55">
          <FiHeart size={20} />
        </span>
      </div>
    </button>
  );
}

function TasteOverlapListItem({
  item,
  targetUsername,
}: {
  item: NonNullable<TasteCompareData["comparison"]>["overlapProducts"][number];
  targetUsername: string;
}) {
  return (
    <li className="rounded-md border border-[#333333] bg-[#1C1C1C] p-4">
      <div className="flex items-start gap-3">
        <Link
          href={`/produkt/${item.productSlug}`}
          aria-label={`${item.name} öffnen`}
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[16px] border border-[#34506D] bg-[#0F1722] shadow-[0_12px_24px_rgba(0,0,0,0.22)]"
        >
          <ProductCardImage
            routeSlug={item.productSlug}
            alt={item.name}
            fallbackSrc={item.imageUrl}
            className="h-full w-full object-cover"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/produkt/${item.productSlug}`}
                className="line-clamp-2 text-sm font-semibold text-white transition-colors hover:text-[#F5963C]"
              >
                {item.name}
              </Link>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#9A8F83]">
                {item.category}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-[#34506D] bg-[#132234] px-2.5 py-1 text-xs font-semibold text-[#DCEEFF]">
              Δ {item.difference.toFixed(1)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#333333] bg-[#222222] px-3 py-1 text-xs font-semibold text-[#DDD0C4]">
              Du {item.viewerRating.toFixed(1)}
            </span>
            <span className="rounded-full border border-[#333333] bg-[#222222] px-3 py-1 text-xs font-semibold text-[#DDD0C4]">
              {targetUsername} {item.targetRating.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}

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
  const customListInputRef = useRef<HTMLInputElement | null>(null);
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
  const [tasteMatchExpanded, setTasteMatchExpanded] = useState(false);
  const [tasteMatchDetailData, setTasteMatchDetailData] = useState<TasteCompareData | null>(null);
  const [tasteMatchDetailLoading, setTasteMatchDetailLoading] = useState(false);
  const [tasteMatchDetailError, setTasteMatchDetailError] = useState<string | null>(null);
  const [resolvedProductsBySlug, setResolvedProductsBySlug] = useState<
    Record<string, ResolvedProfileProduct>
  >({});

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
    setTasteMatchExpanded(false);
    setTasteMatchDetailData(null);
    setTasteMatchDetailError(null);
    setTasteMatchDetailLoading(false);
  }, [friendGameData?.tasteMatch?.userId]);

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

  const profileProductSlugs = useMemo(
    () =>
      Array.from(
        new Set([
          ...Object.keys(ratings),
          ...Object.keys(comments),
          ...favoriteSlugs,
          ...wantToTrySlugs,
          ...triedSlugs,
        ])
      ),
    [comments, favoriteSlugs, ratings, triedSlugs, wantToTrySlugs]
  );

  useEffect(() => {
    let cancelled = false;

    if (profileProductSlugs.length === 0) {
      setResolvedProductsBySlug({});
      return () => {
        cancelled = true;
      };
    }

    async function loadResolvedProducts() {
      try {
        const response = await fetch("/api/products/resolve", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            routeSlugs: profileProductSlugs,
          }),
        });
        const json = (await response.json()) as ResolveProductsResponse;

        if (cancelled || !response.ok || !json.success) {
          return;
        }

        const nextResolvedProductsBySlug = Object.fromEntries(
          (json.data ?? []).map((product) => [product.routeSlug, product] as const)
        );

        setResolvedProductsBySlug(nextResolvedProductsBySlug);
      } catch {
        if (!cancelled) {
          setResolvedProductsBySlug((current) => current);
        }
      }
    }

    void loadResolvedProducts();

    return () => {
      cancelled = true;
    };
  }, [profileProductSlugs]);

  const getResolvedProductBase = useCallback(
    (slug: string) =>
      resolvedProductsBySlug[slug] ?? {
        productSlug: slug,
        routeSlug: slug,
        name: slug,
        category: "Unbekannt",
        imageUrl: DEFAULT_PRODUCT_IMAGE,
      },
    [resolvedProductsBySlug]
  );

  const ratedProducts = useMemo(() => {
    const slugs = new Set<string>([...Object.keys(ratings), ...Object.keys(comments)]);
    const result: RatedProduct[] = [];

    for (const slug of slugs) {
      const rating = typeof ratings[slug] === "number" ? ratings[slug] : 0;
      const comment = typeof comments[slug] === "string" ? comments[slug].trim() : "";
      if (rating <= 0 && comment.length === 0) continue;
      const product = getResolvedProductBase(slug);
      result.push({
        slug,
        name: product.name,
        category: product.category,
        rating,
        comment,
        imageUrl: product.imageUrl,
      });
    }

    result.sort((left, right) => {
      if (left.rating !== right.rating) return right.rating - left.rating;
      return left.name.localeCompare(right.name, "de");
    });

    return result;
  }, [comments, getResolvedProductBase, ratings]);

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

  const favoriteProducts = useMemo<CollectionProduct[]>(() => {
    return favoriteSlugs
      .map((slug) => {
        const product = getResolvedProductBase(slug);
        return {
          slug,
          name: product.name,
          category: product.category,
          imageUrl: product.imageUrl,
          rating: typeof ratings[slug] === "number" ? ratings[slug] : 0,
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name, "de"));
  }, [favoriteSlugs, getResolvedProductBase, ratings]);

  const wantToTryProducts = useMemo<CollectionProduct[]>(() => {
    return wantToTrySlugs
      .map((slug) => {
        const product = getResolvedProductBase(slug);
        return {
          slug,
          name: product.name,
          category: product.category,
          imageUrl: product.imageUrl,
          rating: typeof ratings[slug] === "number" ? ratings[slug] : 0,
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name, "de"));
  }, [getResolvedProductBase, ratings, wantToTrySlugs]);

  const triedProducts = useMemo<CollectionProduct[]>(() => {
    return triedSlugs
      .map((slug) => {
        const product = getResolvedProductBase(slug);
        return {
          slug,
          name: product.name,
          category: product.category,
          imageUrl: product.imageUrl,
          rating: typeof ratings[slug] === "number" ? ratings[slug] : 0,
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name, "de"));
  }, [getResolvedProductBase, ratings, triedSlugs]);

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
  const signatureProductHasImage =
    topRatedProduct?.imageUrl !== undefined &&
    topRatedProduct.imageUrl !== DEFAULT_PRODUCT_IMAGE;
  const profileSnapshotCards = (
    <div className="grid gap-4 lg:auto-rows-fr lg:grid-cols-3">
      <SnapshotFeatureCard
        icon={FiStar}
        label="Signature Produkt"
        media={
          topRatedProduct ? (
            <Link
              href={`/produkt/${topRatedProduct.slug}`}
              aria-label={`${topRatedProduct.name} öffnen`}
              className="block"
            >
              <div className="relative flex h-20 items-center justify-center overflow-hidden rounded-md border border-[#243242] bg-[linear-gradient(180deg,rgba(12,18,27,0.98),rgba(16,24,34,0.96))] px-3">
                {signatureProductHasImage ? (
                  <ProductCardImage
                    routeSlug={topRatedProduct.slug}
                    alt={topRatedProduct.name}
                    fallbackSrc={topRatedProduct.imageUrl}
                    className="h-full w-full object-contain p-2"
                    eager
                  />
                ) : (
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-[#314254] bg-[#182230] text-[#B8C7D6]">
                    <FiCoffee size={24} />
                  </span>
                )}
              </div>
            </Link>
          ) : (
            <div className="flex h-20 items-center justify-center overflow-hidden rounded-md border border-[#243242] bg-[linear-gradient(180deg,rgba(12,18,27,0.98),rgba(16,24,34,0.96))] px-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-[#314254] bg-[#182230] text-[#B8C7D6]">
                <FiCoffee size={24} />
              </span>
            </div>
          )
        }
        title={topRatedProduct ? <Link href={`/produkt/${topRatedProduct.slug}`} className="block text-xl font-semibold leading-tight text-white transition-colors hover:text-[#F5963C]">{topRatedProduct.name}</Link> : "Noch offen"}
        titleClassName={topRatedProduct ? undefined : "text-xl font-semibold text-white"}
        description={topRatedProduct ? "Dein aktuell bestbewerteter Pick und damit das Aushängeschild deines Profils." : "Sobald du dein erstes Produkt bewertest, landet hier automatisch dein persönliches Highlight."}
        footer={topRatedProduct ? <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#333333] bg-[#222222] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#DDD0C4]">{topRatedProduct.category}</span><span className="rounded-full border border-[#4E4322] bg-[#2B2414] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#FFD86C]">Rating {topRatedProduct.rating.toFixed(1)}/5</span></div> : "Noch kein Signature Produkt gespeichert"}
      />

      <SnapshotFeatureCard
        icon={FiTrendingUp}
        label="Liga Momentum"
        title={friendGameData ? `#${friendGameData.viewer.rank}` : "Noch offen"}
        titleClassName={friendGameData ? "text-4xl font-black tracking-tight text-white" : "text-xl font-semibold text-white"}
        description={friendGameData ? viewerLeadsLeague ? "Du führst deine aktuelle Liga an und gibst gerade das Tempo vor." : friendGameData.closestRival ? `Nächster Rivale: ${friendGameData.closestRival.username}. Ein kleiner Push kann die Reihenfolge kippen.` : "Deine Liga füllt sich gerade. Bald entstehen hier echte Rivalitäten." : "Sobald Social-Daten geladen sind, siehst du hier deinen aktuellen Platz in der Liga."}
        footer={friendGameData ? <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#333333] bg-[#222222] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#DDD0C4]">unter {friendGameData.viewer.totalPlayers} Profilen</span><span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${viewerLeadsLeague ? "border-[#5A2E08] bg-[#291808] text-[#FFE4C8]" : "border-[#333333] bg-[#222222] text-[#DDD0C4]"}`}>{viewerLeadsLeague ? "Liga-Führung" : friendGameData.closestRival ? `Rivale ${friendGameData.closestRival.username}` : "Momentum baut sich auf"}</span></div> : "Noch keine Liga-Daten verfügbar"}
      />

      <SnapshotFeatureCard
        icon={FiZap}
        label="Level Leiste"
        title={friendGameData?.viewer.currentLevelName ?? levelInfo.currentLevelName}
        titleClassName="text-xl font-semibold leading-tight text-white"
        description={levelInfo.nextLevelName ? `${levelInfo.pointsToNextLevel} Punkte fehlen noch bis ${levelInfo.nextLevelName}.` : "Du hast aktuell das höchste Level auf deinem Profil erreicht."}
        support={<div><div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-[#9A8F83]"><span>Fortschritt</span><span>{Math.round(currentLevelProgress)}%</span></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-[#0E1520]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#E8750A,#7CC8FF)] transition-all duration-500" style={{ width: formatPercent(currentLevelProgress) }} /></div></div>}
        footer={<div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#333333] bg-[#222222] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#DDD0C4]">{profilePoints} Punkte gesammelt</span><span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${levelInfo.nextLevelName ? "border-[#34506D] bg-[#132234] text-[#DCEEFF]" : "border-[#5A2E08] bg-[#291808] text-[#FFE4C8]"}`}>{levelInfo.nextLevelName ? `Nächstes Level ${levelInfo.nextLevelName}` : "Top-Level erreicht"}</span></div>}
      />
    </div>
  );
  const tasteMatchOverlapProducts = tasteMatchDetailData?.comparison?.overlapProducts ?? [];
  const visibleTasteMatchProducts = tasteMatchOverlapProducts.slice(0, 8);
  const hiddenTasteMatchProductCount = Math.max(0, tasteMatchOverlapProducts.length - visibleTasteMatchProducts.length);

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

  const loadTasteMatchDetail = useCallback(async (targetUserId: string) => {
    setTasteMatchDetailLoading(true);
    setTasteMatchDetailError(null);

    try {
      const response = await fetch(`/api/profile/taste-compare/${targetUserId}`, {
        cache: "no-store",
      });
      const json = (await response.json()) as TasteCompareResponse;

      if (!response.ok || !json.success || !json.data) {
        setTasteMatchDetailData(null);
        setTasteMatchDetailError(json.error || "Geschmacksdetails konnten nicht geladen werden.");
        return;
      }

      setTasteMatchDetailData(json.data);
    } catch {
      setTasteMatchDetailData(null);
      setTasteMatchDetailError("Geschmacksdetails konnten nicht geladen werden.");
    } finally {
      setTasteMatchDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFollowProfiles();
  }, [loadFollowProfiles]);

  useEffect(() => {
    void loadFriendGame();
  }, [loadFriendGame]);

  async function handleToggleTasteMatchDetails() {
    const topMatch = friendGameData?.tasteMatch;
    if (!topMatch) {
      return;
    }

    if (tasteMatchExpanded) {
      setTasteMatchExpanded(false);
      return;
    }

    setTasteMatchExpanded(true);

    if (
      tasteMatchDetailData?.target.userId === topMatch.userId ||
      tasteMatchDetailLoading
    ) {
      return;
    }

    await loadTasteMatchDetail(topMatch.userId);
  }

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
        <BackButton className="mb-5 sm:mb-6" />
        <div className="rounded-xl border border-[#2A2A2A] bg-[#222222] p-5">
          Profil wird geladen...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-24 text-white sm:px-8 lg:px-12">
        <BackButton className="mb-5 sm:mb-6" />
        <div className="overflow-hidden rounded-xl border border-[#333333] bg-[radial-gradient(circle_at_top_left,rgba(232,117,10,0.18),rgba(20,20,20,0.97)_42%),linear-gradient(145deg,rgba(20,20,20,0.98),rgba(20,20,20,0.95))] p-8 shadow-[0_18px_42px_rgba(0,0,0,0.34)]">
          <p className="text-xs uppercase tracking-[0.22em] text-[#9A8F83]">Profil</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#FFF0E4] sm:text-4xl">
            Dein FoodRanker Profil
          </h1>
          <p className="mt-4 max-w-2xl text-base text-[#C7D5E4]">
            Logge dich ein, um dein Profil zu personalisieren, Badges freizuschalten und deine eigene Food-Crew im Blick zu behalten.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center rounded-lg border border-[#E8750A] bg-[#291808] px-5 py-3 font-semibold text-[#FFE4C8] transition-colors hover:bg-[#21402E]"
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 text-white sm:px-8 lg:px-12">
      <BackButton className="mb-5 sm:mb-6" />

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

      <section className="relative overflow-hidden rounded-xl border border-[#333333] bg-[radial-gradient(circle_at_top_left,rgba(232,117,10,0.20),rgba(20,20,20,0.98)_40%),radial-gradient(circle_at_bottom_right,rgba(104,180,255,0.14),transparent_42%),linear-gradient(145deg,rgba(20,20,20,0.99),rgba(14,14,14,0.96))] p-6 shadow-[0_26px_70px_rgba(0,0,0,0.36)] sm:p-8 lg:p-10">
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
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#333333] bg-[#1C1C1C]/90 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:border-[#E8750A] disabled:cursor-not-allowed disabled:opacity-50"
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
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#333333] bg-[#1C1C1C]/90 text-[#D3DFEB] transition-all duration-300 hover:border-[#E8750A] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="sr-only">Profilbildoptionen öffnen</span>
                      <span className="flex flex-col items-center gap-0.5">
                        <span className="block h-1 w-1 rounded-full bg-current" />
                        <span className="block h-1 w-1 rounded-full bg-current" />
                        <span className="block h-1 w-1 rounded-full bg-current" />
                      </span>
                    </button>

                    {isAvatarMenuOpen && (
                      <div className="absolute left-0 top-12 z-20 min-w-[190px] rounded-lg border border-[#333333] bg-[#0F1722] p-2 shadow-[0_18px_42px_rgba(0,0,0,0.38)]">
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
              <h1 className="mt-3 text-4xl font-black tracking-tight text-[#FFF0E4] sm:text-5xl">
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
                <span className="inline-flex items-center gap-2 rounded-full border border-[#5A2E08] bg-[#291808] px-4 py-2 text-sm font-semibold text-[#FFE4C8]"><FiZap size={15} />{profilePoints} Punkte</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#333333] bg-[#1C1C1C]/90 px-4 py-2 text-sm font-semibold text-[#DDD0C4]"><FiAward size={15} />{friendGameData?.viewer.currentLevelName ?? levelInfo.currentLevelName}</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#333333] bg-[#1C1C1C]/90 px-4 py-2 text-sm font-semibold text-[#DDD0C4]"><FiCheckCircle size={15} />{profileCompletion.percent}% komplett</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#333333] bg-[#1C1C1C]/90 px-4 py-2 text-sm font-semibold text-[#DDD0C4]"><FiUsers size={15} />{friendGameData?.network.mutualFriendsCount ?? 0} Food-Friends</span>
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
        <div className={`mt-6 rounded-lg border px-4 py-3 text-sm ${profileError ? "border-[#6A3434] bg-[#2A1313] text-red-100" : profileNotice?.tone === "success" ? "border-[#333333] bg-[#291808] text-[#FFE4C8]" : "border-[#41586F] bg-[#122233] text-[#DCEEFF]"}`}>
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
          <SectionShell eyebrow="Profil" title="Dein Snapshot" description="Hier landet nur das, was dein Profil nach außen ausmacht: Lieblingsprodukt, Liga-Momentum und dein aktuelles Level." action={<button type="button" onClick={() => setActiveTab("settings")} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#333333] bg-[#222222] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-[#E8750A] hover:text-[#FFE4C8]"><FiEdit3 size={15} />Profil bearbeiten</button>}>
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
          <SectionShell eyebrow="Badges" title="Freigeschaltete Profil-Vibes" description="Mehr Aktivität und ein rundes Profil schalten automatisch neue kleine Status-Momente frei." action={<span className="inline-flex rounded-full border border-[#333333] bg-[#222222] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#DDD0C4]">{unlockedBadgeCount}/{profileBadges.length} offen</span>}>
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
                <div className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#9A8F83]">Username</p>
                  {hasUsername ? (
                    <div className="mt-3 rounded-md border border-[#5A2E08] bg-[linear-gradient(135deg,rgba(232,117,10,0.12),rgba(20,20,20,0.95))] px-4 py-4">
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
                          className="w-full rounded-lg border border-[#333333] bg-[#0F1621] px-4 py-3 text-white outline-none transition-colors placeholder:text-[#7F93A8] focus:border-[#E8750A]"
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
                          className="inline-flex min-h-11 items-center rounded-lg bg-[#E8750A] px-5 py-3 font-semibold text-[#1A0E04] transition-colors hover:bg-[#F5963C] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingUsername ? "Speichere..." : "Username festlegen"}
                        </button>
                      </div>
                      <p className="mt-3 text-sm text-[#9EB0C3]">Dein Username braucht {usernameLimits.min} bis {usernameLimits.max} Zeichen und kann danach nicht mehr geändert werden.</p>
                    </>
                  )}
                </div>

                <div className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#9A8F83]">Bio</p>
                      <p className="mt-2 text-sm text-[#9EB0C3]">Zeig in zwei Sätzen, was deinen Geschmack ausmacht.</p>
                    </div>
                    <span className="rounded-full border border-[#333333] bg-[#222222] px-3 py-1 text-xs font-semibold text-[#DDD0C4]">{bioInput.length}/{profileLimits.bioMax}</span>
                  </div>

                  {!supportsProfileDetails && <p className="mt-4 rounded-lg border border-[#41586F] bg-[#122233] px-4 py-3 text-sm text-[#DCEEFF]">Bio und Profilbild werden aktiv, sobald die neuen Profilspalten in Supabase eingespielt sind.</p>}

                  <textarea
                    value={bioInput}
                    maxLength={profileLimits.bioMax}
                    onChange={(event) => {
                      setBioInput(event.target.value);
                      setProfileNotice(null);
                    }}
                    disabled={!supportsProfileDetails || !hasUsername}
                    placeholder={hasUsername ? "Zum Beispiel: Crunchy Fan, Vanille first, Kommentare immer ehrlich." : "Lege zuerst deinen Username fest, dann kannst du deine Bio speichern."}
                    className="mt-4 min-h-32 w-full rounded-md border border-[#333333] bg-[#0F1621] px-4 py-3 text-white outline-none transition-colors placeholder:text-[#7F93A8] focus:border-[#E8750A] disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={!supportsProfileDetails || !hasUsername || savingProfileDetails}
                      onClick={() => {
                        void handleSaveBio();
                      }}
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#E8750A] px-5 py-3 font-semibold text-[#1A0E04] transition-colors hover:bg-[#F5963C] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiEdit3 size={16} />
                      {savingProfileDetails ? "Speichere..." : "Bio speichern"}
                    </button>
                    <button
                      type="button"
                      disabled={!supportsProfileDetails || !hasUsername || savingProfileDetails}
                      onClick={() => setBioInput(bio)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#333333] bg-[#222222] px-5 py-3 font-semibold text-white transition-colors hover:border-[#E8750A] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiClock size={16} />
                      Zurücksetzen
                    </button>
                  </div>
                </div>
              </div>
            </SectionShell>

            <SectionShell eyebrow="Completion" title="Profil Fortschritt" description="Fortschritt und Profilpflege bleiben sichtbar, aber bewusst außerhalb deiner Hauptansicht.">
              <div className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-4xl font-black tracking-tight text-white">{profileCompletion.percent}%</p>
                    <p className="mt-2 text-sm text-[#9EB0C3]">{profileCompletion.completedCount} von {profileCompletion.totalCount} Profil-Meilensteinen erledigt.</p>
                  </div>
                  <div className="rounded-md border border-[#333333] bg-[#222222] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#9A8F83]">Level Fortschritt</p>
                    <p className="mt-2 text-sm font-semibold text-white">{friendGameData?.viewer.currentLevelName ?? levelInfo.currentLevelName}</p>
                    <p className="mt-1 text-xs text-[#A89880]">{levelInfo.nextLevelName ? `${levelInfo.pointsToNextLevel} Punkte bis ${levelInfo.nextLevelName}` : "Maximales Level erreicht"}</p>
                  </div>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#0E1520]">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#E8750A,#8BC9FF)] transition-all duration-500" style={{ width: formatPercent(profileCompletion.percent) }} />
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
                <form onSubmit={(event) => { event.preventDefault(); void handleSearchProfiles(); }} className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="flex min-h-12 flex-1 items-center gap-3 rounded-lg border border-[#333333] bg-[#0F1621] px-4 py-3 focus-within:border-[#E8750A] transition-colors"><FiSearch className="text-[#9A8F83]" /><input type="text" value={profileSearchQuery} onChange={(event) => { setProfileSearchQuery(event.target.value); setProfileSearchError(null); }} placeholder="Username suchen" className="w-full bg-transparent text-white outline-none placeholder:text-[#7F93A8]" /></div>
                    <button type="submit" disabled={searchingProfiles} className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#E8750A] px-5 py-3 font-semibold text-[#1A0E04] transition-colors hover:bg-[#F5963C] disabled:cursor-not-allowed disabled:opacity-60">{searchingProfiles ? "Suche..." : "Suchen"}</button>
                  </div>
                  <p className="mt-3 text-sm text-[#9EB0C3]">Suche nach Usernames, folge spannenden Profilen und bring deine Liga in Bewegung.</p>
                  {profileSearchError && <p className="mt-3 text-sm text-red-200">{profileSearchError}</p>}
                  {followMessage && <p className="mt-3 text-sm text-[#F5963C]">{followMessage}</p>}
                </form>

                <div className="mt-5">
                  {searchingProfiles && <div className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-4 text-sm text-[#9EB0C3]">Suche läuft...</div>}
                  {!searchingProfiles && profileSearchResults.length > 0 && (
                    <ul className="grid gap-3">
                      {profileSearchResults.map((entry) => (
                        <PersonListItem
                          key={`search-profile-${entry.userId}`}
                          username={entry.username}
                          href={`/profil/${entry.userId}`}
                          subtitle={entry.isFollowing ? "Schon in deiner Food-Crew" : "Noch nicht vernetzt"}
                          action={<button type="button" disabled={followMutationUserId === entry.userId} onClick={() => { void handleToggleFollow(entry.userId, !entry.isFollowing, entry.username); }} className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${entry.isFollowing ? "border-[#333333] bg-[#222222] text-white hover:border-red-300" : "border-[#E8750A] bg-[#E8750A] text-[#1A0E04] hover:bg-[#F5963C]"}`}>{followMutationUserId === entry.userId ? "Speichere..." : entry.isFollowing ? "Entfolgen" : "Folgen"}</button>}
                        />
                      ))}
                    </ul>
                  )}
                  {!searchingProfiles && profileSearchPerformed && profileSearchResults.length === 0 && !profileSearchError && <EmptyPanel icon={FiUsers} title="Keine Treffer" description="Versuche einen anderen Username oder einen etwas allgemeineren Suchbegriff." />}
                </div>
              </SectionShell>

              <SectionShell eyebrow="Netzwerk" title="Follower und Following" description="Öffne gezielt deine Listen und springe schnell in fremde Profile hinein.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <button type="button" onClick={() => setOpenFollowList((prev) => prev === "following" ? null : "following")} className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#E8750A]/25"><p className="text-xs uppercase tracking-[0.18em] text-[#9A8F83]">Ich folge</p><p className="mt-3 text-3xl font-black tracking-tight text-white">{followingCount}</p><p className="mt-2 text-sm text-[#A89880]">Tippe, um deine Following-Liste ein- oder auszublenden.</p></button>
                  <button type="button" onClick={() => setOpenFollowList((prev) => prev === "followers" ? null : "followers")} className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#E8750A]/25"><p className="text-xs uppercase tracking-[0.18em] text-[#9A8F83]">Follower</p><p className="mt-3 text-3xl font-black tracking-tight text-white">{followersCount}</p><p className="mt-2 text-sm text-[#A89880]">So viele Leute verfolgen bereits deine Food-Meinungen.</p></button>
                </div>

                <div className="mt-5">
                  {!followsLoaded && <div className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-4 text-sm text-[#9EB0C3]">Netzwerk wird geladen...</div>}
                  {followsLoaded && openFollowList === null && <EmptyPanel icon={FiUsers} title="Wähle eine Liste" description="Mit einem Klick auf die Karten oben öffnest du entweder die Profile, denen du folgst, oder deine Follower." />}
                  {followsLoaded && openFollowList === "following" && (followingCount === 0 ? <EmptyPanel icon={FiUsers} title="Noch niemand in deiner Crew" description="Suche oben nach Profilen, um deine erste kleine Food-Crew aufzubauen." /> : <ul className="grid gap-3">{followingProfiles.map((entry) => <PersonListItem key={`following-${entry.userId}`} username={entry.username} href={`/profil/${entry.userId}`} subtitle="Du folgst diesem Profil" action={<button type="button" disabled={followMutationUserId === entry.userId} onClick={() => { void handleToggleFollow(entry.userId, false, entry.username); }} className="rounded-lg border border-[#333333] bg-[#222222] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-60">{followMutationUserId === entry.userId ? "Speichere..." : "Entfolgen"}</button>} />)}</ul>)}
                  {followsLoaded && openFollowList === "followers" && (followersCount === 0 ? <EmptyPanel icon={FiUsers} title="Noch keine Follower" description="Mit mehr Bewertungen, Kommentaren und einem schönen Profil wächst deine Reichweite fast automatisch." /> : <ul className="grid gap-3">{followerProfiles.map((entry) => <PersonListItem key={`follower-${entry.userId}`} username={entry.username} href={`/profil/${entry.userId}`} subtitle={entry.isFollowing ? "Ihr seid bereits verbunden" : "Folgt dir schon"} action={<button type="button" disabled={followMutationUserId === entry.userId} onClick={() => { void handleToggleFollow(entry.userId, !entry.isFollowing, entry.username); }} className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${entry.isFollowing ? "border-[#333333] bg-[#222222] text-white hover:border-red-300" : "border-[#E8750A] bg-[#E8750A] text-[#1A0E04] hover:bg-[#F5963C]"}`}>{followMutationUserId === entry.userId ? "Speichere..." : entry.isFollowing ? "Entfolgen" : "Zurückfolgen"}</button>} />)}</ul>)}
                </div>
              </SectionShell>
            </div>

            <SectionShell eyebrow="Freundesliga" title="Deine Social-Gamification" description="Rang, Level, Geschmacksmatch und Liga-Tabelle machen dein Profil lebendiger." action={friendGameData ? <span className="inline-flex rounded-full border border-[#333333] bg-[#222222] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#DDD0C4]">{friendGameData.network.comparedAsFriends ? `${friendGameData.network.mutualFriendsCount} Food-Friends` : `${friendGameData.network.followingCount} verglichene Profile`}</span> : null}>
              {!friendGameLoaded && <div className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-4 text-sm text-[#9EB0C3]">Freundesliga wird geladen...</div>}
              {friendGameLoaded && friendGameError && <div className="rounded-lg border border-[#6A3434] bg-[#2A1313] p-4 text-sm text-red-100">{friendGameError}</div>}
              {friendGameLoaded && !friendGameError && friendGameData && (
                <>
                  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      icon={FiAward}
                      label="Level"
                      value={friendGameData.viewer.currentLevelName}
                      hint={`${friendGameData.viewer.points} Punkte aus Ratings, Kommentaren und Social-Signal`}
                    />
                    <MetricCard
                      icon={FiTrendingUp}
                      label="Liga Rang"
                      value={`#${friendGameData.viewer.rank}`}
                      hint={`von ${friendGameData.viewer.totalPlayers} Profilen in deiner aktuellen Liga`}
                    />
                    <TasteMatchCard
                      match={friendGameData.tasteMatch}
                      expanded={tasteMatchExpanded}
                      loading={tasteMatchDetailLoading}
                      onToggle={() => {
                        void handleToggleTasteMatchDetails();
                      }}
                    />
                    <MetricCard
                      icon={FiTarget}
                      label="Nächster Boost"
                      value={friendGameData.viewer.nextLevelName ? `${friendGameData.viewer.pointsToNextLevel} P` : "Max"}
                      hint={friendGameData.viewer.nextLevelName ? `bis ${friendGameData.viewer.nextLevelName}` : "Aktuell oberstes Profil-Level"}
                    />
                  </div>

                  {tasteMatchExpanded && friendGameData.tasteMatch && (
                    <div className="mt-6 rounded-lg border border-[#34506D] bg-[linear-gradient(145deg,rgba(18,28,40,0.98),rgba(14,14,14,0.96))] p-5 shadow-[0_20px_46px_rgba(0,0,0,0.28)]">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-[#9A8F83]">Gemeinsam bewertet</p>
                          <h3 className="mt-2 text-lg font-semibold text-white">
                            Du und {friendGameData.tasteMatch.username} im Direktvergleich
                          </h3>
                          <p className="mt-1 text-sm text-[#A89880]">
                            Alle Produkte, die ihr beide bewertet habt. Sortiert nach Nähe eurer Einschätzung.
                          </p>
                        </div>
                        <span className="rounded-full border border-[#34506D] bg-[#132234] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#DCEEFF]">
                          {friendGameData.tasteMatch.overlapCount} gemeinsame Ratings
                        </span>
                      </div>

                      {tasteMatchDetailLoading && (
                        <div className="mt-5 rounded-md border border-[#2A2A2A] bg-[#1C1C1C]/88 p-4 text-sm text-[#9EB0C3]">
                          Gemeinsame Produkte werden geladen...
                        </div>
                      )}

                      {!tasteMatchDetailLoading && tasteMatchDetailError && (
                        <div className="mt-5 rounded-md border border-[#6A3434] bg-[#2A1313] p-4 text-sm text-red-100">
                          <p>{tasteMatchDetailError}</p>
                          <button
                            type="button"
                            onClick={() => {
                              void loadTasteMatchDetail(friendGameData.tasteMatch!.userId);
                            }}
                            className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-[#34506D] bg-[#132234] px-4 py-2 font-semibold text-[#DCEEFF] transition-colors hover:border-[#7CC8FF]"
                          >
                            Erneut laden
                          </button>
                        </div>
                      )}

                      {!tasteMatchDetailLoading && !tasteMatchDetailError && tasteMatchDetailData?.comparison && (
                        <>
                          <div className="mt-5 flex flex-wrap gap-2.5">
                            <span className="rounded-full border border-[#34506D] bg-[#132234] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#DCEEFF]">
                              Match {tasteMatchDetailData.comparison.matchScore}%
                            </span>
                            <span className="rounded-full border border-[#5A2E08] bg-[#291808] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#FFE4C8]">
                              Ø Differenz {tasteMatchDetailData.comparison.averageDifference.toFixed(2)}
                            </span>
                            {tasteMatchDetailData.comparison.sharedFavoritesCount > 0 && (
                              <span className="rounded-full border border-[#6B4156] bg-[#2A1722] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#FFE1EF]">
                                {tasteMatchDetailData.comparison.sharedFavoritesCount} gemeinsame Favoriten
                              </span>
                            )}
                          </div>

                          <ul className="mt-5 grid gap-3 lg:grid-cols-2">
                            {visibleTasteMatchProducts.map((item) => (
                              <TasteOverlapListItem
                                key={`taste-match-overlap-${item.productSlug}`}
                                item={item}
                                targetUsername={tasteMatchDetailData.target.username}
                              />
                            ))}
                          </ul>

                          {hiddenTasteMatchProductCount > 0 && (
                            <p className="mt-4 text-sm text-[#9EB0C3]">
                              Und noch {hiddenTasteMatchProductCount} weitere gemeinsame Bewertungen.
                            </p>
                          )}

                          {tasteMatchDetailData.comparison.sharedFavoritesCount > 0 && (
                            <div className="mt-5 rounded-md border border-[#2A2A2A] bg-[#1C1C1C]/88 p-4">
                              <p className="text-xs uppercase tracking-[0.18em] text-[#9A8F83]">Gemeinsame Favoriten</p>
                              <div className="mt-3 flex flex-wrap gap-2.5">
                                {tasteMatchDetailData.comparison.sharedFavorites.map((item) => (
                                  <Link
                                    key={`taste-match-favorite-${item.productSlug}`}
                                    href={`/produkt/${item.productSlug}`}
                                    className="inline-flex items-center rounded-full border border-[#5A2E08] bg-[#291808] px-4 py-2 text-sm font-semibold text-[#FFE4C8] transition-colors hover:bg-[#21402E]"
                                  >
                                    {item.name}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {!tasteMatchDetailLoading && !tasteMatchDetailError && tasteMatchDetailData && !tasteMatchDetailData.comparison && (
                        <div className="mt-5">
                          <EmptyPanel
                            icon={FiTarget}
                            title="Noch keine gemeinsame Basis"
                            description="Sobald ihr ein paar Produkte beide bewertet habt, zeigen wir sie dir hier direkt an."
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {friendGameData.network.followingCount === 0 ? (
                    <div className="mt-6">
                      <EmptyPanel
                        icon={FiUsers}
                        title="Starte deine Liga"
                        description="Folge ein paar Profilen, damit hier Vergleiche, Geschmacksmatches und kleine Ranglisten entstehen."
                      />
                    </div>
                  ) : (
                    <div className="mt-6 rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">Liga-Tabelle</h3>
                          <p className="mt-1 text-sm text-[#9EB0C3]">
                            {friendGameData.network.comparedAsFriends
                              ? "Gegenseitige Follows zählen hier als echte Food-Friends."
                              : "Bis zu gegenseitigen Follows vergleichst du dich mit den Profilen, denen du folgst."}
                          </p>
                        </div>
                        <span className="rounded-full border border-[#333333] bg-[#222222] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#DDD0C4]">
                          Top {leagueStandings.length}
                        </span>
                      </div>
                      <ul className="mt-5 grid gap-3">
                        {leagueStandings.map((entry) => (
                          <li
                            key={`league-${entry.userId}`}
                            className={`flex items-center justify-between gap-3 rounded-lg border p-4 transition-all duration-300 ${
                              entry.isViewer
                                ? "border-[#E8750A] bg-[linear-gradient(135deg,rgba(232,117,10,0.14),rgba(20,20,20,0.96))]"
                                : "border-[#333333] bg-[#1C1C1C] hover:-translate-y-1 hover:border-[#E8750A]/25"
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#333333] bg-[#222222] text-sm font-black text-white">
                                #{entry.rank}
                              </span>
                              <div className="min-w-0">
                                {entry.isViewer ? (
                                  <p className="font-semibold text-white">Du</p>
                                ) : (
                                  <Link href={`/profil/${entry.userId}`} className="font-semibold text-white transition-colors hover:text-[#F5963C]">
                                    {entry.username}
                                  </Link>
                                )}
                                <p className="mt-1 text-xs text-[#9A8F83]">
                                  {entry.currentLevelName} | {entry.ratingCount} Bewertungen | {entry.commentCount} Kommentare | {entry.favoriteCount} Favoriten
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-black text-[#F5963C]">{entry.points}</p>
                              <p className="text-xs uppercase tracking-[0.16em] text-[#9A8F83]">Punkte</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
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
              <div className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Neue Liste anlegen</p>
                    <p className="mt-2 text-sm text-[#9EB0C3]">Der Name ist frei wählbar. Produkte fügst du danach direkt auf den Produktseiten hinzu.</p>
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                    <input
                      ref={customListInputRef}
                      type="text"
                      value={customListInput}
                      maxLength={40}
                      onChange={(event) => {
                        setCustomListInput(event.target.value);
                        setCustomListMessage(null);
                      }}
                      placeholder="Zum Beispiel Protein-Favoriten"
                      className="min-h-11 w-full min-w-[260px] rounded-lg border border-[#333333] bg-[#0F1621] px-4 py-3 text-white outline-none transition-colors placeholder:text-[#7F93A8] focus:border-[#E8750A]"
                    />
                    <button
                      type="button"
                      disabled={creatingList}
                      onClick={() => {
                        void handleCreateCustomList();
                      }}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#E8750A] px-5 py-3 font-semibold text-[#1A0E04] transition-colors hover:bg-[#F5963C] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FiPlus size={16} />
                      {creatingList ? "Erstelle..." : "Liste anlegen"}
                    </button>
                  </div>
                </div>

                {(customListsError || customListMessage) && (
                  <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${customListsError ? "border-[#6A3434] bg-[#2A1313] text-red-100" : "border-[#333333] bg-[#291808] text-[#FFE4C8]"}`}>
                    {customListsError || customListMessage}
                  </div>
                )}
              </div>

              {!customListsLoaded ? (
                <div className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-4 text-sm text-[#9EB0C3]">
                  Eigene Listen werden geladen...
                </div>
              ) : customLists.length === 0 ? (
                <div className="flex flex-col items-center rounded-lg border border-dashed border-[#5A2E08] bg-[linear-gradient(145deg,rgba(20,20,20,0.94),rgba(13,20,30,0.98))] px-6 py-8 text-center">
                  <div aria-hidden="true" className="relative mb-5 h-20 w-24">
                    <div className="absolute left-1 top-6 h-12 w-12 rotate-[-10deg] rounded-[16px] border border-[#5A2E08] bg-[#122118] shadow-[0_12px_24px_rgba(0,0,0,0.18)]" />
                    <div className="absolute right-1 top-7 h-12 w-12 rotate-[10deg] rounded-[16px] border border-[#333333] bg-[#131C28] shadow-[0_12px_24px_rgba(0,0,0,0.16)]" />
                    <div className="absolute left-1/2 top-1 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-md border border-[#444444] bg-[linear-gradient(145deg,rgba(232,117,10,0.18),rgba(20,18,14,0.96))] text-[#FFD9B0] shadow-[0_16px_32px_rgba(0,0,0,0.24)]">
                      <FiGrid size={20} />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white">Noch keine eigenen Listen</h3>
                  <p className="mt-2 max-w-md text-sm text-[#A89880]">
                    Starte mit einer ersten benannten Sammlung und sortiere danach Produkte direkt auf den Detailseiten ein.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      customListInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                      customListInputRef.current?.focus();
                    }}
                    className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#E8750A] px-6 py-3 text-base font-semibold text-[#1A0E04] transition-colors hover:bg-[#F5963C]"
                  >
                    <FiPlus size={18} />
                    Erste Liste erstellen
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {customLists.map((list) => (
                    <div
                      key={list.id}
                      className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#E8750A]/25"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-white">{list.name}</h3>
                            <span className="rounded-full border border-[#333333] bg-[#222222] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#DDD0C4]">
                              {list.itemCount} Produkte
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-[#9A8F83]">
                            Zuletzt aktiv {formatShortDate(list.updatedAt || list.insertedAt)}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={deletingListId === list.id}
                          onClick={() => {
                            void handleDeleteCustomListEntry(list.id, list.name);
                          }}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#5A2A2A] bg-[#2A1111] text-red-200 transition-colors hover:bg-[#3A1717] disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Liste ${list.name} löschen`}
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>

                      {list.items.length === 0 ? (
                        <p className="mt-4 rounded-md border border-dashed border-[#5A2E08] bg-[#0F1722] px-4 py-3 text-sm text-[#A89880]">
                          Die Liste ist noch leer. Füge Produkte direkt auf deren Detailseiten hinzu.
                        </p>
                      ) : (
                        <ul className="mt-4 grid gap-3">
                          {list.items.slice(0, 6).map((item) => (
                            <li
                              key={`${list.id}-${item.productSlug}`}
                              className="rounded-md border border-[#333333] bg-[#1C1C1C] px-4 py-3"
                            >
                              <Link
                                href={`/produkt/${item.routeSlug}`}
                                className="font-semibold text-white transition-colors hover:text-[#F5963C]"
                              >
                                {item.name}
                              </Link>
                              <p className="mt-1 text-sm text-[#9A8F83]">{item.category}</p>
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
                {!listsLoaded ? <div className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-4 text-sm text-[#9EB0C3]">Favoriten werden geladen...</div> : favoriteProducts.length === 0 ? <EmptyPanel icon={FiHeart} title="Noch keine Favoriten" description="Sobald du auf Produktseiten Favoriten speicherst, entsteht hier deine persönliche Food Hall of Fame." /> : <ul className="grid gap-3">{favoriteProducts.map((item) => <CollectionProductCard key={`favorite-${item.slug}`} item={item} accent="mint" />)}</ul>}
              </SectionShell>

              <SectionShell eyebrow="Watchlist" title="Produkte für später" description="Hier landen die Dinge, die du als Nächstes testen möchtest.">
                {!listsLoaded ? <div className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-4 text-sm text-[#9EB0C3]">Watchlist wird geladen...</div> : wantToTryProducts.length === 0 ? <EmptyPanel icon={FiBookmark} title="Noch keine Watchlist" description="Speichere Produkte auf deiner Probieren-Liste, damit dein Profil mehr Tiefe und Zukunftspläne zeigt." /> : <ul className="grid gap-3">{wantToTryProducts.map((item) => <CollectionProductCard key={`want-to-try-${item.slug}`} item={item} accent="amber" />)}</ul>}
              </SectionShell>

              <SectionShell eyebrow="Probiert" title="Bereits getestet" description="Produkte, die du schon probiert hast, auch wenn du noch keine Sterne vergeben willst.">
                {!listsLoaded ? <div className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-4 text-sm text-[#9EB0C3]">Probiert-Liste wird geladen...</div> : triedProducts.length === 0 ? <EmptyPanel icon={FiCheckCircle} title="Noch nichts als probiert markiert" description="Auf Produktseiten kannst du Lebensmittel einfach als bereits probiert abhaken, ohne direkt ein Rating abzugeben." /> : <ul className="grid gap-3">{triedProducts.map((item) => <CollectionProductCard key={`tried-${item.slug}`} item={item} accent="sky" />)}</ul>}
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
              {!ratingsLoaded && <div className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-4 text-sm text-[#9EB0C3]">Bewertungen werden geladen...</div>}
              {ratingsLoaded && ratedProducts.length > 0 && <div className="grid gap-3 sm:grid-cols-2 mb-5"><select value={selectedRatedCategory} onChange={(event) => setSelectedRatedCategory(event.target.value)} className="w-full rounded-lg border border-[#333333] bg-[#222222] px-4 py-3 text-white outline-none transition-colors focus:border-[#E8750A]"><option value="all">Alle Produktarten</option>{ratedCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select><select value={ratedSortMode} onChange={(event) => setRatedSortMode(event.target.value as RatedSortMode)} className="w-full rounded-lg border border-[#333333] bg-[#222222] px-4 py-3 text-white outline-none transition-colors focus:border-[#E8750A]"><option value="rating-desc">Bewertung: hoch zu niedrig</option><option value="rating-asc">Bewertung: niedrig zu hoch</option><option value="category-asc">Produktart: A-Z</option><option value="category-desc">Produktart: Z-A</option><option value="name-asc">Name: A-Z</option><option value="name-desc">Name: Z-A</option></select></div>}
              {ratingsLoaded && ratedProducts.length === 0 && <EmptyPanel icon={FiStar} title="Noch keine Aktivität" description="Sobald du Produkte bewertest oder kommentierst, baut sich hier automatisch deine persönliche Food-Historie auf." />}
              {ratingsLoaded && ratedProducts.length > 0 && visibleRatedProducts.length === 0 && <EmptyPanel icon={FiSliders} title="Kein Treffer für diesen Filter" description="In dieser Kategorie hast du aktuell noch keine Einträge." />}
              {ratingsLoaded && visibleRatedProducts.length > 0 && <ul className="grid gap-3 sm:gap-4">{visibleRatedProducts.map((item) => <li key={item.slug} className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/88 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#E8750A]/25"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><Link href={`/produkt/${item.slug}`} aria-label={`${item.name} öffnen`} className="relative mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-xl border border-[#333333] bg-[#1C1C1C] shadow-[0_10px_20px_rgba(0,0,0,0.18)]"><ProductCardImage routeSlug={item.slug} alt={item.name} fallbackSrc={item.imageUrl} className="h-full w-full object-cover" /></Link><div className="min-w-0"><Link href={`/produkt/${item.slug}`} className="font-semibold text-white transition-colors hover:text-[#F5963C]">{item.name}</Link><p className="mt-1 text-sm text-[#9A8F83]">{item.category}</p></div></div><span className="shrink-0 rounded-full border border-[#333333] bg-[#222222] px-3 py-1 text-sm font-semibold text-[#FFD86C]">{item.rating > 0 ? `Rating ${item.rating.toFixed(1)}/5` : "Nur Kommentar"}</span></div><p className="mt-4 text-sm leading-relaxed text-[#D3DFEB] sm:pl-11">{item.comment || "Kein Kommentar hinterlegt."}</p></li>)}</ul>}
            </SectionShell>
          </>
        )}
      </div>
    </div>
  );
}




