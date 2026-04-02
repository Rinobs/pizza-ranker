"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import ReviewLikeButton from "./components/ReviewLikeButton";
import {
  FiArrowRight,
  FiBookmark,
  FiHeart,
  FiMessageSquare,
  FiStar,
  FiUsers,
} from "react-icons/fi";
import ProductCardImage from "./components/ProductCardImage";
import { useReviewLikes } from "./hooks/useReviewLikes";
import {
  ALL_PRODUCTS,
  PIZZA_PRODUCTS,
  getProductImageUrl,
  getProductPriceValue,
  getProductRouteSlug,
  type Product,
} from "./data/products";
import {
  CATEGORY_NAV_ITEMS,
  DEFAULT_DISCOVER_SORT,
  DISCOVER_SORT_OPTIONS,
  compareByDiscoverSort,
  getCategoryNavigationItem,
  getProductSearchScore,
  isCategoryFilter,
  isDiscoverSortMode,
  type DiscoverSortMode,
} from "@/lib/product-navigation";
import { getCategoryAccent } from "@/lib/category-accents";
import { getProfileInitials } from "@/lib/profile-features";

type RankedProduct = {
  name: string;
  category: string;
  routeSlug: string;
  imageUrl: string;
  ratingAvg: number | null;
  ratingCount: number;
  weekRatingAvg: number | null;
  weekRatingCount: number;
};

type BrowseProduct = RankedProduct & {
  newIndex: number;
  searchScore: number;
  priceValue: number | null;
};

type HomeSectionsResponse = {
  topPizza: RankedProduct[];
  newlyAdded: RankedProduct[];
  trending: RankedProduct[];
  bestThisWeek: RankedProduct[];
  hasLiveRatings: boolean;
  generatedAt: string;
};

type RatingSummaryResponse = {
  success?: boolean;
  stats?: Record<
    string,
    {
      ratingAvg: number | null;
      ratingCount: number;
    }
  >;
};

type FollowingPreview = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  followedAt: string | null;
};

type FeedActivity = {
  id: string;
  kind: "rating" | "review" | "favorite" | "want_to_try" | "custom_list";
  userId: string;
  username: string;
  avatarUrl: string | null;
  listName: string | null;
  reviewUserId: string | null;
  likeCount: number;
  viewerLiked: boolean;
  product: {
    routeSlug: string;
    name: string;
    category: string;
    imageUrl: string;
  };
  rating: number | null;
  comment: string | null;
  createdAt: string | null;
};

type HomeFeedData = {
  viewerAuthenticated: boolean;
  followingCount: number;
  followingPreview: FollowingPreview[];
  activities: FeedActivity[];
  generatedAt: string;
};

type HomeFeedResponse = {
  success: boolean;
  data?: HomeFeedData;
  error?: string;
};

type TopListSummary = {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  name: string;
  itemCount: number;
  updatedAt: string | null;
  items: Array<{
    productSlug: string;
    routeSlug: string;
    name: string;
    category: string;
    imageUrl: string;
  }>;
};

type TopListsData = {
  lists: TopListSummary[];
  generatedAt: string;
};

type TopListsResponse = {
  success: boolean;
  data?: TopListsData;
  error?: string;
};

type FeedCategoryOption = {
  category: string;
  count: number;
};

const COMPACT_NUMBER_FORMATTER = new Intl.NumberFormat("de-DE", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat("de-DE", {
  numeric: "auto",
});

const ABSOLUTE_DATE_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "short",
});

const CATEGORY_ORDER = new Map(
  CATEGORY_NAV_ITEMS.map((item, index) => [item.name, index] as const)
);

function toRankedProduct(product: Product): RankedProduct {
  return {
    name: product.name,
    category: product.category,
    routeSlug: getProductRouteSlug(product),
    imageUrl: getProductImageUrl(product),
    ratingAvg: null,
    ratingCount: 0,
    weekRatingAvg: null,
    weekRatingCount: 0,
  };
}

function fallbackSections(): HomeSectionsResponse {
  const topPizza = PIZZA_PRODUCTS.slice(0, 10).map(toRankedProduct);
  const newlyAdded = ALL_PRODUCTS.slice(-10).reverse().map(toRankedProduct);
  const trending = ALL_PRODUCTS.slice(0, 10).map(toRankedProduct);
  const bestThisWeek = topPizza;

  return {
    topPizza,
    newlyAdded,
    trending,
    bestThisWeek,
    hasLiveRatings: false,
    generatedAt: new Date().toISOString(),
  };
}

function emptyFeedData(viewerAuthenticated: boolean): HomeFeedData {
  return {
    viewerAuthenticated,
    followingCount: 0,
    followingPreview: [],
    activities: [],
    generatedAt: new Date().toISOString(),
  };
}

function emptyTopListsData(): TopListsData {
  return {
    lists: [],
    generatedAt: new Date().toISOString(),
  };
}

function formatCompactCount(value: number) {
  return COMPACT_NUMBER_FORMATTER.format(Math.max(0, value));
}

function formatRelativeTime(value: string | null) {
  if (!value) return "Gerade eben";

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return "Gerade eben";
  }

  const diffMs = timestamp - Date.now();
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absMs < minute) {
    return "Gerade eben";
  }

  if (absMs < hour) {
    return RELATIVE_TIME_FORMATTER.format(Math.round(diffMs / minute), "minute");
  }

  if (absMs < day) {
    return RELATIVE_TIME_FORMATTER.format(Math.round(diffMs / hour), "hour");
  }

  if (absMs < 7 * day) {
    return RELATIVE_TIME_FORMATTER.format(Math.round(diffMs / day), "day");
  }

  return ABSOLUTE_DATE_FORMATTER.format(new Date(timestamp));
}

function formatRatingValue(value: number | null) {
  if (value === null) return null;
  return value.toFixed(1);
}

