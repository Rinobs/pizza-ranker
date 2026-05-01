"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import type { IconType } from "react-icons";
import { FiCheckCircle } from "react-icons/fi";
import { getProfileInitials, type ProfileBadge, type ProfileBadgeTone } from "@/lib/profile-features";

export type TabItem<T extends string> = {
  id: T;
  label: string;
  icon: IconType;
};

const BADGE_TONE_STYLES: Record<
  ProfileBadgeTone,
  { shell: string; pill: string; dot: string; progress: string }
> = {
  mint: {
    shell: "border-[#333333] bg-[linear-gradient(135deg,rgba(232,117,10,0.14),rgba(20,20,20,0.96))]",
    pill: "border-[#3C7252] bg-[#291808] text-[#FFE4C8]",
    dot: "bg-[#E8750A]",
    progress: "bg-[linear-gradient(90deg,#E8750A,#F5963C)]",
  },
  sky: {
    shell: "border-[#34506D] bg-[linear-gradient(135deg,rgba(90,170,255,0.16),rgba(20,20,20,0.96))]",
    pill: "border-[#46698D] bg-[#132234] text-[#DCEEFF]",
    dot: "bg-[#68B4FF]",
    progress: "bg-[linear-gradient(90deg,#68B4FF,#8BC9FF)]",
  },
  amber: {
    shell: "border-[#6A5630] bg-[linear-gradient(135deg,rgba(255,195,90,0.16),rgba(20,20,20,0.96))]",
    pill: "border-[#8E7440] bg-[#2D2412] text-[#FFF0CF]",
    dot: "bg-[#FFC65A]",
    progress: "bg-[linear-gradient(90deg,#FFC65A,#FFD86C)]",
  },
  rose: {
    shell: "border-[#6B4156] bg-[linear-gradient(135deg,rgba(255,130,190,0.16),rgba(20,20,20,0.96))]",
    pill: "border-[#8D5A72] bg-[#2A1722] text-[#FFE1EF]",
    dot: "bg-[#FF8BC4]",
    progress: "bg-[linear-gradient(90deg,#FF8BC4,#FFB0D6)]",
  },
};

export const SURFACE_CLASS_NAME =
  "rounded-xl border border-[#2A2A2A] bg-[linear-gradient(145deg,rgba(22,31,43,0.98),rgba(20,20,20,0.96))] p-5 shadow-[0_18px_42px_rgba(0,0,0,0.28)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_52px_rgba(0,0,0,0.34)]";

type MetricVisualTone = "mint" | "sky" | "amber" | "rose";

type MetricCardVisual =
  | {
      kind: "ring";
      value: number;
      label: string;
      valueLabel?: string;
      tone?: MetricVisualTone;
    }
  | {
      kind: "bars";
      value: number;
      label: string;
      valueLabel?: string;
      tone?: MetricVisualTone;
    };

const METRIC_VISUAL_TONE_STYLES: Record<
  MetricVisualTone,
  {
    fill: string;
    fillSoft: string;
    track: string;
    text: string;
  }
