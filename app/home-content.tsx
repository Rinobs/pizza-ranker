"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import ReviewLikeButton from "./components/ReviewLikeButton";
import MiniStars from "./components/MiniStars";
import { useToast, ToastContainer } from "./components/Toast";
import {
  FiArrowRight,
  FiBookmark,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiGrid,
  FiHeart,
  FiList,
  FiMessageSquare,
  FiStar,
  FiUsers,
} from "react-icons/fi";
import ProductCardImage from "./components/ProductCardImage";
import { useReviewLikes } from "./hooks/useReviewLikes";
import { useUserRatings } from "./hooks/useUserRatings";
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

type CatalogProduct = Product & {
  routeSlug?: string;
};

type DiscoverFallbackSuggestion = {
  routeSlug: string;
  name: string;
  brand: string | null;
  category: string;
  imageUrl: string | null;
  sourceUrl: string;
  searchScore: number;
};

type DiscoverFallbackResponse = {
  success: boolean;
  source: "database" | "open_food_facts" | "none";
  suggestions: DiscoverFallbackSuggestion[];
};

type DiscoverCatalogProductsResponse = {
  success: boolean;
  data?: CatalogProduct[];
  error?: string;
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

function toRankedProduct(product: CatalogProduct): RankedProduct {
  const routeSlug =
    typeof product.routeSlug === "string" && product.routeSlug.trim().length > 0
      ? product.routeSlug
      : getProductRouteSlug(product);

  return {
    name: product.name,
    category: product.category,
    routeSlug,
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
      className={`w-full min-w-0 rounded-xl border border-[#2A2A2A] bg-[linear-gradient(145deg,rgba(20,20,20,0.98),rgba(11,17,26,0.96))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.26)] sm:p-6 ${className}`}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#9A8F83]">{eyebrow}</p>
          <h2 className="mt-2 break-words text-2xl font-black tracking-tight text-[#FFF0E4]">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-2xl break-words text-sm leading-relaxed text-[#A89880]">
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


function SkeletonFeedCard() {
  return (
    <li className="animate-pulse rounded-lg border border-[#2A2A2A] bg-[#1C1C1C] p-4">
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 rounded-lg bg-[#1A2535] shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-3.5 bg-[#1A2535] rounded-full w-2/5" />
          <div className="h-3 bg-[#1A2535] rounded-full w-4/5" />
          <div className="h-3 bg-[#1A2535] rounded-full w-3/5" />
        </div>
        <div className="hidden sm:block h-36 w-28 rounded-md bg-[#1A2535] shrink-0" />
      </div>
    </li>
  );
}

function SkeletonListCard() {
  return (
    <li className="animate-pulse rounded-lg border border-[#2A2A2A] bg-[#1C1C1C] p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-lg bg-[#1A2535] shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-[#1A2535] rounded-full w-3/5" />
          <div className="h-3 bg-[#1A2535] rounded-full w-2/5" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="aspect-[0.72] rounded-md bg-[#1A2535]" />
        ))}
      </div>
    </li>
  );
}

function QuickRateStars({
  slug,
  currentRating,
  onRate,
}: {
  slug: string;
  currentRating?: number | null;
  onRate: (slug: string, value: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? currentRating ?? 0;

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHovered(null)}
      onClick={(e) => e.preventDefault()}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} Sterne`}
          onMouseEnter={() => setHovered(star)}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRate(slug, star);
          }}
          className="relative h-5 w-5 shrink-0 touch-manipulation"
        >
          <svg className="absolute inset-0 text-[#3A3A3A]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.54 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
          </svg>
          {star <= display && (
            <svg className="absolute inset-0 text-[#F6C85C]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.54 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

function ProductCard({
  product,
  eager = false,
  className = "",
  variant = "default",
  userRating,
  isLoggedIn = false,
  onQuickRate,
}: {
  product: RankedProduct;
  eager?: boolean;
  className?: string;
  variant?: "default" | "shelf";
  userRating?: number | null;
  isLoggedIn?: boolean;
  onQuickRate?: (slug: string, value: number) => void;
}) {
  const categoryAccent = getCategoryAccent(product.category);
  const isShelfCard = variant === "shelf";

  if (isShelfCard) {
    return (
      <div
        className={`group relative overflow-hidden rounded-lg border border-[#333333] bg-[#1E1E1E] shadow-[0_14px_34px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-1.5 ${categoryAccent.cardClass} ${className}`}
      >
        <Link
          href={`/produkt/${product.routeSlug}`}
          aria-label={`${product.name} öffnen`}
          className="absolute inset-0 z-[1] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5963C]"
        />

        <div className={`absolute inset-x-0 top-0 z-[2] h-1 ${categoryAccent.accentBarClass}`} />

        {userRating != null && (
          <span className="absolute right-3 top-3 z-[3] inline-flex items-center gap-1 rounded-full border border-[#5A2E08] bg-[#291808] px-2 py-1 text-[10px] font-semibold text-[#F5963C]">
            <FiCheck size={10} />
            {userRating.toFixed(1)}
          </span>
        )}

        <div
          title={product.category}
          className={`absolute left-3 top-3 z-[3] max-w-[calc(100%-4rem)] truncate rounded-full border px-2.5 py-1 text-[10px] font-semibold leading-none uppercase tracking-[0.16em] ${categoryAccent.badgeClass}`}
        >
          {product.category}
        </div>

        <div className="px-3 pb-1 pt-12 sm:px-4 sm:pt-14">
          <div className="relative z-[2] aspect-[0.75] overflow-hidden rounded-md border border-white/6 bg-[#141414]">
            <ProductCardImage
              routeSlug={product.routeSlug}
              alt={product.name}
              fallbackSrc={product.imageUrl}
              eager={eager}
              className="h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-105 sm:p-4"
            />
          </div>
        </div>

        <div className="relative z-[2] p-3 pt-2 sm:p-4 sm:pt-3">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-[1.2] text-white sm:text-[15px]">
            {product.name}
          </h3>
          {product.ratingAvg !== null ? (
            <div className="mt-2">
              <MiniStars rating={product.ratingAvg} count={product.ratingCount > 0 ? product.ratingCount : undefined} size="xs" />
            </div>
          ) : null}
          {isLoggedIn && onQuickRate ? (
            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.14em] text-[#9A8F83]">
                {userRating != null ? "Neu bewerten" : "Schnell bewerten"}
              </span>
              <QuickRateStars
                slug={product.routeSlug}
                currentRating={userRating}
                onRate={onQuickRate}
              />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative aspect-[0.8] overflow-hidden rounded-lg border border-[#333333] bg-[#1E1E1E] shadow-[0_14px_34px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-1.5 sm:aspect-[0.72] ${categoryAccent.cardClass} ${className}`}
    >
      <Link
        href={`/produkt/${product.routeSlug}`}
        aria-label={`${product.name} öffnen`}
        className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5963C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141414]"
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

      <div
        title={product.category}
        className={`absolute left-2.5 top-2.5 max-w-[calc(100%-1.25rem)] truncate rounded-full border px-2 py-1 text-[10px] font-semibold leading-none sm:left-3 sm:top-3 sm:max-w-[calc(100%-1.5rem)] sm:px-2.5 sm:uppercase sm:tracking-[0.16em] ${categoryAccent.badgeClass}`}
      >
        {product.category}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-2.5 sm:p-4">
        {userRating != null && (
          <span className="pointer-events-none mb-1.5 inline-flex items-center gap-1 rounded-full border border-[#5A2E08] bg-[#291808]/90 px-2 py-0.5 text-[10px] font-semibold text-[#F5963C]">
            <FiCheck size={9} />
            Bewertet
          </span>
        )}
        <h3 className="line-clamp-2 text-[12px] font-semibold leading-[1.2] text-white sm:text-[15px] lg:text-base">
          {product.name}
        </h3>
        {product.ratingAvg !== null ? (
          <div className="mt-1.5">
            <MiniStars rating={product.ratingAvg} size="xs" />
          </div>
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
  userRatings,
  isLoggedIn,
  onQuickRate,
}: {
  eyebrow: string;
  title: string;
  description: string;
  products: RankedProduct[];
  actionHref?: string;
  userRatings?: Record<string, number>;
  isLoggedIn?: boolean;
  onQuickRate?: (slug: string, value: number) => void;
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    updateScrollState();
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateScrollState, products]);

  function scrollCarousel(direction: "left" | "right") {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "right" ? el.clientWidth * 0.75 : -(el.clientWidth * 0.75), behavior: "smooth" });
  }

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
            className="inline-flex self-start items-center gap-3 rounded-full border border-[#E8750A]/35 bg-[linear-gradient(135deg,rgba(232,117,10,0.16),rgba(20,20,20,0.94))] px-3 py-2 text-sm font-semibold text-[#FFF0E4] shadow-[0_12px_28px_rgba(0,0,0,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#F5963C] hover:bg-[linear-gradient(135deg,rgba(232,117,10,0.24),rgba(20,20,20,0.98))] hover:shadow-[0_16px_34px_rgba(232,117,10,0.14)] sm:px-4 sm:py-2.5"
          >
            <span>Mehr sehen</span>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#F5963C]/35 bg-[#291808] text-[#CFFFE0]">
              <FiArrowRight size={15} />
            </span>
          </Link>
        ) : null
      }
    >
      <div className="relative">
        <div className="grid grid-cols-2 gap-3 sm:hidden">
          {products.map((product, index) => (
            <div key={`${title}-mobile-${product.routeSlug}`} className="min-w-0">
              <ProductCard
                product={product}
                eager={index < 2}
                variant="shelf"
                userRating={userRatings?.[product.routeSlug] ?? null}
                isLoggedIn={isLoggedIn}
                onQuickRate={onQuickRate}
              />
            </div>
          ))}
        </div>

        <div
          ref={carouselRef}
          onScroll={updateScrollState}
          className="home-shelf-carousel hidden gap-3 overflow-x-auto pb-3 pr-6 snap-x snap-proximity sm:flex sm:gap-4"
        >
          {products.map((product, index) => (
            <div
              key={`${title}-${product.routeSlug}`}
              className="w-44 min-w-0 shrink-0 snap-start sm:w-48"
            >
              <ProductCard
                product={product}
                eager={index < 4}
                variant="shelf"
                userRating={userRatings?.[product.routeSlug] ?? null}
                isLoggedIn={isLoggedIn}
                onQuickRate={onQuickRate}
              />
            </div>
          ))}
        </div>

        {canScrollLeft && (
          <div className="pointer-events-none absolute bottom-3 left-0 top-0 hidden w-20 bg-[linear-gradient(90deg,rgba(20,20,20,0.97)_30%,rgba(20,20,20,0))] sm:block" />
        )}
        <div className={`pointer-events-none absolute bottom-3 right-0 top-0 hidden w-20 bg-[linear-gradient(90deg,rgba(20,20,20,0),rgba(20,20,20,0.97)_70%)] sm:block transition-opacity ${canScrollRight ? "opacity-100" : "opacity-0"}`} />

        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollCarousel("left")}
            aria-label="Zurück scrollen"
            className="absolute left-2 top-1/2 z-30 hidden -translate-y-1/2 items-center justify-center rounded-full border border-[#444444] bg-[#242424]/95 p-2 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-[#333333] sm:flex"
          >
            <FiChevronLeft size={18} />
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollCarousel("right")}
            aria-label="Weiter scrollen"
            className="absolute right-2 top-1/2 z-30 hidden -translate-y-1/2 items-center justify-center rounded-full border border-[#444444] bg-[#242424]/95 p-2 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-[#333333] sm:flex"
          >
            <FiChevronRight size={18} />
          </button>
        )}
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
    <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#5A2E08] bg-[radial-gradient(circle_at_top,rgba(232,117,10,0.28),rgba(20,20,20,0.96)_70%)] text-sm font-black tracking-[0.12em] text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)]">
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
    <div className="rounded-lg border border-[#253548] bg-[#1C1C1C]/80 p-4">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#32455B] bg-[#141F2C] text-[#FFE4C8]">
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
    <li className="rounded-lg border border-[#2A2A2A] bg-[linear-gradient(145deg,rgba(20,20,20,0.96),rgba(12,18,27,0.98))] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#E8750A]/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={`/profil/${list.userId}`}>
            <MiniAvatar src={list.avatarUrl} name={list.username} />
          </Link>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-white">{list.name}</h3>
              <span className="rounded-full border border-[#333333] bg-[#222222] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#DDD0C4]">
                {list.itemCount} Produkte
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#9A8F83]">
              <Link
                href={`/profil/${list.userId}`}
                className="font-semibold text-[#D7E2EC] transition-colors hover:text-[#F5963C]"
              >
                {list.username}
              </Link>
              <span>aktualisiert {formatRelativeTime(list.updatedAt)}</span>
            </div>
          </div>
        </div>

        <FiBookmark className="shrink-0 text-[#9A8F83]" size={18} />
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
                <div className="relative overflow-hidden rounded-md border border-[#333333] bg-[#1C1C1C]" style={{ aspectRatio: "0.72" }}>
                  <ProductCardImage
                    routeSlug={item.routeSlug}
                    alt={item.name}
                    fallbackSrc={item.imageUrl}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-white transition-colors group-hover:text-[#F5963C]">
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
                className="rounded-full border border-[#333333] bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#DDD0C4] transition-colors hover:border-[#E8750A] hover:text-[#FFE4C8]"
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
          className: "border-[#5A2E08] bg-[#291808] text-[#FFE4C8]",
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
                className: "border-[#5A2E08] bg-[#221508] text-[#FFE4C8]",
              };

  return (
    <li className="min-w-0 overflow-hidden rounded-lg border border-[#2A2A2A] bg-[linear-gradient(145deg,rgba(20,20,20,0.96),rgba(12,18,27,0.98))] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#E8750A]/30">
      <div className="flex items-start gap-4">
        <Link href={profileHref}>
          <MiniAvatar src={activity.avatarUrl} name={activity.username} />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={profileHref}
              className="break-words font-semibold text-white transition-colors hover:text-[#F5963C]"
            >
              {activity.username}
            </Link>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${badge.className}`}
            >
              {badge.label}
            </span>
            <span className="text-xs uppercase tracking-[0.16em] text-[#9A8F83]">
              {formatRelativeTime(activity.createdAt)}
            </span>
          </div>

          <p className="mt-3 break-words text-sm leading-relaxed text-[#D7E2EC] sm:text-base">
            {activity.kind === "review" ? (
              <>
                hat eine Review zu{" "}
                <Link
                  href={productHref}
                  className="break-words font-semibold text-white transition-colors hover:text-[#F5963C]"
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
                  className="break-words font-semibold text-white transition-colors hover:text-[#F5963C]"
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
                  className="break-words font-semibold text-white transition-colors hover:text-[#F5963C]"
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
                  className="break-words font-semibold text-white transition-colors hover:text-[#F5963C]"
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
                  className="break-words font-semibold text-white transition-colors hover:text-[#F5963C]"
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

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#9A8F83]">
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
            <div className="mt-4 overflow-hidden rounded-md border border-[#333333] bg-[#0F1722]/92 p-4 text-sm leading-relaxed text-[#D3DFEB]">
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
          className={`relative hidden h-36 w-28 shrink-0 overflow-hidden rounded-md border bg-[#1C1C1C] shadow-[0_16px_36px_rgba(0,0,0,0.24)] sm:block lg:h-40 lg:w-32 ${categoryAccent.thumbClass}`}
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
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <FollowPreviewCluster previews={feedData.followingPreview} />
            <span className="rounded-full border border-[#333333] bg-[#1C1C1C] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#DDD0C4]">
              {feedData.followingCount} gefolgt
            </span>
          </div>
        ) : null
      }
      className="overflow-hidden"
    >
      {feedLoading ? (
        <ul className="grid min-w-0 gap-4">
          <SkeletonFeedCard />
          <SkeletonFeedCard />
          <SkeletonFeedCard />
        </ul>
      ) : feedError ? (
        <div className="rounded-lg border border-[#5E3340] bg-[#24131A] p-5 text-sm text-[#FFD8E1]">
          Der Following-Feed konnte gerade nicht geladen werden: {feedError}
        </div>
      ) : !feedData.viewerAuthenticated ? (
        <div className="grid gap-4 rounded-lg border border-[#2A2A2A] bg-[linear-gradient(135deg,rgba(232,117,10,0.08),rgba(20,20,20,0.98))] p-5 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h3 className="text-xl font-semibold text-white">Logge dich ein und baue dir deinen Feed</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#A89880]">
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
        <div className="rounded-lg border border-dashed border-[#5A2E08] bg-[#1C1C1C]/85 p-6">
          <p className="text-lg font-semibold text-white">Noch kein Following-Feed</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#A89880]">
            Du folgst noch niemandem. Sobald du im Profil ein paar Food-Accounts abonnierst,
            erscheinen hier deren letzte Ratings, Reviews, Favoriten und Watchlist-Updates.
          </p>
          <Link
            href="/profil"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#E8750A] bg-[#291808] px-4 py-2 text-sm font-semibold text-[#FFE4C8] transition-colors hover:bg-[#1E3A2A]"
          >
            Profile finden
            <FiArrowRight size={16} />
          </Link>
        </div>
      ) : !hasActivities ? (
        <div className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C] p-6">
          <p className="text-lg font-semibold text-white">Dein Feed wartet auf neue Aktivität</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#A89880]">
            Deine gefolgten Profile waren zuletzt ruhig. Sobald sie Produkte bewerten, Reviews
            schreiben oder Listen aktualisieren, taucht das hier automatisch auf.
          </p>
        </div>
      ) : (
        <>
          {categoryOptions.length > 1 ? (
            <div className="mb-5 min-w-0">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#9A8F83]">
                  Kategorie filtern
                </p>
                <p className="text-xs text-[#9A8F83]">
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
                      ? "border-[#E8750A] bg-[#291808] text-[#FFE4C8]"
                      : "border-[#333333] bg-[#1C1C1C] text-[#DDD0C4] hover:border-[#E8750A] hover:text-white"
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
            <ul className="grid min-w-0 gap-4">
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
            <div className="rounded-lg border border-dashed border-[#5A2E08] bg-[#1C1C1C]/85 p-6">
              <p className="text-lg font-semibold text-white">
                Keine Feed-Einträge für {resolvedCategoryFilter}
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#A89880]">
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
          <span className="rounded-full border border-[#333333] bg-[#1C1C1C] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#DDD0C4]">
            {topListsData.lists.length} Listen
          </span>
        ) : null
      }
      className="overflow-hidden"
    >
      {topListsLoading ? (
        <ul className="grid gap-4">
          <SkeletonListCard />
          <SkeletonListCard />
        </ul>
      ) : topListsError ? (
        <div className="rounded-lg border border-[#5E3340] bg-[#24131A] p-5 text-sm text-[#FFD8E1]">
          Die Top-Listen konnten gerade nicht geladen werden: {topListsError}
        </div>
      ) : topListsData.lists.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#5A2E08] bg-[#1C1C1C]/85 p-6">
          <p className="text-lg font-semibold text-white">Noch keine Community-Listen</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#A89880]">
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
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#F5963C] transition-colors hover:text-[#B7FFD0]"
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
        <div className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C] p-4 text-sm leading-relaxed text-[#A89880]">
          Nach dem Login kannst du andere Profile finden, ihnen folgen und dir so einen
          persönlichen Startseiten-Feed aufbauen.
        </div>
      ) : feedData.followingCount === 0 ? (
        <div className="rounded-lg border border-dashed border-[#5A2E08] bg-[#1C1C1C] p-4">
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
              className="flex items-center justify-between gap-3 rounded-md border border-[#2A2A2A] bg-[#1C1C1C] p-3.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <MiniAvatar src={profile.avatarUrl} name={profile.username} />
                <div className="min-w-0">
                  <Link
                    href={`/profil/${profile.userId}`}
                    className="truncate font-semibold text-white transition-colors hover:text-[#F5963C]"
                  >
                    {profile.username}
                  </Link>
                  <p className="mt-1 text-xs text-[#9A8F83]">
                    gefolgt {formatRelativeTime(profile.followedAt)}
                  </p>
                </div>
              </div>
              <FiUsers className="shrink-0 text-[#9A8F83]" size={16} />
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/profil"
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#F5963C] transition-colors hover:text-[#B7FFD0]"
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
      <div className="grid gap-2.5 sm:gap-3">
        {CATEGORY_NAV_ITEMS.map((category) => {
          const accent = getCategoryAccent(category.name);

          return (
            <Link
              key={category.slug}
              href={category.href}
              className={`group flex items-start gap-2.5 rounded-md border p-3 transition-all duration-300 hover:-translate-y-1 sm:gap-3 sm:rounded-md sm:p-4 ${accent.navCardClass}`}
            >
              <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xl leading-none sm:h-12 sm:w-12 sm:rounded-lg sm:text-2xl ${accent.iconWrapClass}`}>
                {category.icon}
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold text-white transition-colors sm:text-base ${accent.navTitleClass}`}>
                  {category.name}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#9A8F83] sm:text-sm">
                  {category.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}

function CategoryStrip() {
  return (
    <div className="mt-5 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      {CATEGORY_NAV_ITEMS.map((category) => {
        const accent = getCategoryAccent(category.name);
        return (
          <Link
            key={category.slug}
            href={category.href}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 ${accent.navCardClass}`}
          >
            <span className="text-base leading-none">{category.icon}</span>
            <span>{category.shortName}</span>
          </Link>
        );
      })}
    </div>
  );
}

function JoinBanner() {
  return (
    <div className="rounded-lg border border-[#333333] bg-[#1C1C1C] px-5 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-white">Bau deinen persönlichen Feed</p>
          <p className="mt-1 text-sm text-[#9A8F83]">
            Nach dem Login siehst du hier Ratings, Reviews und Listen von Profilen, denen du folgst.
          </p>
        </div>
        <Link
          href="/api/auth/signin"
          className="shrink-0 inline-flex items-center gap-2 rounded-full bg-[#E8750A] px-5 py-2.5 text-sm font-semibold text-[#1A0E04] transition-colors hover:bg-[#F5963C]"
        >
          Einloggen
          <FiArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}

function HomeHero({
  heroProducts,
  catalogProductCount,
  ratedProductCount,
  totalRatingCount,
  feedData,
  isLoading,
  hasLiveRatings,
  userRatings,
  isLoggedIn,
  onQuickRate,
}: {
  heroProducts: RankedProduct[];
  catalogProductCount: number;
  ratedProductCount: number;
  totalRatingCount: number;
  feedData: HomeFeedData;
  isLoading: boolean;
  hasLiveRatings: boolean;
  userRatings?: Record<string, number>;
  isLoggedIn?: boolean;
  onQuickRate?: (slug: string, value: number) => void;
}) {
  const heroShelfEyebrow = hasLiveRatings ? "Top bewertet diese Woche" : "Aktuelle Highlights";
  const heroShelfDescription = hasLiveRatings
    ? "Diese Auswahl basiert auf den aktuell stärksten Community-Bewertungen der Woche."
    : "Diese Auswahl zeigt dir zum Start die spannendsten Produkte im aktuellen Katalog.";

  return (
    <section className="overflow-hidden rounded-xl border border-[#333333] bg-[radial-gradient(circle_at_top_left,rgba(232,117,10,0.16),rgba(12,12,12,0.98)_38%),radial-gradient(circle_at_top_right,rgba(255,216,108,0.08),transparent_34%),linear-gradient(145deg,rgba(20,20,20,0.99),rgba(10,10,10,0.97))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.34)] sm:rounded-xl sm:p-8 lg:p-10">
      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-[#9CC9AE]">
            Das Food-Diary für Ratings und Reviews
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-[#F6FFF8] sm:text-5xl lg:text-6xl">
            Bewerte Lebensmittel, bau deine Listen und bleib nah dran, was andere probieren.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-[#C9D8E7] sm:text-lg">
            Tiefkühlpizza, Chips, Eis, Proteinriegel — alles bewertbar, alles diskutierbar.
            Folge Menschen mit ähnlichem Geschmack und entdecke, was wirklich lohnt.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/?sort=best"
              className="inline-flex items-center gap-2 rounded-full bg-[#E8750A] px-5 py-3 text-sm font-semibold text-[#1A0E04] transition-colors hover:bg-[#F5963C]"
            >
              Beste Lebensmittel entdecken
              <FiArrowRight size={16} />
            </Link>
            <Link
              href="/profil"
              className="inline-flex items-center gap-2 rounded-full border border-[#333333] bg-[#1E1E1E] px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-[#E8750A] hover:text-[#FFE4C8]"
            >
              Profil und Feed aufbauen
              <FiUsers size={16} />
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5 text-sm">
            <span className="rounded-full border border-[#5A2E08] bg-[#291808] px-4 py-2 font-semibold text-[#FFE4C8]">
              {catalogProductCount}+ Lebensmittel im Katalog
            </span>
            <span className="rounded-full border border-[#333333] bg-[#1C1C1C]/90 px-4 py-2 font-semibold text-[#DDD0C4]">
              {CATEGORY_NAV_ITEMS.length} Kategorien
            </span>
            <span className="rounded-full border border-[#333333] bg-[#1C1C1C]/90 px-4 py-2 font-semibold text-[#DDD0C4]">
              {ratedProductCount > 0
                ? `${formatCompactCount(ratedProductCount)} Produkte mit Score`
                : "Neue Bewertungen willkommen"}
            </span>
            <span className="rounded-full border border-[#333333] bg-[#1C1C1C]/90 px-4 py-2 font-semibold text-[#DDD0C4]">
              {feedData.followingCount > 0
                ? `${feedData.followingCount} Profile im Feed`
                : "Folgen schaltet Feed frei"}
            </span>
          </div>

          <p className="mt-5 text-sm text-[#9A8F83]">
            {isLoading
              ? "Highlights werden geladen..."
              : hasLiveRatings
                ? `${formatCompactCount(totalRatingCount)} Live-Bewertungen prägen die aktuellen Highlights.`
                : "Sobald mehr Live-Bewertungen vorhanden sind, werden die Highlights noch persönlicher."}
          </p>
        </div>

        <div className="rounded-xl border border-[#2A2A2A] bg-[linear-gradient(145deg,rgba(15,22,32,0.92),rgba(10,16,24,0.94))] p-4 shadow-[0_22px_50px_rgba(0,0,0,0.24)] sm:p-5">
          <div className="mb-4">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFF0E4] sm:text-base">
              {heroShelfEyebrow}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#DDD0C4] sm:text-[15px]">
              {heroShelfDescription}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4">
            {heroProducts.map((product, index) => (
              <ProductCard
                key={`hero-${product.routeSlug}`}
                product={product}
                eager={index < 2}
                userRating={userRatings?.[product.routeSlug] ?? null}
                isLoggedIn={isLoggedIn}
                onQuickRate={onQuickRate}
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
  const { user: ratingUser, ratings: userRatings, saveRating } = useUserRatings();
  const isLoggedIn = Boolean(ratingUser);
  const { toasts, showToast, dismissToast } = useToast();

  async function handleQuickRate(slug: string, value: number) {
    const result = await saveRating(slug, value);
    if (result.success) {
      showToast(`${value} ★ gespeichert!`);
    } else {
      showToast(result.error || "Bewertung fehlgeschlagen.", "error");
    }
  }
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
  const [discoverFallbackSuggestions, setDiscoverFallbackSuggestions] = useState<
    DiscoverFallbackSuggestion[]
  >([]);
  const [discoverFallbackSource, setDiscoverFallbackSource] = useState<
    "database" | "open_food_facts" | "none"
  >("none");
  const [discoverFallbackLoading, setDiscoverFallbackLoading] = useState(false);
  const [importedCatalogProducts, setImportedCatalogProducts] = useState<CatalogProduct[]>([]);

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

  useEffect(() => {
    let cancelled = false;

    async function loadImportedCatalogProducts() {
      try {
        const response = await fetch("/api/discover/catalog-products", {
          cache: "no-store",
        });
        const json = (await response.json()) as DiscoverCatalogProductsResponse;

        if (cancelled || !response.ok || !json.success) {
          return;
        }

        setImportedCatalogProducts(Array.isArray(json.data) ? json.data : []);
      } catch {
        if (!cancelled) {
          setImportedCatalogProducts([]);
        }
      }
    }

    void loadImportedCatalogProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const mergedCatalogProducts = useMemo(() => {
    const seen = new Set<string>();
    const merged: CatalogProduct[] = [];
    const catalogProducts: CatalogProduct[] = [
      ...ALL_PRODUCTS,
      ...[...importedCatalogProducts].reverse(),
    ];

    for (const product of catalogProducts) {
      const routeSlug =
        typeof product.routeSlug === "string" && product.routeSlug.trim().length > 0
          ? product.routeSlug
          : getProductRouteSlug(product);

      if (seen.has(routeSlug)) {
        continue;
      }

      seen.add(routeSlug);
      merged.push({
        ...product,
        routeSlug,
      });
    }

    return merged;
  }, [importedCatalogProducts]);

  useEffect(() => {
    let cancelled = false;

    if (searchQuery.length < 2) {
      setDiscoverFallbackSuggestions([]);
      setDiscoverFallbackSource("none");
      setDiscoverFallbackLoading(false);
      return () => {
        cancelled = true;
      };
    }

    async function loadDiscoverFallback() {
      setDiscoverFallbackLoading(true);

      try {
        const params = new URLSearchParams({ q: searchQuery });
        if (selectedCategory !== "all") {
          params.set("category", selectedCategory);
        }

        const response = await fetch(`/api/discover/search?${params.toString()}`, {
          cache: "no-store",
        });
        const json = (await response.json()) as DiscoverFallbackResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok || !json.success) {
          setDiscoverFallbackSuggestions([]);
          setDiscoverFallbackSource("none");
          return;
        }

        setDiscoverFallbackSuggestions(json.suggestions ?? []);
        setDiscoverFallbackSource(json.source ?? "none");
      } catch {
        if (!cancelled) {
          setDiscoverFallbackSuggestions([]);
          setDiscoverFallbackSource("none");
        }
      } finally {
        if (!cancelled) {
          setDiscoverFallbackLoading(false);
        }
      }
    }

    void loadDiscoverFallback();

    return () => {
      cancelled = true;
    };
  }, [searchQuery, selectedCategory]);

  const browseProducts = useMemo(() => {
    const items: BrowseProduct[] = [];

    for (const [index, product] of mergedCatalogProducts.entries()) {
      if (selectedCategory !== "all" && product.slug !== selectedCategory) {
        continue;
      }

      const routeSlug = product.routeSlug ?? getProductRouteSlug(product);
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
  }, [mergedCatalogProducts, ratingStats, searchQuery, selectedCategory, sortMode]);

  const importedBrowseProducts = useMemo(() => {
    if (searchQuery.length < 2 || discoverFallbackSource !== "database") {
      return [] as BrowseProduct[];
    }

    return discoverFallbackSuggestions.map((suggestion) => ({
      name: suggestion.name,
      category: suggestion.category,
      routeSlug: suggestion.routeSlug,
      imageUrl: suggestion.imageUrl || "",
      ratingAvg: ratingStats[suggestion.routeSlug]?.ratingAvg ?? null,
      ratingCount: ratingStats[suggestion.routeSlug]?.ratingCount ?? 0,
      weekRatingAvg: null,
      weekRatingCount: 0,
      newIndex: -1,
      searchScore: suggestion.searchScore,
      priceValue: null,
    }));
  }, [discoverFallbackSource, discoverFallbackSuggestions, ratingStats, searchQuery.length]);

  const displayedBrowseProducts = useMemo(() => {
    if (importedBrowseProducts.length === 0) {
      return browseProducts;
    }

    const merged = [...browseProducts];
    const seen = new Set(merged.map((product) => product.routeSlug));

    for (const product of importedBrowseProducts) {
      if (!seen.has(product.routeSlug)) {
        merged.push(product);
      }
    }

    merged.sort((left, right) => {
      if (searchQuery && left.searchScore !== right.searchScore) {
        return right.searchScore - left.searchScore;
      }

      return compareByDiscoverSort(left, right, sortMode);
    });

    return merged;
  }, [browseProducts, importedBrowseProducts, searchQuery, sortMode]);

  const openFoodFactsSuggestions = useMemo(() => {
    if (
      searchQuery.length < 2 ||
      browseProducts.length > 0 ||
      importedBrowseProducts.length > 0 ||
      discoverFallbackSource !== "open_food_facts"
    ) {
      return [] as RankedProduct[];
    }

    return discoverFallbackSuggestions.map((suggestion) => ({
      name: suggestion.name,
      category: suggestion.category,
      routeSlug: suggestion.routeSlug,
      imageUrl: suggestion.imageUrl || "",
      ratingAvg: null,
      ratingCount: 0,
      weekRatingAvg: null,
      weekRatingCount: 0,
    }));
  }, [
    browseProducts.length,
    discoverFallbackSource,
    discoverFallbackSuggestions,
    importedBrowseProducts.length,
    searchQuery.length,
  ]);

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

  const unratedSuggestions = useMemo((): RankedProduct[] => {
    if (!isLoggedIn || !userRatings || Object.keys(userRatings).length === 0) return [];

    const ratedSlugs = new Set(Object.keys(userRatings));

    // Categories the user has already rated
    const ratedCategories = new Set<string>();
    for (const slug of ratedSlugs) {
      const product = mergedCatalogProducts.find((p) => p.routeSlug === slug);
      if (product?.category) ratedCategories.add(product.category);
    }
    if (ratedCategories.size === 0) return [];

    const suggestions: RankedProduct[] = [];
    for (const product of mergedCatalogProducts) {
      const slug = product.routeSlug ?? getProductRouteSlug(product);
      if (ratedSlugs.has(slug)) continue;
      if (!ratedCategories.has(product.category)) continue;
      const stats = ratingStats[slug];
      suggestions.push({
        name: product.name,
        category: product.category,
        routeSlug: slug,
        imageUrl: getProductImageUrl(product),
        ratingAvg: stats?.ratingAvg ?? null,
        ratingCount: stats?.ratingCount ?? 0,
        weekRatingAvg: null,
        weekRatingCount: 0,
      });
    }

    suggestions.sort((a, b) => (b.ratingAvg ?? -1) - (a.ratingAvg ?? -1));
    return suggestions.slice(0, 8);
  }, [isLoggedIn, userRatings, mergedCatalogProducts, ratingStats]);

  const [discoverView, setDiscoverView] = useState<"grid" | "list">("grid");

  const sortLabel =
    DISCOVER_SORT_OPTIONS.find((option) => option.value === sortMode)?.label ?? "Beliebt";
  const activeCategory =
    selectedCategory === "all" ? null : getCategoryNavigationItem(selectedCategory);

  return (
    <>
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(232,117,10,0.06),transparent_24%),linear-gradient(180deg,#141414_0%,#141414_52%,#141414_100%)] px-4 pb-24 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        {isDiscoverMode ? (
          <>
            <section className="rounded-xl border border-[#2A2A2A] bg-[radial-gradient(circle_at_top_left,rgba(232,117,10,0.1),rgba(20,20,20,0.98)_42%),linear-gradient(145deg,rgba(20,20,20,0.98),rgba(14,14,14,0.97))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)] sm:p-8">
              <p className="text-xs uppercase tracking-[0.24em] text-[#9CC9AE]">
                Lebensmittel entdecken
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-[#FFF0E4] sm:text-4xl">
                Finde Produkte, die du als Nächstes bewerten willst.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#C9D8E7] sm:text-base">
                Suche gezielt nach Produkten, filtere nach Kategorie und sortiere nach dem, was
                dir wichtig ist — Bewertung, Beliebtheit oder Neuheit.
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
                <span className="rounded-full border border-[#333333] bg-[#222222] px-3 py-1.5 text-[#C4B8AC]">
                  {displayedBrowseProducts.length} Treffer
                </span>
                {activeCategory ? (
                  <span className="rounded-full border border-[#E8750A]/35 bg-[#291808] px-3 py-1.5 text-[#FFE4C8]">
                    {activeCategory.shortName}
                  </span>
                ) : null}
                {searchQuery ? (
                  <span className="rounded-full border border-[#37506A] bg-[#132132] px-3 py-1.5 text-[#D9ECFF]">
                    Suche aktiv
                  </span>
                ) : null}
                <span className="rounded-full border border-[#333333] bg-[#222222] px-3 py-1.5 text-[#C4B8AC]">
                  Sortierung: {sortLabel}
                </span>
                {openFoodFactsSuggestions.length > 0 ? (
                  <span className="rounded-full border border-[#5A2E08] bg-[#221508] px-3 py-1.5 text-[#FFE4C8]">
                    {openFoodFactsSuggestions.length} OFF-Vorschläge
                  </span>
                ) : null}
              </div>
            </section>

            <section className="mt-8">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#9A8F83]">
                    Ergebnisse
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-[#FFF0E4] sm:text-3xl">
                    {searchQuery ? `Treffer für "${searchQuery}"` : "Gefilterte Produkte"}
                  </h2>
                  <p className="mt-2 text-sm text-[#A89880]">
                    {activeCategory
                      ? `${activeCategory.name} gefiltert, sortiert nach ${sortLabel}.`
                      : `Alle Lebensmittel, sortiert nach ${sortLabel}.`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {!statsLoaded && (
                    <span className="text-sm text-[#9A8F83]">Lade Bewertungsdaten...</span>
                  )}
                  <div className="flex rounded-lg border border-[#333333] bg-[#1C1C1C] p-0.5">
                    <button
                      type="button"
                      onClick={() => setDiscoverView("grid")}
                      title="Kachelansicht"
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                        discoverView === "grid"
                          ? "bg-[#333333] text-white"
                          : "text-[#9A8F83] hover:text-white"
                      }`}
                    >
                      <FiGrid size={15} />
                      <span className="hidden sm:inline">Kacheln</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscoverView("list")}
                      title="Listenansicht"
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                        discoverView === "list"
                          ? "bg-[#333333] text-white"
                          : "text-[#9A8F83] hover:text-white"
                      }`}
                    >
                      <FiList size={15} />
                      <span className="hidden sm:inline">Liste</span>
                    </button>
                  </div>
                </div>
              </div>

              {displayedBrowseProducts.length > 0 ? (
                discoverView === "grid" ? (
                  <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                    {displayedBrowseProducts.map((product, index) => (
                      <ProductCard
                        key={`browse-${product.routeSlug}`}
                        product={product}
                        eager={index < 4}
                        userRating={userRatings?.[product.routeSlug] ?? null}
                        isLoggedIn={isLoggedIn}
                        onQuickRate={handleQuickRate}
                      />
                    ))}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {displayedBrowseProducts.map((product, index) => {
                      const accent = getCategoryAccent(product.category);
                      const rated = userRatings?.[product.routeSlug] ?? null;
                      return (
                        <li key={`list-${product.routeSlug}`} className="flex items-center gap-3 rounded-lg border border-[#2A2A2A] bg-[#1C1C1C] px-4 py-3 transition-colors hover:border-[#333333]">
                          <span className="w-7 shrink-0 text-center text-sm font-bold tabular-nums text-[#9A8F83]">
                            {index + 1}
                          </span>
                          <Link href={`/produkt/${product.routeSlug}`} className="shrink-0">
                            <div className="relative h-14 w-11 overflow-hidden rounded-md border border-[#333333] bg-[#141414]">
                              <ProductCardImage
                                routeSlug={product.routeSlug}
                                alt={product.name}
                                fallbackSrc={product.imageUrl}
                                className="h-full w-full object-contain p-1"
                              />
                            </div>
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/produkt/${product.routeSlug}`}
                              className="line-clamp-1 font-semibold text-white transition-colors hover:text-[#F5963C]"
                            >
                              {product.name}
                            </Link>
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${accent.subtleBadgeClass}`}>
                              {product.category}
                            </span>
                          </div>
                          <div className="shrink-0 text-right">
                            {product.ratingAvg !== null ? (
                              <MiniStars rating={product.ratingAvg} count={product.ratingCount > 0 ? product.ratingCount : undefined} size="xs" />
                            ) : (
                              <span className="text-xs text-[#9A8F83]">Kein Score</span>
                            )}
                            {rated !== null && (
                              <div className="mt-1 flex items-center justify-end gap-1 text-[11px] font-semibold text-[#F5963C]">
                                <FiCheck size={10} />
                                {rated.toFixed(1)} ★
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : discoverFallbackLoading && searchQuery.length >= 2 ? (
                <div className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/90 p-6 text-[#C4D0DE]">
                  <p>Wir erweitern deine Suche gerade mit externen Produktdaten...</p>
                </div>
              ) : openFoodFactsSuggestions.length > 0 ? (
                <div className="space-y-5">
                  <div className="rounded-lg border border-[#5A2E08] bg-[#1E1E1E] p-5 text-[#DDD0C4]">
                    <p className="text-sm leading-relaxed">
                      Im eigenen Katalog gibt es noch keine passenden Treffer. Diese Vorschläge
                      kommen über Open Food Facts. Beim Öffnen übernehmen wir das Produkt
                      automatisch in die eigene Datenbank.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                    {openFoodFactsSuggestions.map((product, index) => (
                      <ProductCard
                        key={`off-${product.routeSlug}`}
                        product={product}
                        eager={index < 4}
                        userRating={userRatings?.[product.routeSlug] ?? null}
                        isLoggedIn={isLoggedIn}
                        onQuickRate={handleQuickRate}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-[#2A2A2A] bg-[#1C1C1C]/90 p-6 text-[#C4D0DE]">
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
                      className="inline-flex items-center rounded-full bg-[#E8750A] px-4 py-2 text-sm font-semibold text-[#1A0E04] transition-colors hover:bg-[#F5963C]"
                    >
                      Produkt vorschlagen
                    </Link>
                    <Link
                      href="/"
                      className="inline-flex items-center rounded-full border border-[#333333] bg-[#222222] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-[#E8750A] hover:text-[#FFE4C8]"
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
              catalogProductCount={ALL_PRODUCTS.length + importedCatalogProducts.length}
              ratedProductCount={ratedProductCount}
              totalRatingCount={totalRatingCount}
              feedData={feedData}
              isLoading={isLoading}
              hasLiveRatings={sections.hasLiveRatings}
              userRatings={userRatings}
              isLoggedIn={isLoggedIn}
              onQuickRate={handleQuickRate}
            />

            {/* ① Kategorie-Schnellzugriff */}
            <CategoryStrip />

            {/* Community-Feed + Sidebar */}
            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.65fr)]">
              <div className="min-w-0">
                {!feedData.viewerAuthenticated ? (
                  <JoinBanner />
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setCommunityTab("feed")}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                          communityTab === "feed"
                            ? "border-[#E8750A] bg-[#291808] text-[#FFE4C8]"
                            : "border-[#333333] bg-[#1E1E1E] text-white hover:border-[#E8750A]"
                        }`}
                      >
                        Following Feed
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommunityTab("top-lists")}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                          communityTab === "top-lists"
                            ? "border-[#E8750A] bg-[#291808] text-[#FFE4C8]"
                            : "border-[#333333] bg-[#1E1E1E] text-white hover:border-[#E8750A]"
                        }`}
                      >
                        Top-Listen
                      </button>
                    </div>

                    <div className="relative">
                      <div
                        className={`transition-all duration-300 ${communityTab === "feed" ? "opacity-100 translate-y-0" : "pointer-events-none absolute inset-0 opacity-0 -translate-y-1"}`}
                      >
                        <FeedPanel
                          feedData={feedData}
                          feedLoading={feedLoading}
                          feedError={feedError}
                        />
                      </div>
                      <div
                        className={`transition-all duration-300 ${communityTab === "top-lists" ? "opacity-100 translate-y-0" : "pointer-events-none absolute inset-0 opacity-0 -translate-y-1"}`}
                      >
                        <TopListsPanel
                          topListsData={topListsData}
                          topListsLoading={topListsLoading}
                          topListsError={topListsError}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="min-w-0 space-y-6">
                <NetworkPanel feedData={feedData} />
              </div>
            </div>

            {/* ① Full-width Product Shelves */}
            <div className="mt-8 space-y-6">
              <ProductShelf
                eyebrow="Community Favoriten"
                title="Beste Bewertungen der Woche"
                description="Produkte mit den stärksten aktuellen Scores und Momentum."
                products={sections.bestThisWeek.slice(0, 8)}
                actionHref="/?sort=best"
                userRatings={userRatings}
                isLoggedIn={isLoggedIn}
                onQuickRate={handleQuickRate}
              />
              <ProductShelf
                eyebrow="Momentum"
                title="Trendet gerade"
                description="Das bespricht und bewertet die Community momentan besonders häufig."
                products={sections.trending.slice(0, 8)}
                actionHref="/?sort=popular"
                userRatings={userRatings}
                isLoggedIn={isLoggedIn}
                onQuickRate={handleQuickRate}
              />
              <ProductShelf
                eyebrow="Neu im Katalog"
                title="Frisch hinzugefügt"
                description="Neue Lebensmittel, die auf ihre ersten Reviews und Rankings warten."
                products={sections.newlyAdded.slice(0, 8)}
                actionHref="/?sort=new"
                userRatings={userRatings}
                isLoggedIn={isLoggedIn}
                onQuickRate={handleQuickRate}
              />
              <ProductShelf
                eyebrow="Hall of Fame"
                title="Starke Tiefkühlpizzen"
                description="Die besten Tiefkühlpizzen, gewählt von der Community."
                products={sections.topPizza.slice(0, 8)}
                actionHref="/?category=pizza&sort=best"
                userRatings={userRatings}
                isLoggedIn={isLoggedIn}
                onQuickRate={handleQuickRate}
              />
              {unratedSuggestions.length > 0 && (
                <ProductShelf
                  eyebrow="Für dich"
                  title="Noch nicht bewertet"
                  description="Produkte aus deinen Kategorien, die du noch nicht bewertet hast — mit den höchsten Community-Scores zuerst."
                  products={unratedSuggestions}
                  userRatings={userRatings}
                  isLoggedIn={isLoggedIn}
                  onQuickRate={handleQuickRate}
                />
              )}
            </div>
          </>
        )}

        <p className="mt-10 text-center text-xs text-[#9A8F83]">
          {isDiscoverMode
            ? openFoodFactsSuggestions.length > 0
              ? `${openFoodFactsSuggestions.length} Vorschläge kommen aktuell direkt von Open Food Facts.`
              : `${displayedBrowseProducts.length} Lebensmittel passen aktuell zu deiner Suche oder deinen Filtern.`
            : sections.hasLiveRatings
              ? "Highlights und Startseiten-Shelves greifen auf vorhandene Community-Bewertungen zurück."
              : "Solange noch wenige Live-Bewertungen vorliegen, mischt die Homepage kuratierte Standard-Highlights mit Community-Signalen."}
        </p>
      </div>
    </main>
    <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
