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
  { shell: string; pill: string; dot: string }
> = {
  mint: {
    shell: "border-[#2D5B41] bg-[linear-gradient(135deg,rgba(94,226,135,0.14),rgba(17,25,37,0.96))]",
    pill: "border-[#3C7252] bg-[#173023] text-[#D9FFE6]",
    dot: "bg-[#5EE287]",
  },
  sky: {
    shell: "border-[#34506D] bg-[linear-gradient(135deg,rgba(90,170,255,0.16),rgba(17,25,37,0.96))]",
    pill: "border-[#46698D] bg-[#132234] text-[#DCEEFF]",
    dot: "bg-[#68B4FF]",
  },
  amber: {
    shell: "border-[#6A5630] bg-[linear-gradient(135deg,rgba(255,195,90,0.16),rgba(17,25,37,0.96))]",
    pill: "border-[#8E7440] bg-[#2D2412] text-[#FFF0CF]",
    dot: "bg-[#FFC65A]",
  },
  rose: {
    shell: "border-[#6B4156] bg-[linear-gradient(135deg,rgba(255,130,190,0.16),rgba(17,25,37,0.96))]",
    pill: "border-[#8D5A72] bg-[#2A1722] text-[#FFE1EF]",
    dot: "bg-[#FF8BC4]",
  },
};

export const SURFACE_CLASS_NAME =
  "rounded-[30px] border border-[#2A394B] bg-[linear-gradient(145deg,rgba(22,31,43,0.98),rgba(16,24,36,0.96))] p-5 shadow-[0_18px_42px_rgba(0,0,0,0.28)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_52px_rgba(0,0,0,0.34)]";

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
      className={`group flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-300 ${
        active
          ? "border-[#5EE287] bg-[#173023] text-[#E8FFF0] shadow-[0_14px_34px_rgba(34,197,94,0.18)]"
          : "border-[#253345] bg-[#111925] text-[#B7C4D3] hover:border-[#5EE287] hover:text-white"
      }`}
    >
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl border transition-all duration-300 ${
          active
            ? "border-[#5EE287]/45 bg-white/10"
            : "border-[#2D3A4B] bg-[#151F2B] group-hover:border-[#5EE287]/35"
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
      {active && <span className="h-2.5 w-2.5 rounded-full bg-[#5EE287] shadow-[0_0_18px_rgba(94,226,135,0.8)]" />}
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
          <p className="text-xs uppercase tracking-[0.22em] text-[#8CA1B8]">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#F3FFF6]">{title}</h2>
          {description && <p className="mt-2 max-w-2xl text-sm text-[#AFC1D3]">{description}</p>}
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
}: {
  icon: IconType;
  label: string;
  value: string;
  hint: string;
  accent?: string;
}) {
  return (
    <div className="group rounded-[26px] border border-[#293749] bg-[linear-gradient(135deg,rgba(18,26,38,0.98),rgba(15,22,33,0.94))] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#5EE287]/35 hover:shadow-[0_18px_40px_rgba(0,0,0,0.26)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">{label}</p>
          <p className={`mt-3 text-2xl font-black tracking-tight text-white ${accent ?? ""}`}>{value}</p>
          <p className="mt-2 text-sm text-[#AFC1D3]">{hint}</p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2D3A4B] bg-[#151F2B] text-[#D9E7F3] transition-transform duration-300 group-hover:scale-105 group-hover:border-[#5EE287]/35">
          <Icon size={20} />
        </span>
      </div>
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
    <div className="rounded-[26px] border border-dashed border-[#334458] bg-[#111925]/85 p-6 text-center">
      <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#2D3A4B] bg-[#151F2B] text-[#C8D6E5]">
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
      className={`rounded-[26px] border p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(0,0,0,0.26)] ${toneStyles.shell} ${
        badge.unlocked ? "opacity-100" : "opacity-80"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{badge.label}</p>
          <p className="mt-2 text-sm leading-relaxed text-[#D6E2EF]">{badge.description}</p>
        </div>
        <span className={`inline-flex h-3 w-3 shrink-0 rounded-full ${toneStyles.dot}`} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${toneStyles.pill}`}>
          {badge.unlocked ? "Freigeschaltet" : "In Arbeit"}
        </span>
        <span className="text-xs text-[#D6E2EF]">{badge.progressLabel}</span>
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
      className={`flex items-center justify-between gap-3 rounded-[24px] border p-4 transition-all duration-300 hover:-translate-y-1 ${
        highlight
          ? "border-[#5EE287]/40 bg-[linear-gradient(135deg,rgba(94,226,135,0.12),rgba(17,25,37,0.96))]"
          : "border-[#2A394B] bg-[#121B27]/94 hover:border-[#5EE287]/25"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#2D3A4B] bg-[#151F2B] text-sm font-black tracking-[0.14em] text-white">
          {getProfileInitials(username)}
        </span>
        <div className="min-w-0">
          <Link href={href} className="truncate font-semibold text-white transition-colors hover:text-[#8AF5AC]">
            {username}
          </Link>
          <p className="mt-1 text-xs text-[#8CA1B8]">{subtitle}</p>
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
      className={`rounded-[22px] border px-4 py-3 transition-all duration-300 ${
        completed ? "border-[#35503D] bg-[#173023]/70" : "border-[#2A394B] bg-[#101822]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border ${completed ? "border-[#5EE287] bg-[#5EE287]/15 text-[#8AF5AC]" : "border-[#2D3A4B] bg-[#141C27] text-[#6F8297]"}`}>
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

  context.fillStyle = "#101822";
  context.fillRect(0, 0, size, size);
  context.drawImage(image, sourceX, sourceY, square, square, 0, 0, size, size);

  return canvas.toDataURL("image/jpeg", 0.84);
}