> = {
  mint: {
    fill: "#E8750A",
    fillSoft: "#F5963C",
    track: "rgba(232,117,10,0.14)",
    text: "text-[#FFE4C8]",
  },
  sky: {
    fill: "#68B4FF",
    fillSoft: "#8BC9FF",
    track: "rgba(104,180,255,0.14)",
    text: "text-[#DCEEFF]",
  },
  amber: {
    fill: "#FFC65A",
    fillSoft: "#FFD86C",
    track: "rgba(255,198,90,0.14)",
    text: "text-[#FFF0CF]",
  },
  rose: {
    fill: "#FF8BC4",
    fillSoft: "#FFB0D6",
    track: "rgba(255,139,196,0.14)",
    text: "text-[#FFE1EF]",
  },
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function MetricCardVisualBlock({ visual }: { visual: MetricCardVisual }) {
  const tone = METRIC_VISUAL_TONE_STYLES[visual.tone ?? "mint"];
  const clamped = clampPercent(visual.value);

  if (visual.kind === "ring") {
    return (
      <div className="mt-4 rounded-md border border-[#243242] bg-[#1C1C1C] p-3">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="relative h-14 w-14 shrink-0 rounded-full"
            style={{ background: `conic-gradient(${tone.fill} 0 ${clamped}%, ${tone.track} ${clamped}% 100%)` }}
          >
            <div className="absolute inset-[6px] rounded-full bg-[#1C1C1C]" />
            <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-black tracking-[0.08em] ${tone.text}`}>
              {visual.valueLabel ?? formatPercent(clamped)}
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A8F83]">{visual.label}</p>
            <p className="mt-1 text-xs text-[#A89880]">Macht auf einen Blick sichtbar, wie viel davon schon in deinem Profil steckt.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-md border border-[#243242] bg-[#1C1C1C] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A8F83]">{visual.label}</p>
        <span className={`text-xs font-black tracking-[0.08em] ${tone.text}`}>{visual.valueLabel ?? formatPercent(clamped)}</span>
      </div>
      <div className="mt-3 flex h-10 items-end gap-1.5">
        {Array.from({ length: 10 }).map((_, index) => {
          const threshold = ((index + 1) / 10) * 100;
          const active = clamped >= threshold;
          return (
            <span
              key={`metric-bar-${index}`}
              className="flex-1 rounded-t-full transition-all duration-300"
              style={{
                height: `${14 + index * 2}px`,
                background: active ? `linear-gradient(180deg, ${tone.fillSoft}, ${tone.fill})` : "#1A2532",
                opacity: active ? 1 : 0.8,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function TabButton<T extends string>({
  item,
  active,
  onClick,
  count,
}: {
  item: TabItem<T>;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-12 items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all duration-300 ${
        active
          ? "border-[#E8750A] bg-[#291808] text-[#FFE4C8] shadow-[0_14px_34px_rgba(232,117,10,0.18)]"
          : "border-[#253345] bg-[#1C1C1C] text-[#BAB0A6] hover:border-[#E8750A] hover:text-white"
      }`}
    >
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-300 ${
          active
            ? "border-[#E8750A]/45 bg-white/10"
            : "border-[#333333] bg-[#242424] group-hover:border-[#E8750A]/35"
        }`}
      >
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{item.label}</span>
        {count !== undefined && (
          <span className="mt-0.5 block text-xs uppercase tracking-[0.18em] text-inherit/70">
            {count}
          </span>
        )}
      </span>
      {active && <span className="h-2.5 w-2.5 rounded-full bg-[#E8750A] shadow-[0_0_18px_rgba(232,117,10,0.8)]" />}
    </button>
  );
}

export function SectionShell({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={SURFACE_CLASS_NAME}>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#9A8F83]">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#FFF0E4]">{title}</h2>
          {description && <p className="mt-2 max-w-2xl text-sm text-[#A89880]">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
  visual,
}: {
  icon: IconType;
  label: string;
  value: string;
  hint: string;
  accent?: string;
  visual?: MetricCardVisual;
}) {
  return (
    <div className="group flex h-full flex-col rounded-lg border border-[#293749] bg-[linear-gradient(135deg,rgba(20,20,20,0.98),rgba(20,20,20,0.94))] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#E8750A]/35 hover:shadow-[0_18px_40px_rgba(0,0,0,0.26)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.18em] text-[#9A8F83]">{label}</p>
          <p className={`mt-3 text-2xl font-black tracking-tight text-white ${accent ?? ""}`}>{value}</p>
          <p className="mt-2 text-sm text-[#A89880]">{hint}</p>
          {visual && <MetricCardVisualBlock visual={visual} />}
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#333333] bg-[#242424] text-[#D9E7F3] transition-transform duration-300 group-hover:scale-105 group-hover:border-[#E8750A]/35">
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
}

export function SnapshotFeatureCard({
  icon: Icon,
  label,
  media,
  title,
  description,
  support,
  footer,
  titleClassName,
}: {
  icon: IconType;
  label: string;
  media?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  support?: ReactNode;
  footer?: ReactNode;
  titleClassName?: string;
}) {
  return (
    <div className="group flex h-full min-h-[240px] flex-col rounded-lg border border-[#293749] bg-[linear-gradient(135deg,rgba(20,20,20,0.98),rgba(20,20,20,0.94))] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#E8750A]/35 hover:shadow-[0_18px_40px_rgba(0,0,0,0.26)]">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[#9A8F83]">{label}</p>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#333333] bg-[#242424] text-[#D9E7F3] transition-transform duration-300 group-hover:scale-105 group-hover:border-[#E8750A]/35">
          <Icon size={18} />
        </span>
      </div>

      {media && <div className="mt-5">{media}</div>}

      <div className="mt-5 flex flex-1 flex-col">
        <div className="flex-1">
          <div className={titleClassName ?? "text-2xl font-black tracking-tight text-white"}>{title}</div>
          <div className="mt-2 text-sm leading-relaxed text-[#A89880]">{description}</div>
        </div>
        {support && <div className="mt-5">{support}</div>}
      </div>

      {footer && <div className="mt-5 border-t border-[#243242] pt-4 text-sm text-[#DDD0C4]">{footer}</div>}
    </div>
  );
}

export function EmptyPanel({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: IconType;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-[#334458] bg-[#1C1C1C]/85 p-6 text-center">
      <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-lg border border-[#333333] bg-[#242424] text-[#C8D6E5]">
        <Icon size={22} />
      </span>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-[#9EB0C3]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function BadgeCard({ badge }: { badge: ProfileBadge }) {
  const toneStyles = BADGE_TONE_STYLES[badge.tone];

  return (
    <div
      className={`rounded-lg border p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(0,0,0,0.26)] ${toneStyles.shell} ${
        badge.unlocked ? "opacity-100" : "opacity-80"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{badge.label}</p>
          <p className="mt-2 text-sm leading-relaxed text-[#DDD0C4]">{badge.description}</p>
        </div>
        <span className={`inline-flex h-3 w-3 shrink-0 rounded-full ${toneStyles.dot}`} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${toneStyles.pill}`}>
          {badge.unlocked ? "Freigeschaltet" : "In Arbeit"}
        </span>
        <span className="text-xs text-[#DDD0C4]">{badge.progressLabel}</span>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9EB0C3]">Fortschritt</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#DDD0C4]">{badge.progressPercent}%</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#15202C]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${toneStyles.progress}`}
            style={{ width: `${badge.progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function PersonListItem({
  username,
  href,
  subtitle,
  action,
  highlight = false,
}: {
  username: string;
  href: string;
  subtitle: string;
  action?: ReactNode;
  highlight?: boolean;
}) {
  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-lg border p-4 transition-all duration-300 hover:-translate-y-1 ${
        highlight
          ? "border-[#E8750A]/40 bg-[linear-gradient(135deg,rgba(232,117,10,0.12),rgba(20,20,20,0.96))]"
          : "border-[#2A2A2A] bg-[#1E1E1E]/94 hover:border-[#E8750A]/25"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#333333] bg-[#242424] text-sm font-black tracking-[0.14em] text-white">
          {getProfileInitials(username)}
        </span>
        <div className="min-w-0">
          <Link href={href} className="truncate font-semibold text-white transition-colors hover:text-[#F5963C]">
            {username}
          </Link>
          <p className="mt-1 text-xs text-[#9A8F83]">{subtitle}</p>
        </div>
      </div>
      {action}
    </li>
  );
}

export function CompletionItemCard({
  label,
  description,
  completed,
}: {
  label: string;
  description: string;
  completed: boolean;
}) {
  return (
    <div
      className={`rounded-md border px-4 py-3 transition-all duration-300 ${
        completed ? "border-[#5A2E08] bg-[#291808]/70" : "border-[#2A2A2A] bg-[#1C1C1C]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border ${completed ? "border-[#E8750A] bg-[#E8750A]/15 text-[#F5963C]" : "border-[#333333] bg-[#222222] text-[#6F8297]"}`}>
          <FiCheckCircle size={13} />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="mt-1 text-sm text-[#9EB0C3]">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Bild konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}

async function loadImageElement(src: string) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Bild konnte nicht vorbereitet werden."));
    image.src = src;
  });
}

export async function buildAvatarDataUrl(file: File) {
  const rawDataUrl = await fileToDataUrl(file);
  const image = await loadImageElement(rawDataUrl);
  const canvas = document.createElement("canvas");
  const size = 360;
  const context = canvas.getContext("2d");

  if (!context) {
    return rawDataUrl;
  }

  canvas.width = size;
  canvas.height = size;

  const square = Math.min(image.width, image.height);
  const sourceX = Math.max(0, (image.width - square) / 2);
  const sourceY = Math.max(0, (image.height - square) / 2);

  context.fillStyle = "#1C1C1C";
  context.fillRect(0, 0, size, size);
  context.drawImage(image, sourceX, sourceY, square, square, 0, 0, size, size);

  return canvas.toDataURL("image/jpeg", 0.84);
}

