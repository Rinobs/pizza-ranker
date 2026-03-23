"use client";
/* eslint-disable @next/next/no-img-element */

import React from "react";
import { DEFAULT_PRODUCT_IMAGE } from "@/app/data/products";

const VIEWPORT_PRELOAD_MARGIN = "1200px 0px";

type ProductCardImageProps = {
  routeSlug: string;
  alt: string;
  fallbackSrc: string;
  className?: string;
  eager?: boolean;
};

function getProxyImageUrl(routeSlug: string) {
  return `/api/product-image/${routeSlug}`;
}

export default function ProductCardImage({
  routeSlug,
  alt,
  fallbackSrc,
  className = "",
  eager = false,
}: ProductCardImageProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const primarySrc = React.useMemo(() => getProxyImageUrl(routeSlug), [routeSlug]);
  const normalizedFallbackSrc = fallbackSrc.trim() || DEFAULT_PRODUCT_IMAGE;
  const [shouldLoad, setShouldLoad] = React.useState(eager);
  const [loadStage, setLoadStage] = React.useState(0);
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    setShouldLoad(eager);
    setLoadStage(0);
    setIsLoaded(false);
  }, [eager, normalizedFallbackSrc, primarySrc]);

  React.useEffect(() => {
    if (eager || shouldLoad) {
      return;
    }

    const node = containerRef.current;

    if (!node || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: VIEWPORT_PRELOAD_MARGIN,
        threshold: 0.01,
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [eager, shouldLoad]);

  const currentSrc = React.useMemo(() => {
    if (!shouldLoad) {
      return null;
    }

    if (loadStage === 0) {
      return primarySrc;
    }

    if (loadStage === 1 && normalizedFallbackSrc !== primarySrc) {
      return normalizedFallbackSrc;
    }

    return DEFAULT_PRODUCT_IMAGE;
  }, [loadStage, normalizedFallbackSrc, primarySrc, shouldLoad]);

  React.useEffect(() => {
    setIsLoaded(false);
  }, [currentSrc]);

  React.useEffect(() => {
    const image = imageRef.current;

    if (image && image.complete && image.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [currentSrc]);

  function handleError() {
    setLoadStage((currentStage) => {
      if (currentStage === 0 && normalizedFallbackSrc !== primarySrc) {
        return 1;
      }

      if (currentStage < 2) {
        return 2;
      }

      return currentStage;
    });
  }

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-[#101822]">
      <div
        aria-hidden="true"
        className={`absolute inset-0 transition-opacity duration-300 ${
          isLoaded ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(94,226,135,0.14),transparent_42%),linear-gradient(145deg,rgba(29,39,53,0.95),rgba(13,19,29,0.98))]" />
        <div className="absolute left-1/2 top-[42%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute inset-x-[14%] bottom-[18%] h-3 rounded-full bg-white/10" />
        <div className="absolute inset-x-[24%] bottom-[11%] h-2.5 rounded-full bg-white/7" />
      </div>

      {currentSrc ? (
        <img
          ref={imageRef}
          src={currentSrc}
          alt={alt}
          className={`${className} transition-transform duration-500`}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "low"}
          decoding="async"
          draggable={false}
          onLoad={() => setIsLoaded(true)}
          onError={handleError}
        />
      ) : null}
    </div>
  );
}
