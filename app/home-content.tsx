"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import {
  FiArrowRight,
  FiHeart,
  FiMessageSquare,
  FiStar,
  FiUsers,
} from "react-icons/fi";
import ProductCardImage from "./components/ProductCardImage";
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
  kind: "rating" | "review" | "favorite" | "want_to_try";
  userId: string;
  username: string;
  avatarUrl: string | null;
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
}: {
  product: RankedProduct;
  eager?: boolean;
}) {
  return (
    <Link
      href={`/produkt/${product.routeSlug}`}
      className="group relative overflow-hidden rounded-[24px] border border-[#2D3A4B] bg-[#131B26] shadow-[0_14px_34px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#5EE287] hover:shadow-[0_20px_44px_rgba(34,197,94,0.18)]"
      style={{ aspectRatio: "0.72" }}
    >
      <ProductCardImage
        routeSlug={product.routeSlug}
        alt={product.name}
        fallbackSrc={product.imageUrl}
        eager={eager}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/28 to-transparent" />

      <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-[#0D1420]/88 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#DCE9F5]">
        {product.category}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-white sm:text-base">
          {product.name}
        </h3>
        <div className="mt-2 flex items-center gap-2 text-xs sm:text-sm">
          {product.ratingAvg !== null ? (
            <span className="rounded-full border border-[#5A4B1A] bg-[#271F0E]/88 px-2.5 py-1 font-semibold text-[#FFD86C]">
              {formatRatingValue(product.ratingAvg)} / 5
            </span>
          ) : (
            <span className="rounded-full border border-[#2D3A4B] bg-[#121A26]/88 px-2.5 py-1 font-semibold text-[#BFD0E2]">
              Noch kein Score
            </span>
          )}
          <span className="text-[#D0DCE7]">
            {product.ratingCount > 0
              ? `${product.ratingCount} Bewertungen`
              : "Sei die erste Meinung"}
          </span>
        </div>
      </div>
    </Link>
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
            className="inline-flex items-center gap-2 rounded-full border border-[#2D3A4B] bg-[#121B27] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-[#5EE287] hover:text-[#D9FFE6]"
          >
            Mehr sehen
            <FiArrowRight size={16} />
          </Link>
        ) : null
      }
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {products.map((product, index) => (
          <ProductCard
            key={`${title}-${product.routeSlug}`}
            product={product}
            eager={index < 2}
          />
        ))}
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

function ActivityCard({ activity }: { activity: FeedActivity }) {
  const productHref = `/produkt/${activity.product.routeSlug}`;
  const profileHref = `/profil/${activity.userId}`;
  const ratingLabel = formatRatingValue(activity.rating);

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
          : {
              label: "Watchlist",
              className: "border-[#37506A] bg-[#132132] text-[#D9ECFF]",
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
            ) : (
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
            )}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#8CA1B8]">
            <span className="rounded-full border border-[#2D3A4B] bg-[#101822] px-2.5 py-1">
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
        </div>

        <Link
          href={productHref}
          className="relative hidden h-28 w-20 shrink-0 overflow-hidden rounded-[18px] border border-[#2D3A4B] bg-[#101822] sm:block"
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
  const hasActivities = feedData.activities.length > 0;

  return (
    <Panel
      eyebrow="Following Feed"
      title="Was dein Netzwerk zuletzt probiert hat"
      description="Wenn du Profilen folgst, wird die Startseite zu deinem persoenlichen Food-Diary mit Reviews, Ratings und Listen-Aktivitaet."
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
              Folge anderen Food-Profilen und sieh hier sofort, welche Tiefkuehlpizza,
              Proteinriegel oder Snacks zuletzt bewertet, kommentiert oder gemerkt wurden.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
            <FeatureTile
              icon={<FiStar size={18} />}
              title="Ratings"
              description="Sterne zeigen schnell, was wirklich ueberzeugt."
            />
            <FeatureTile
              icon={<FiMessageSquare size={18} />}
              title="Reviews"
              description="Kommentare geben Geschmack, Kontext und Vergleiche."
            />
            <FeatureTile
              icon={<FiUsers size={18} />}
              title="Netzwerk"
              description="Mit Follows wird die Startseite persoenlich und lebendig."
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
          <p className="text-lg font-semibold text-white">Dein Feed wartet auf neue Aktivitaet</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#AFC1D3]">
            Deine gefolgten Profile waren zuletzt ruhig. Sobald sie Produkte bewerten, Reviews
            schreiben oder Listen aktualisieren, taucht das hier automatisch auf.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4">
          {feedData.activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function NetworkPanel({ feedData }: { feedData: HomeFeedData }) {
  return (
    <Panel
      eyebrow="Netzwerk"
      title="Deine Community"
      description="FoodRanker wird mit Follows am spannendsten. Dann bekommst du statt einer statischen Startseite echte Aktivitaet aus deinem Kreis."
    >
      {!feedData.viewerAuthenticated ? (
        <div className="rounded-[24px] border border-[#2A394B] bg-[#101822] p-4 text-sm leading-relaxed text-[#AFC1D3]">
          Nach dem Login kannst du andere Profile finden, ihnen folgen und dir so einen
          persoenlichen Startseiten-Feed aufbauen.
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
      description="Die Homepage zeigt schon direkt, dass es hier um bewertbare Lebensmittel geht: von Tiefkuehlpizza bis Proteinpulver."
    >
      <div className="grid gap-3">
        {CATEGORY_NAV_ITEMS.map((category) => (
          <Link
            key={category.slug}
            href={category.href}
            className="group flex items-start gap-3 rounded-[22px] border border-[#2A394B] bg-[#101822] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#5EE287]/35"
          >
            <span className="text-2xl leading-none">{category.icon}</span>
            <div className="min-w-0">
              <p className="font-semibold text-white transition-colors group-hover:text-[#8AF5AC]">
                {category.name}
              </p>
              <p className="mt-1 text-sm text-[#8CA1B8]">{category.description}</p>
            </div>
          </Link>
        ))}
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
  return (
    <section className="overflow-hidden rounded-[40px] border border-[#314258] bg-[radial-gradient(circle_at_top_left,rgba(94,226,135,0.16),rgba(9,14,21,0.98)_38%),radial-gradient(circle_at_top_right,rgba(255,216,108,0.08),transparent_34%),linear-gradient(145deg,rgba(18,26,38,0.99),rgba(8,12,18,0.97))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.34)] sm:p-8 lg:p-10">
      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-[#9CC9AE]">
            Das Food-Diary fuer Ratings und Reviews
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-[#F6FFF8] sm:text-5xl lg:text-6xl">
            Bewerte Lebensmittel, fuehre Listen und sieh sofort, was dein Netzwerk zuletzt
            probiert hat.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-[#C9D8E7] sm:text-lg">
            FoodRanker positioniert sich jetzt klar als Bewertungsseite fuer Lebensmittel:
            Tiefkuehlpizza, Chips, Eis, Proteinriegel und mehr. Denk eher an Letterboxd fuer
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
              description="Baue Favoriten und Watchlist wie in einem persoenlichen Food-Journal."
            />
            <FeatureTile
              icon={<FiUsers size={18} />}
              title="Folgen"
              description="Die Home startet mit Aktivitaet von Leuten, deren Geschmack du spannend findest."
            />
          </div>

          <p className="mt-6 text-sm text-[#8CA1B8]">
            {isLoading
              ? "Highlights werden geladen..."
              : hasLiveRatings
                ? `${formatCompactCount(totalRatingCount)} Live-Bewertungen praegen die aktuellen Highlights.`
                : "Sobald mehr Live-Bewertungen vorhanden sind, werden die Highlights noch persoenlicher."}
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(94,226,135,0.06),transparent_24%),linear-gradient(180deg,#0A1118_0%,#0F151E_52%,#0A1118_100%)] px-4 pb-24 pt-28 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        {isDiscoverMode ? (
          <>
            <section className="rounded-[36px] border border-[#2A394B] bg-[radial-gradient(circle_at_top_left,rgba(94,226,135,0.1),rgba(16,24,36,0.98)_42%),linear-gradient(145deg,rgba(19,27,38,0.98),rgba(10,15,22,0.97))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)] sm:p-8">
              <p className="text-xs uppercase tracking-[0.24em] text-[#9CC9AE]">
                Lebensmittel entdecken
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-[#F3FFF6] sm:text-4xl">
                Finde Produkte, die du als Naechstes bewerten willst.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#C9D8E7] sm:text-base">
                FoodRanker ist jetzt klar als Bewertungsseite fuer Lebensmittel inszeniert:
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
                    {searchQuery ? `Treffer fuer "${searchQuery}"` : "Gefilterte Produkte"}
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
                  Keine Treffer gefunden. Versuche andere Begriffe wie Pizza, Salami, Vanille,
                  Protein oder waehle eine andere Kategorie.
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
                <FeedPanel
                  feedData={feedData}
                  feedLoading={feedLoading}
                  feedError={feedError}
                />

                <div className="grid gap-6 lg:grid-cols-2">
                  <ProductShelf
                    eyebrow="Community Favoriten"
                    title="Beste Bewertungen der Woche"
                    description="Produkte mit den staerksten aktuellen Scores und Momentum."
                    products={sections.bestThisWeek.slice(0, 4)}
                    actionHref="/?sort=best"
                  />
                  <ProductShelf
                    eyebrow="Momentum"
                    title="Trendet gerade"
                    description="Das bespricht und bewertet die Community momentan besonders haeufig."
                    products={sections.trending.slice(0, 4)}
                    actionHref="/?sort=popular"
                  />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <ProductShelf
                    eyebrow="Neu im Katalog"
                    title="Frisch hinzugefuegt"
                    description="Neue Lebensmittel, die auf ihre ersten Reviews und Rankings warten."
                    products={sections.newlyAdded.slice(0, 4)}
                    actionHref="/?sort=new"
                  />
                  <ProductShelf
                    eyebrow="Hall of Fame"
                    title="Starke Tiefkuehlpizzen"
                    description="Ein klarer Callout fuer Pizza, ohne dass die Homepage nur noch Pizza ist."
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
              ? "Highlights und Startseiten-Shelves greifen auf vorhandene Community-Bewertungen zurueck."
              : "Solange noch wenige Live-Bewertungen vorliegen, mischt die Homepage kuratierte Standard-Highlights mit Community-Signalen."}
        </p>
      </div>
    </main>
  );
}