function getFeedCategoryOptions(activities: FeedActivity[]): FeedCategoryOption[] {
  const counts = new Map<string, number>();

  for (const activity of activities) {
    const category = activity.product.category.trim();
    if (!category) {
      continue;
    }

    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((left, right) => {
      const leftOrder = CATEGORY_ORDER.get(left.category) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = CATEGORY_ORDER.get(right.category) ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.category.localeCompare(right.category, "de");
    });
}

function Panel({
  eyebrow,
  title,
  description,
  action,
  children,
  className = "",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[30px] border border-[#2A394B] bg-[linear-gradient(145deg,rgba(18,26,38,0.98),rgba(11,17,26,0.96))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.26)] sm:p-6 ${className}`}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#8CA1B8]">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-[#F3FFF6]">{title}</h2>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#AFC1D3]">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ProductCard({
  product,
  eager = false,
  className = "",
}: {
  product: RankedProduct;
  eager?: boolean;
  className?: string;
}) {
  const categoryAccent = getCategoryAccent(product.category);

  return (
    <div
      className={`group relative overflow-hidden rounded-[24px] border border-[#2D3A4B] bg-[#131B26] shadow-[0_14px_34px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-1.5 ${categoryAccent.cardClass} ${className}`}
      style={{ aspectRatio: "0.72" }}
    >
      <Link
        href={`/produkt/${product.routeSlug}`}
        aria-label={`${product.name} öffnen`}
        className="absolute inset-0 z-10 rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AF5AC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F151E]"
      />

      <div className={`absolute inset-x-0 top-0 z-[1] h-1 ${categoryAccent.accentBarClass}`} />

      <ProductCardImage
        routeSlug={product.routeSlug}
        alt={product.name}
        fallbackSrc={product.imageUrl}
        eager={eager}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/28 to-transparent" />

      <div className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${categoryAccent.badgeClass}`}>
        {product.category}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 p-3 pointer-events-none sm:p-4">
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-[1.15] text-white sm:text-[15px] lg:text-base">
          {product.name}
        </h3>
        {product.ratingAvg !== null ? (
          <p className="mt-2 text-xs font-semibold text-[#FFD86C] sm:text-sm">
            {formatRatingValue(product.ratingAvg)} / 5
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ProductShelf({
  eyebrow,
  title,
  description,
  products,
  actionHref,
}: {
  eyebrow: string;
  title: string;
  description: string;
  products: RankedProduct[];
  actionHref?: string;
}) {
  if (products.length === 0) return null;

  return (
    <Panel
      eyebrow={eyebrow}
      title={title}
      description={description}
      action={
        actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-3 rounded-full border border-[#5EE287]/35 bg-[linear-gradient(135deg,rgba(94,226,135,0.16),rgba(18,27,39,0.94))] px-4 py-2.5 text-sm font-semibold text-[#F3FFF6] shadow-[0_12px_28px_rgba(0,0,0,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#8AF5AC] hover:bg-[linear-gradient(135deg,rgba(94,226,135,0.24),rgba(18,27,39,0.98))] hover:shadow-[0_16px_34px_rgba(94,226,135,0.14)]"
          >
            <span>Mehr sehen</span>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#8AF5AC]/35 bg-[#173023] text-[#CFFFE0]">
              <FiArrowRight size={15} />
            </span>
          </Link>
        ) : null
      }
    >
      <div className="relative">
        <div className="home-shelf-carousel flex gap-4 overflow-x-auto pb-3 pr-[30px] snap-x snap-mandatory">
          {products.map((product, index) => (
            <div
              key={`${title}-${product.routeSlug}`}
              className="w-[calc(100%-1.875rem)] min-w-[236px] shrink-0 snap-start sm:w-[calc((100%-1rem-1.875rem)/2)]"
            >
              <ProductCard
                product={product}
                eager={index < 2}
              />
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute bottom-3 right-0 top-0 hidden w-16 bg-[linear-gradient(90deg,rgba(11,17,26,0),rgba(11,17,26,0.98)_72%)] sm:block" />
      </div>
    </Panel>
  );
}

function MiniAvatar({
  src,
  name,
}: {
  src: string | null;
  name: string;
}) {
  const initials = getProfileInitials(name);

  return (
    <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#35503D] bg-[radial-gradient(circle_at_top,rgba(94,226,135,0.28),rgba(15,22,33,0.96)_70%)] text-sm font-black tracking-[0.12em] text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)]">
      {src ? (
        <img
          src={src}
          alt={`${name} Avatar`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        initials
      )}
    </span>
  );
}

function FeatureTile({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#253548] bg-[#101722]/80 p-4">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#32455B] bg-[#141F2C] text-[#D9FFE6]">
        {icon}
      </span>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#9EB0C3]">{description}</p>
    </div>
  );
}

function FollowPreviewCluster({ previews }: { previews: FollowingPreview[] }) {
  if (previews.length === 0) return null;

  return (
    <div className="flex -space-x-3">
      {previews.slice(0, 4).map((profile) => (
        <Link
          key={profile.userId}
          href={`/profil/${profile.userId}`}
          className="transition-transform duration-300 hover:z-10 hover:translate-y-[-2px]"
          title={profile.username}
        >
          <MiniAvatar src={profile.avatarUrl} name={profile.username} />
        </Link>
      ))}
    </div>
  );
}

function TopListCard({ list }: { list: TopListSummary }) {
  return (
    <li className="rounded-[26px] border border-[#2A394B] bg-[linear-gradient(145deg,rgba(19,27,38,0.96),rgba(12,18,27,0.98))] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#5EE287]/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={`/profil/${list.userId}`}>
            <MiniAvatar src={list.avatarUrl} name={list.username} />
          </Link>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-white">{list.name}</h3>
              <span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D6E2EF]">
                {list.itemCount} Produkte
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#8CA1B8]">
              <Link
                href={`/profil/${list.userId}`}
                className="font-semibold text-[#D7E2EC] transition-colors hover:text-[#8AF5AC]"
              >
                {list.username}
              </Link>
              <span>aktualisiert {formatRelativeTime(list.updatedAt)}</span>
            </div>
          </div>
        </div>

        <FiBookmark className="shrink-0 text-[#8CA1B8]" size={18} />
      </div>

      {list.items.length > 0 ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {list.items.slice(0, 3).map((item) => (
              <Link
                key={`${list.id}-${item.productSlug}-cover`}
                href={`/produkt/${item.routeSlug}`}
                className="group"
              >
                <div className="relative overflow-hidden rounded-[18px] border border-[#2D3A4B] bg-[#101822]" style={{ aspectRatio: "0.72" }}>
                  <ProductCardImage
                    routeSlug={item.routeSlug}
                    alt={item.name}
                    fallbackSrc={item.imageUrl}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-white transition-colors group-hover:text-[#8AF5AC]">
                  {item.name}
                </p>
              </Link>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {list.items.slice(0, 4).map((item) => (
              <Link
                key={`${list.id}-${item.productSlug}-tag`}
                href={`/produkt/${item.routeSlug}`}
                className="rounded-full border border-[#2D3A4B] bg-[#101822] px-3 py-1.5 text-xs font-semibold text-[#D6E2EF] transition-colors hover:border-[#5EE287] hover:text-[#D9FFE6]"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </li>
  );
}

function ActivityCard({
  activity,
  canLikeReviews,
  onToggleReviewLike,
  getReviewLikeState,
  isUpdatingReviewLike,
}: {
  activity: FeedActivity;
  canLikeReviews: boolean;
  onToggleReviewLike: (reviewUserId: string, productSlug: string) => void;
  getReviewLikeState: (
    reviewUserId: string,
    productSlug: string
  ) => { likeCount: number; viewerLiked: boolean };
  isUpdatingReviewLike: (reviewUserId: string, productSlug: string) => boolean;
}) {
  const productHref = `/produkt/${activity.product.routeSlug}`;
  const reviewReplyHref =
    activity.kind === "review" && activity.reviewUserId
      ? `${productHref}#review-${activity.reviewUserId}`
      : productHref;
  const profileHref = `/profil/${activity.userId}`;
  const ratingLabel = formatRatingValue(activity.rating);
  const categoryAccent = getCategoryAccent(activity.product.category);
  const reviewLikeState =
    activity.kind === "review" && activity.reviewUserId
      ? getReviewLikeState(activity.reviewUserId, activity.product.routeSlug)
      : {
          likeCount: activity.likeCount,
          viewerLiked: activity.viewerLiked,
        };

  const badge =
    activity.kind === "review"
      ? {
          label: "Review",
          className: "border-[#34503B] bg-[#173023] text-[#D9FFE6]",
        }
      : activity.kind === "rating"
        ? {
            label: "Rating",
            className: "border-[#5A4B1A] bg-[#271F0E] text-[#FFD86C]",
          }
        : activity.kind === "favorite"
          ? {
              label: "Favorit",
              className: "border-[#60424F] bg-[#231720] text-[#FFDCEB]",
            }
          : activity.kind === "want_to_try"
            ? {
              label: "Watchlist",
              className: "border-[#37506A] bg-[#132132] text-[#D9ECFF]",
            }
            : {
                label: "Liste",
                className: "border-[#35503D] bg-[#122619] text-[#D9FFE6]",
              };

  return (
    <li className="rounded-[26px] border border-[#2A394B] bg-[linear-gradient(145deg,rgba(19,27,38,0.96),rgba(12,18,27,0.98))] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#5EE287]/30">
      <div className="flex items-start gap-4">
        <Link href={profileHref}>
          <MiniAvatar src={activity.avatarUrl} name={activity.username} />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={profileHref}
              className="font-semibold text-white transition-colors hover:text-[#8AF5AC]"
            >
              {activity.username}
            </Link>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${badge.className}`}
            >
              {badge.label}
            </span>
            <span className="text-xs uppercase tracking-[0.16em] text-[#8CA1B8]">
              {formatRelativeTime(activity.createdAt)}
            </span>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-[#D7E2EC] sm:text-base">
            {activity.kind === "review" ? (
              <>
                hat eine Review zu{" "}
                <Link
                  href={productHref}
                  className="font-semibold text-white transition-colors hover:text-[#8AF5AC]"
                >
                  {activity.product.name}
                </Link>{" "}
                gepostet.
              </>
            ) : activity.kind === "rating" ? (
              <>
                hat{" "}
                <Link
                  href={productHref}
                  className="font-semibold text-white transition-colors hover:text-[#8AF5AC]"
                >
                  {activity.product.name}
                </Link>{" "}
                bewertet.
              </>
            ) : activity.kind === "favorite" ? (
              <>
                hat{" "}
                <Link
                  href={productHref}
                  className="font-semibold text-white transition-colors hover:text-[#8AF5AC]"
                >
                  {activity.product.name}
                </Link>{" "}
                zu den Favoriten gelegt.
              </>
            ) : activity.kind === "want_to_try" ? (
              <>
                hat{" "}
                <Link
                  href={productHref}
                  className="font-semibold text-white transition-colors hover:text-[#8AF5AC]"
                >
                  {activity.product.name}
                </Link>{" "}
                auf die Watchlist gesetzt.
              </>
            ) : (
              <>
                hat{" "}
                <Link
                  href={productHref}
                  className="font-semibold text-white transition-colors hover:text-[#8AF5AC]"
                >
                  {activity.product.name}
                </Link>{" "}
                zur Liste{" "}
                <span className="font-semibold text-white">
                  {activity.listName || "Eigene Liste"}
                </span>{" "}
                hinzugefügt.
              </>
            )}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#8CA1B8]">
            <span className={`rounded-full border px-2.5 py-1 ${categoryAccent.subtleBadgeClass}`}>
              {activity.product.category}
            </span>
            {ratingLabel ? (
              <span className="rounded-full border border-[#5A4B1A] bg-[#271F0E] px-2.5 py-1 font-semibold text-[#FFD86C]">
                {ratingLabel} / 5
              </span>
            ) : null}
          </div>

          {activity.comment ? (
            <div className="mt-4 rounded-[20px] border border-[#2D3A4B] bg-[#0F1722]/92 p-4 text-sm leading-relaxed text-[#D3DFEB]">
              <p className="line-clamp-4">{activity.comment}</p>
            </div>
          ) : null}

          {activity.kind === "review" && activity.reviewUserId ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ReviewLikeButton
                compact
                active={reviewLikeState.viewerLiked}
                count={reviewLikeState.likeCount}
                disabled={
                  !canLikeReviews ||
                  isUpdatingReviewLike(activity.reviewUserId, activity.product.routeSlug)
                }
                onClick={() => {
                  onToggleReviewLike(activity.reviewUserId!, activity.product.routeSlug);
                }}
              />

              <Link
                href={reviewReplyHref}
                className="inline-flex items-center gap-2 rounded-full border border-[#35506A] bg-[#132132] px-3 py-1.5 text-xs font-semibold text-[#D9ECFF] transition-colors hover:border-[#7CC8FF] hover:text-white"
              >
                <FiMessageSquare size={14} />
                <span>Antworten</span>
              </Link>
            </div>
          ) : null}
        </div>

        <Link
          href={productHref}
          className={`relative hidden h-36 w-28 shrink-0 overflow-hidden rounded-[22px] border bg-[#101822] shadow-[0_16px_36px_rgba(0,0,0,0.24)] sm:block lg:h-40 lg:w-32 ${categoryAccent.thumbClass}`}
        >
          <ProductCardImage
            routeSlug={activity.product.routeSlug}
            alt={activity.product.name}
            fallbackSrc={activity.product.imageUrl}
            className="h-full w-full object-cover"
          />
        </Link>
      </div>
    </li>
  );
}

function FeedPanel({
  feedData,
  feedLoading,
  feedError,
}: {
  feedData: HomeFeedData;
  feedLoading: boolean;
  feedError: string | null;
}) {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("all");
  const hasActivities = feedData.activities.length > 0;
  const categoryOptions = useMemo(
    () => getFeedCategoryOptions(feedData.activities),
    [feedData.activities]
  );
  const resolvedCategoryFilter =
    activeCategoryFilter === "all" ||
    categoryOptions.some((option) => option.category === activeCategoryFilter)
      ? activeCategoryFilter
      : "all";
  const filteredActivities = useMemo(
    () =>
      resolvedCategoryFilter === "all"
        ? feedData.activities
        : feedData.activities.filter(
            (activity) => activity.product.category === resolvedCategoryFilter
          ),
    [feedData.activities, resolvedCategoryFilter]
  );
  const initialReviewLikes = useMemo(
    () =>
      feedData.activities
        .filter(
          (activity): activity is FeedActivity & { reviewUserId: string } =>
            activity.kind === "review" &&
            typeof activity.reviewUserId === "string" &&
            activity.reviewUserId.length > 0
        )
        .map((activity) => ({
          reviewUserId: activity.reviewUserId,
          productSlug: activity.product.routeSlug,
          likeCount: activity.likeCount,
          viewerLiked: activity.viewerLiked,
        })),
    [feedData.activities]
  );
  const {
    user: reviewLikesUser,
    error: reviewLikesError,
    getReviewLikeState,
    toggleReviewLike,
    isUpdating: isUpdatingReviewLike,
  } = useReviewLikes(initialReviewLikes);

  return (
    <Panel
      eyebrow="Following Feed"
      title="Was dein Netzwerk zuletzt probiert hat"
      description="Wenn du Profilen folgst, wird die Startseite zu deinem persönlichen Food-Diary mit Reviews, Ratings und Listen-Aktivität."
      action={
        feedData.viewerAuthenticated && feedData.followingCount > 0 ? (
          <div className="flex items-center gap-3">
            <FollowPreviewCluster previews={feedData.followingPreview} />
            <span className="rounded-full border border-[#2D3A4B] bg-[#111925] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#D6E2EF]">
              {feedData.followingCount} gefolgt
            </span>
          </div>
        ) : null
      }
      className="overflow-hidden"
    >
      {feedLoading ? (
        <div className="rounded-[26px] border border-[#2A394B] bg-[#101822] p-5 text-sm text-[#9EB0C3]">
          Feed wird geladen...
        </div>
      ) : feedError ? (
        <div className="rounded-[26px] border border-[#5E3340] bg-[#24131A] p-5 text-sm text-[#FFD8E1]">
          Der Following-Feed konnte gerade nicht geladen werden: {feedError}
        </div>
      ) : !feedData.viewerAuthenticated ? (
        <div className="grid gap-4 rounded-[28px] border border-[#2A394B] bg-[linear-gradient(135deg,rgba(94,226,135,0.08),rgba(17,25,37,0.98))] p-5 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h3 className="text-xl font-semibold text-white">Logge dich ein und baue dir deinen Feed</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#AFC1D3]">
              Folge anderen Food-Profilen und sieh hier sofort, welche Tiefkühlpizza,
              Proteinriegel oder Snacks zuletzt bewertet, kommentiert oder gemerkt wurden.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
            <FeatureTile
              icon={<FiStar size={18} />}
              title="Ratings"
              description="Sterne zeigen schnell, was wirklich überzeugt."
            />
            <FeatureTile
              icon={<FiMessageSquare size={18} />}
              title="Reviews"
              description="Kommentare geben Geschmack, Kontext und Vergleiche."
            />
            <FeatureTile
              icon={<FiUsers size={18} />}
              title="Netzwerk"
              description="Mit Follows wird die Startseite persönlich und lebendig."
            />
          </div>
        </div>
      ) : feedData.followingCount === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#35503D] bg-[#111925]/85 p-6">
          <p className="text-lg font-semibold text-white">Noch kein Following-Feed</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#AFC1D3]">
            Du folgst noch niemandem. Sobald du im Profil ein paar Food-Accounts abonnierst,
            erscheinen hier deren letzte Ratings, Reviews, Favoriten und Watchlist-Updates.
          </p>
          <Link
            href="/profil"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#5EE287] bg-[#173023] px-4 py-2 text-sm font-semibold text-[#D9FFE6] transition-colors hover:bg-[#1E3A2A]"
          >
            Profile finden
            <FiArrowRight size={16} />
          </Link>
        </div>
      ) : !hasActivities ? (
        <div className="rounded-[28px] border border-[#2A394B] bg-[#101822] p-6">
          <p className="text-lg font-semibold text-white">Dein Feed wartet auf neue Aktivität</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#AFC1D3]">
            Deine gefolgten Profile waren zuletzt ruhig. Sobald sie Produkte bewerten, Reviews
            schreiben oder Listen aktualisieren, taucht das hier automatisch auf.
          </p>
        </div>
      ) : (
        <>
          {categoryOptions.length > 1 ? (
            <div className="mb-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#8CA1B8]">
                  Kategorie filtern
                </p>
                <p className="text-xs text-[#8CA1B8]">
                  {resolvedCategoryFilter === "all"
                    ? `${feedData.activities.length} Aktivitäten`
                    : `${filteredActivities.length} von ${feedData.activities.length} Aktivitäten`}
                </p>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  type="button"
                  onClick={() => setActiveCategoryFilter("all")}
                  className={`whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                    resolvedCategoryFilter === "all"
                      ? "border-[#5EE287] bg-[#173023] text-[#D9FFE6]"
                      : "border-[#2D3A4B] bg-[#111925] text-[#D6E2EF] hover:border-[#5EE287] hover:text-white"
                  }`}
                >
                  Alle
                  <span className="ml-2 opacity-70">
                    {formatCompactCount(feedData.activities.length)}
                  </span>
                </button>

                {categoryOptions.map((option) => {
                  const accent = getCategoryAccent(option.category);
                  const isActive = resolvedCategoryFilter === option.category;

                  return (
                    <button
                      key={option.category}
                      type="button"
                      onClick={() => setActiveCategoryFilter(option.category)}
                      className={`whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                        isActive
                          ? accent.badgeClass
                          : `${accent.subtleBadgeClass} hover:text-white`
                      }`}
                    >
                      {option.category}
                      <span className="ml-2 opacity-70">
                        {formatCompactCount(option.count)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {filteredActivities.length > 0 ? (
            <ul className="grid gap-4">
              {filteredActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  canLikeReviews={Boolean(reviewLikesUser)}
                  getReviewLikeState={getReviewLikeState}
                  isUpdatingReviewLike={isUpdatingReviewLike}
                  onToggleReviewLike={(reviewUserId, productSlug) => {
                    if (!reviewLikesUser) {
                      return;
                    }

                    void toggleReviewLike(reviewUserId, productSlug);
                  }}
                />
              ))}
            </ul>
          ) : (
            <div className="rounded-[28px] border border-dashed border-[#35503D] bg-[#111925]/85 p-6">
              <p className="text-lg font-semibold text-white">
                Keine Feed-Einträge für {resolvedCategoryFilter}
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#AFC1D3]">
                Sobald jemand aus deinem Netzwerk in dieser Kategorie bewertet, reviewed
                oder Produkte speichert, taucht das hier auf.
              </p>
            </div>
          )}
        </>
      )}

      {reviewLikesError ? (
        <p className="mt-4 text-xs text-red-300">{reviewLikesError}</p>
      ) : null}
    </Panel>
  );
}

function TopListsPanel({
  topListsData,
  topListsLoading,
  topListsError,
}: {
  topListsData: TopListsData;
  topListsLoading: boolean;
  topListsError: string | null;
}) {
  return (
    <Panel
      eyebrow="Top-Listen"
      title="Die stärksten Community-Listen"
      description="Benannte User-Listen bringen Charakter in die Startseite. Hier siehst du die aktuell größten und aktivsten Sammlungen."
      action={
        topListsData.lists.length > 0 ? (
          <span className="rounded-full border border-[#2D3A4B] bg-[#111925] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#D6E2EF]">
            {topListsData.lists.length} Listen
          </span>
        ) : null
      }
      className="overflow-hidden"
    >
      {topListsLoading ? (
        <div className="rounded-[26px] border border-[#2A394B] bg-[#101822] p-5 text-sm text-[#9EB0C3]">
          Top-Listen werden geladen...
        </div>
      ) : topListsError ? (
        <div className="rounded-[26px] border border-[#5E3340] bg-[#24131A] p-5 text-sm text-[#FFD8E1]">
          Die Top-Listen konnten gerade nicht geladen werden: {topListsError}
        </div>
      ) : topListsData.lists.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#35503D] bg-[#111925]/85 p-6">
          <p className="text-lg font-semibold text-white">Noch keine Community-Listen</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#AFC1D3]">
            Sobald Nutzer eigene Listen anlegen und mit Produkten füllen, tauchen hier die spannendsten Sammlungen auf.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4">
          {topListsData.lists.map((list) => (
            <TopListCard key={list.id} list={list} />
          ))}
        </ul>
      )}

      <Link
        href="/profil"
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#8AF5AC] transition-colors hover:text-[#B7FFD0]"
      >
        Eigene Listen erstellen
        <FiArrowRight size={16} />
      </Link>
    </Panel>
  );
}

function NetworkPanel({ feedData }: { feedData: HomeFeedData }) {
  return (
    <Panel
      eyebrow="Netzwerk"
      title="Deine Community"
      description="FoodRanker wird mit Follows am spannendsten. Dann bekommst du statt einer statischen Startseite echte Aktivität aus deinem Kreis."
    >
      {!feedData.viewerAuthenticated ? (
        <div className="rounded-[24px] border border-[#2A394B] bg-[#101822] p-4 text-sm leading-relaxed text-[#AFC1D3]">
          Nach dem Login kannst du andere Profile finden, ihnen folgen und dir so einen
          persönlichen Startseiten-Feed aufbauen.
        </div>
      ) : feedData.followingCount === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[#35503D] bg-[#111925] p-4">
          <p className="text-sm font-semibold text-white">Noch keine Profile gefolgt</p>
          <p className="mt-2 text-sm leading-relaxed text-[#9EB0C3]">
            Fang mit ein paar Accounts an, damit Ratings und Reviews von anderen direkt hier
            landen.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {feedData.followingPreview.map((profile) => (
            <li
              key={profile.userId}
              className="flex items-center justify-between gap-3 rounded-[22px] border border-[#2A394B] bg-[#101822] p-3.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <MiniAvatar src={profile.avatarUrl} name={profile.username} />
                <div className="min-w-0">
                  <Link
                    href={`/profil/${profile.userId}`}
                    className="truncate font-semibold text-white transition-colors hover:text-[#8AF5AC]"
                  >
                    {profile.username}
                  </Link>
                  <p className="mt-1 text-xs text-[#8CA1B8]">
                    gefolgt {formatRelativeTime(profile.followedAt)}
                  </p>
                </div>
              </div>
              <FiUsers className="shrink-0 text-[#8CA1B8]" size={16} />
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/profil"
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#8AF5AC] transition-colors hover:text-[#B7FFD0]"
      >
        Zu Profil, Listen und Social Features
        <FiArrowRight size={16} />
      </Link>
    </Panel>
  );
}

function CategoryPanel() {
  return (
    <Panel
      eyebrow="Kategorien"
      title="Lebensmittel statt nur Produktlisten"
      description="Die Homepage zeigt schon direkt, dass es hier um bewertbare Lebensmittel geht: von Tiefkühlpizza bis Proteinpulver."
    >
      <div className="grid gap-3">
        {CATEGORY_NAV_ITEMS.map((category) => {
          const accent = getCategoryAccent(category.name);

          return (
            <Link
              key={category.slug}
              href={category.href}
              className={`group flex items-start gap-3 rounded-[22px] border p-4 transition-all duration-300 hover:-translate-y-1 ${accent.navCardClass}`}
            >
              <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-2xl leading-none ${accent.iconWrapClass}`}>
                {category.icon}
              </span>
              <div className="min-w-0">
                <p className={`font-semibold text-white transition-colors ${accent.navTitleClass}`}>
                  {category.name}
                </p>
                <p className="mt-1 text-sm text-[#8CA1B8]">{category.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}

function HomeHero({
  heroProducts,
  ratedProductCount,
  totalRatingCount,
  feedData,
  isLoading,
  hasLiveRatings,
}: {
  heroProducts: RankedProduct[];
  ratedProductCount: number;
  totalRatingCount: number;
  feedData: HomeFeedData;
  isLoading: boolean;
  hasLiveRatings: boolean;
}) {
  const heroShelfEyebrow = hasLiveRatings ? "Top bewertet diese Woche" : "Aktuelle Highlights";
  const heroShelfDescription = hasLiveRatings
    ? "Diese Auswahl basiert auf den aktuell stärksten Community-Bewertungen der Woche."
    : "Diese Auswahl zeigt dir zum Start die spannendsten Produkte im aktuellen Katalog.";

  return (
    <section className="overflow-hidden rounded-[40px] border border-[#314258] bg-[radial-gradient(circle_at_top_left,rgba(94,226,135,0.16),rgba(9,14,21,0.98)_38%),radial-gradient(circle_at_top_right,rgba(255,216,108,0.08),transparent_34%),linear-gradient(145deg,rgba(18,26,38,0.99),rgba(8,12,18,0.97))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.34)] sm:p-8 lg:p-10">
      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-[#9CC9AE]">
            Das Food-Diary für Ratings und Reviews
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-[#F6FFF8] sm:text-5xl lg:text-6xl">
            Bewerte Lebensmittel, führe Listen und sieh sofort, was dein Netzwerk zuletzt
            probiert hat.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-[#C9D8E7] sm:text-lg">
            FoodRanker positioniert sich jetzt klar als Bewertungsseite für Lebensmittel:
            Tiefkühlpizza, Chips, Eis, Proteinriegel und mehr. Denk eher an Letterboxd für
            Supermarktregale als an einen simplen Produktkatalog.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/?sort=best"
              className="inline-flex items-center gap-2 rounded-full bg-[#5EE287] px-5 py-3 text-sm font-semibold text-[#0C1910] transition-colors hover:bg-[#79F29C]"
            >
              Beste Lebensmittel entdecken
              <FiArrowRight size={16} />
            </Link>
            <Link
              href="/profil"
              className="inline-flex items-center gap-2 rounded-full border border-[#2D3A4B] bg-[#121B27] px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-[#5EE287] hover:text-[#D9FFE6]"
            >
              Profil und Feed aufbauen
              <FiUsers size={16} />
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5 text-sm">
            <span className="rounded-full border border-[#34503B] bg-[#173023] px-4 py-2 font-semibold text-[#D9FFE6]">
              {ALL_PRODUCTS.length}+ Lebensmittel im Katalog
            </span>
            <span className="rounded-full border border-[#2D3A4B] bg-[#111925]/90 px-4 py-2 font-semibold text-[#D6E2EF]">
              {CATEGORY_NAV_ITEMS.length} Kategorien
            </span>
            <span className="rounded-full border border-[#2D3A4B] bg-[#111925]/90 px-4 py-2 font-semibold text-[#D6E2EF]">
              {ratedProductCount > 0
                ? `${formatCompactCount(ratedProductCount)} Produkte mit Score`
                : "Neue Bewertungen willkommen"}
            </span>
            <span className="rounded-full border border-[#2D3A4B] bg-[#111925]/90 px-4 py-2 font-semibold text-[#D6E2EF]">
              {feedData.followingCount > 0
                ? `${feedData.followingCount} Profile im Feed`
                : "Folgen schaltet Feed frei"}
            </span>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <FeatureTile
              icon={<FiStar size={18} />}
              title="Bewerten"
              description="Vergib Sterne und mach aus Produkten echte Community-Scores."
            />
            <FeatureTile
              icon={<FiHeart size={18} />}
              title="Listen"
              description="Baue Favoriten und Watchlist wie in einem persönlichen Food-Journal."
            />
            <FeatureTile
              icon={<FiUsers size={18} />}
              title="Folgen"
              description="Die Home startet mit Aktivität von Leuten, deren Geschmack du spannend findest."
            />
          </div>

          <p className="mt-6 text-sm text-[#8CA1B8]">
            {isLoading
              ? "Highlights werden geladen..."
              : hasLiveRatings
                ? `${formatCompactCount(totalRatingCount)} Live-Bewertungen prägen die aktuellen Highlights.`
                : "Sobald mehr Live-Bewertungen vorhanden sind, werden die Highlights noch persönlicher."}
          </p>
        </div>

        <div className="rounded-[30px] border border-[#2A394B] bg-[linear-gradient(145deg,rgba(15,22,32,0.92),rgba(10,16,24,0.94))] p-4 shadow-[0_22px_50px_rgba(0,0,0,0.24)] sm:p-5">
          <div className="mb-4">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F3FFF6] sm:text-base">
              {heroShelfEyebrow}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#D6E2EF] sm:text-[15px]">
              {heroShelfDescription}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {heroProducts.map((product, index) => (
              <ProductCard
                key={`hero-${product.routeSlug}`}
                product={product}
                eager={index < 2}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomeContent() {
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const sessionUserEmail = session?.user?.email ?? null;
  const searchQuery = (searchParams.get("q") || "").trim();
  const rawCategory = searchParams.get("category");
  const rawSort = searchParams.get("sort");
  const selectedCategory = isCategoryFilter(rawCategory) ? rawCategory : "all";
  const sortMode: DiscoverSortMode = isDiscoverSortMode(rawSort)
    ? rawSort
    : DEFAULT_DISCOVER_SORT;
  const hasActiveFilters =
    selectedCategory !== "all" || sortMode !== DEFAULT_DISCOVER_SORT;
  const isDiscoverMode = searchQuery.length > 0 || hasActiveFilters;

  const fallback = useMemo(() => fallbackSections(), []);
  const [sections, setSections] = useState<HomeSectionsResponse>(fallback);
  const [isLoading, setIsLoading] = useState(true);
  const [ratingStats, setRatingStats] = useState<
    Record<string, { ratingAvg: number | null; ratingCount: number }>
  >({});
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [feedData, setFeedData] = useState<HomeFeedData>(() => emptyFeedData(false));
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [topListsData, setTopListsData] = useState<TopListsData>(() => emptyTopListsData());
  const [topListsLoading, setTopListsLoading] = useState(true);
  const [topListsError, setTopListsError] = useState<string | null>(null);
  const [communityTab, setCommunityTab] = useState<"feed" | "top-lists">("feed");

  useEffect(() => {
    let cancelled = false;

    async function loadSections() {
      try {
        const response = await fetch("/api/home/sections", { cache: "no-store" });
        if (!response.ok) return;

        const json = (await response.json()) as Partial<HomeSectionsResponse>;
        if (cancelled) return;

        setSections({
          topPizza: json.topPizza ?? fallback.topPizza,
          newlyAdded: json.newlyAdded ?? fallback.newlyAdded,
          trending: json.trending ?? fallback.trending,
          bestThisWeek: json.bestThisWeek ?? fallback.bestThisWeek,
          hasLiveRatings:
            typeof json.hasLiveRatings === "boolean"
              ? json.hasLiveRatings
              : fallback.hasLiveRatings,
          generatedAt:
            typeof json.generatedAt === "string" ? json.generatedAt : fallback.generatedAt,
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadSections();

    return () => {
      cancelled = true;
    };
  }, [fallback]);

  useEffect(() => {
    let cancelled = false;

    async function loadRatingStats() {
      try {
        const response = await fetch("/api/ratings/summary", { cache: "no-store" });
        if (!response.ok) return;

        const json = (await response.json()) as RatingSummaryResponse;
        if (cancelled) return;

        setRatingStats(json.stats ?? {});
      } finally {
        if (!cancelled) setStatsLoaded(true);
      }
    }

    void loadRatingStats();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (sessionStatus === "loading") {
      setFeedLoading(true);
      return () => {
        cancelled = true;
      };
    }

    if (!sessionUserEmail) {
      setFeedData(emptyFeedData(false));
      setFeedError(null);
      setFeedLoading(false);
      return () => {
        cancelled = true;
      };
    }

    async function loadFeed() {
      setFeedLoading(true);
      setFeedError(null);

      try {
        const response = await fetch("/api/home/feed", { cache: "no-store" });
        const json = (await response.json()) as HomeFeedResponse;

        if (cancelled) return;

        if (!response.ok || !json.success || !json.data) {
          setFeedError(json.error || "Feed konnte nicht geladen werden.");
          setFeedData(emptyFeedData(true));
          return;
        }

        setFeedData(json.data);
      } catch {
        if (!cancelled) {
          setFeedError("Feed konnte nicht geladen werden.");
          setFeedData(emptyFeedData(true));
        }
      } finally {
        if (!cancelled) setFeedLoading(false);
      }
    }

    void loadFeed();

    return () => {
      cancelled = true;
    };
  }, [sessionStatus, sessionUserEmail]);

  useEffect(() => {
    let cancelled = false;

    async function loadTopLists() {
      setTopListsLoading(true);
      setTopListsError(null);

      try {
        const response = await fetch("/api/home/top-lists", { cache: "no-store" });
        const json = (await response.json()) as TopListsResponse;

        if (cancelled) return;

        if (!response.ok || !json.success || !json.data) {
          setTopListsError(json.error || "Top-Listen konnten nicht geladen werden.");
          setTopListsData(emptyTopListsData());
          return;
        }

        setTopListsData(json.data);
      } catch {
        if (!cancelled) {
          setTopListsError("Top-Listen konnten nicht geladen werden.");
          setTopListsData(emptyTopListsData());
        }
      } finally {
        if (!cancelled) {
          setTopListsLoading(false);
        }
      }
    }

    void loadTopLists();

    return () => {
      cancelled = true;
    };
  }, []);

  const browseProducts = useMemo(() => {
    const items: BrowseProduct[] = [];

    for (const [index, product] of ALL_PRODUCTS.entries()) {
      if (selectedCategory !== "all" && product.slug !== selectedCategory) {
        continue;
      }

      const routeSlug = getProductRouteSlug(product);
      const base = toRankedProduct(product);
      const stats = ratingStats[routeSlug];
      const searchScore = searchQuery ? getProductSearchScore(product, searchQuery) : 0;

      if (searchQuery && searchScore <= 0) {
        continue;
      }

      items.push({
        ...base,
        ratingAvg: stats?.ratingAvg ?? null,
        ratingCount: stats?.ratingCount ?? 0,
        newIndex: index,
        searchScore,
        priceValue: getProductPriceValue(product),
      });
    }

    items.sort((left, right) => {
      if (searchQuery && left.searchScore !== right.searchScore) {
        return right.searchScore - left.searchScore;
      }

      return compareByDiscoverSort(left, right, sortMode);
    });

    return items;
  }, [ratingStats, searchQuery, selectedCategory, sortMode]);

  const ratedProductCount = useMemo(
    () => Object.values(ratingStats).filter((entry) => entry.ratingCount > 0).length,
    [ratingStats]
  );

  const totalRatingCount = useMemo(
    () =>
      Object.values(ratingStats).reduce(
        (sum, entry) => sum + Math.max(0, entry.ratingCount),
        0
      ),
    [ratingStats]
  );

  const heroProducts = useMemo(() => {
    const seen = new Set<string>();

    return [
      ...sections.bestThisWeek,
      ...sections.trending,
      ...sections.newlyAdded,
      ...sections.topPizza,
    ]
      .filter((product) => {
        if (seen.has(product.routeSlug)) return false;
        seen.add(product.routeSlug);
        return true;
      })
      .slice(0, 4);
  }, [sections]);

  const sortLabel =
    DISCOVER_SORT_OPTIONS.find((option) => option.value === sortMode)?.label ?? "Beliebt";
  const activeCategory =
    selectedCategory === "all" ? null : getCategoryNavigationItem(selectedCategory);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(94,226,135,0.06),transparent_24%),linear-gradient(180deg,#0A1118_0%,#0F151E_52%,#0A1118_100%)] px-4 pb-24 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        {isDiscoverMode ? (
          <>
            <section className="rounded-[36px] border border-[#2A394B] bg-[radial-gradient(circle_at_top_left,rgba(94,226,135,0.1),rgba(16,24,36,0.98)_42%),linear-gradient(145deg,rgba(19,27,38,0.98),rgba(10,15,22,0.97))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)] sm:p-8">
              <p className="text-xs uppercase tracking-[0.24em] text-[#9CC9AE]">
                Lebensmittel entdecken
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-[#F3FFF6] sm:text-4xl">
                Finde Produkte, die du als Nächstes bewerten willst.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#C9D8E7] sm:text-base">
                FoodRanker ist jetzt klar als Bewertungsseite für Lebensmittel inszeniert:
                Suche gezielt nach Produkten, filtere nach Kategorie und sortiere wie in einem
                echten Food-Discovery-Feed.
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
                <span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1.5 text-[#BFD0E2]">
                  {browseProducts.length} Treffer
                </span>
                {activeCategory ? (
                  <span className="rounded-full border border-[#5EE287]/35 bg-[#173023] px-3 py-1.5 text-[#D9FFE6]">
                    {activeCategory.shortName}
                  </span>
                ) : null}
                {searchQuery ? (
                  <span className="rounded-full border border-[#37506A] bg-[#132132] px-3 py-1.5 text-[#D9ECFF]">
                    Suche aktiv
                  </span>
                ) : null}
                <span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1.5 text-[#BFD0E2]">
                  Sortierung: {sortLabel}
                </span>
              </div>
            </section>

            <section className="mt-8">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#8CA1B8]">
                    Ergebnisse
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-[#F3FFF6] sm:text-3xl">
                    {searchQuery ? `Treffer für "${searchQuery}"` : "Gefilterte Produkte"}
                  </h2>
                  <p className="mt-2 text-sm text-[#AFC1D3]">
                    {activeCategory
                      ? `${activeCategory.name} gefiltert, sortiert nach ${sortLabel}.`
                      : `Alle Lebensmittel, sortiert nach ${sortLabel}.`}
                  </p>
                </div>
                {!statsLoaded ? (
                  <span className="text-sm text-[#8CA1B8]">
                    Bewertungsdaten werden geladen...
                  </span>
                ) : null}
              </div>

              {browseProducts.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {browseProducts.map((product, index) => (
                    <ProductCard
                      key={`browse-${product.routeSlug}`}
                      product={product}
                      eager={index < 4}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[28px] border border-[#2A394B] bg-[#111925]/90 p-6 text-[#C4D0DE]">
                  <p>
                    Keine Treffer gefunden. Versuche andere Begriffe wie Pizza, Salami, Vanille,
                    Protein oder wähle eine andere Kategorie.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={{
                        pathname: "/produkt-vorschlagen",
                        query: {
                          ...(searchQuery ? { name: searchQuery } : {}),
                          ...(selectedCategory !== "all" ? { category: selectedCategory } : {}),
                          from: "suche",
                        },
                      }}
                      className="inline-flex items-center rounded-full bg-[#5EE287] px-4 py-2 text-sm font-semibold text-[#0C1910] transition-colors hover:bg-[#79F29C]"
                    >
                      Produkt vorschlagen
                    </Link>
                    <Link
                      href="/"
                      className="inline-flex items-center rounded-full border border-[#2D3A4B] bg-[#141C27] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-[#5EE287] hover:text-[#D9FFE6]"
                    >
                      Zur Startseite
                    </Link>
                  </div>
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <HomeHero
              heroProducts={heroProducts}
              ratedProductCount={ratedProductCount}
              totalRatingCount={totalRatingCount}
              feedData={feedData}
              isLoading={isLoading}
              hasLiveRatings={sections.hasLiveRatings}
            />

            <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCommunityTab("feed")}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                        communityTab === "feed"
                          ? "border-[#5EE287] bg-[#173023] text-[#D9FFE6]"
                          : "border-[#2D3A4B] bg-[#121B27] text-white hover:border-[#5EE287]"
                      }`}
                    >
                      Following Feed
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommunityTab("top-lists")}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                        communityTab === "top-lists"
                          ? "border-[#5EE287] bg-[#173023] text-[#D9FFE6]"
                          : "border-[#2D3A4B] bg-[#121B27] text-white hover:border-[#5EE287]"
                      }`}
                    >
                      Top-Listen
                    </button>
                  </div>

                  {communityTab === "feed" ? (
                    <FeedPanel
                      feedData={feedData}
                      feedLoading={feedLoading}
                      feedError={feedError}
                    />
                  ) : (
                    <TopListsPanel
                      topListsData={topListsData}
                      topListsLoading={topListsLoading}
                      topListsError={topListsError}
                    />
                  )}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <ProductShelf
                    eyebrow="Community Favoriten"
                    title="Beste Bewertungen der Woche"
                    description="Produkte mit den stärksten aktuellen Scores und Momentum."
                    products={sections.bestThisWeek.slice(0, 4)}
                    actionHref="/?sort=best"
                  />
                  <ProductShelf
                    eyebrow="Momentum"
                    title="Trendet gerade"
                    description="Das bespricht und bewertet die Community momentan besonders häufig."
                    products={sections.trending.slice(0, 4)}
                    actionHref="/?sort=popular"
                  />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <ProductShelf
                    eyebrow="Neu im Katalog"
                    title="Frisch hinzugefügt"
                    description="Neue Lebensmittel, die auf ihre ersten Reviews und Rankings warten."
                    products={sections.newlyAdded.slice(0, 4)}
                    actionHref="/?sort=new"
                  />
                  <ProductShelf
                    eyebrow="Hall of Fame"
                    title="Starke Tiefkühlpizzen"
                    description="Ein klarer Callout für Pizza, ohne dass die Homepage nur noch Pizza ist."
                    products={sections.topPizza.slice(0, 4)}
                    actionHref="/?category=pizza&sort=best"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <NetworkPanel feedData={feedData} />
                <CategoryPanel />
              </div>
            </div>
          </>
        )}

        <p className="mt-10 text-center text-xs text-[#8CA1B8]">
          {isDiscoverMode
            ? `${browseProducts.length} Lebensmittel passen aktuell zu deiner Suche oder deinen Filtern.`
            : sections.hasLiveRatings
              ? "Highlights und Startseiten-Shelves greifen auf vorhandene Community-Bewertungen zurück."
              : "Solange noch wenige Live-Bewertungen vorliegen, mischt die Homepage kuratierte Standard-Highlights mit Community-Signalen."}
        </p>
      </div>
    </main>
  );
}
