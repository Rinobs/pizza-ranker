"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FiCamera, FiLoader, FiX } from "react-icons/fi";

const HTML5_QRCODE_CDN_URL = "https://unpkg.com/html5-qrcode";

type BarcodeLookupResponse =
  | {
      success: true;
      found: true;
      barcode: string;
      routeSlug: string;
      name: string;
      sourceUrl: string;
      manualHref: string;
    }
  | {
      success: true;
      found: false;
      barcode: string;
      manualHref: string;
    }
  | {
      success: false;
      error: string;
      barcode?: string;
      manualHref?: string;
    };

type ScannerFeedback =
  | {
      type: "permission";
      title: string;
      message: string;
    }
  | {
      type: "error";
      title: string;
      message: string;
    }
  | {
      type: "not_found";
      title: string;
      message: string;
      manualHref: string;
      barcode: string;
    };

type Html5QrcodeQrBox =
  | {
      width: number;
      height: number;
    }
  | ((viewfinderWidth: number, viewfinderHeight: number) => {
      width: number;
      height: number;
    });

type Html5QrcodeConfig = {
  fps?: number;
  aspectRatio?: number;
  disableFlip?: boolean;
  qrbox?: Html5QrcodeQrBox;
  formatsToSupport?: unknown[];
};

type Html5QrcodeCameraDevice = {
  id: string;
  label: string;
};

type Html5QrcodeInstance = {
  start: (
    cameraIdOrConfig: string | MediaTrackConstraints,
    configuration: Html5QrcodeConfig,
    qrCodeSuccessCallback: (decodedText: string) => void,
    qrCodeErrorCallback?: (errorMessage: string) => void
  ) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => void | Promise<void>;
};

type Html5QrcodeConstructor = new (
  elementId: string,
  verbose?: boolean
) => Html5QrcodeInstance;

type Html5QrcodeClass = Html5QrcodeConstructor & {
  getCameras?: () => Promise<Html5QrcodeCameraDevice[]>;
};

type Html5QrcodeWindow = Window & {
  Html5Qrcode?: Html5QrcodeClass;
  Html5QrcodeSupportedFormats?: {
    EAN_13?: unknown;
    EAN_8?: unknown;
    UPC_A?: unknown;
    UPC_E?: unknown;
  };
};

type MobileBarcodeScannerProps = {
  variant?: "icon" | "button";
  className?: string;
  label?: string;
  ariaLabel?: string;
  onBarcodeDetected?: (barcode: string) => void;
};

let html5QrcodeCdnPromise: Promise<Html5QrcodeWindow> | null = null;

function getBarcodeLookupErrorMessage() {
  return "Der Barcode konnte gerade nicht verarbeitet werden.";
}

function normalizeBarcode(value: string) {
  return value.replace(/[^\d]/g, "").trim();
}

function isEan13Barcode(value: string) {
  return /^\d{13}$/.test(value);
}

function normalizeDetectedBarcode(value: string) {
  const normalized = normalizeBarcode(value);

  if (isEan13Barcode(normalized)) {
    return normalized;
  }

  if (/^\d{12}$/.test(normalized)) {
    return `0${normalized}`;
  }

  if (/^\d{8}$/.test(normalized)) {
    return normalized;
  }

  return null;
}

function getSupportedBarcodeFormats(scannerWindow: Html5QrcodeWindow) {
  const supportedFormats = scannerWindow.Html5QrcodeSupportedFormats;

  if (!supportedFormats) {
    return undefined;
  }

  return [
    supportedFormats.EAN_13,
    supportedFormats.EAN_8,
    supportedFormats.UPC_A,
    supportedFormats.UPC_E,
  ].filter((format): format is unknown => format !== undefined);
}

function isCameraPermissionError(error: unknown) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";

  return /notallowed|permission|denied|securityerror|permission denied/i.test(message);
}

function formatScannerError(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error.trim();
  }

  return null;
}

function pickPreferredRearCameraId(devices: Html5QrcodeCameraDevice[]) {
  return (
    devices.find((device) => /(back|rear|environment|hinten|ruck|rueck)/i.test(device.label))
      ?.id ??
    devices[0]?.id ??
    null
  );
}

function loadHtml5QrcodeCdn() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Scanner ist nur im Browser verfuegbar."));
  }

  const scannerWindow = window as Html5QrcodeWindow;

  if (scannerWindow.Html5Qrcode) {
    return Promise.resolve(scannerWindow);
  }

  if (html5QrcodeCdnPromise) {
    return html5QrcodeCdnPromise;
  }

  html5QrcodeCdnPromise = new Promise<Html5QrcodeWindow>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-html5-qrcode-cdn="true"]'
    );

    if (existingScript) {
      if ((window as Html5QrcodeWindow).Html5Qrcode) {
        resolve(window as Html5QrcodeWindow);
        return;
      }

      existingScript.addEventListener("load", () => resolve(window as Html5QrcodeWindow), {
        once: true,
      });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Scanner-Bibliothek konnte nicht geladen werden.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = HTML5_QRCODE_CDN_URL;
    script.async = true;
    script.dataset.html5QrcodeCdn = "true";
    script.onload = () => resolve(window as Html5QrcodeWindow);
    script.onerror = () => {
      html5QrcodeCdnPromise = null;
      reject(new Error("Scanner-Bibliothek konnte nicht geladen werden."));
    };

    document.body.appendChild(script);
  });

  return html5QrcodeCdnPromise;
}

export default function MobileBarcodeScanner({
  variant = "icon",
  className = "",
  label = "Barcode scannen",
  ariaLabel,
  onBarcodeDetected,
}: MobileBarcodeScannerProps) {
  const router = useRouter();
  const reactId = useId();
  const scannerElementId = `barcode-scanner-${reactId.replace(/[:]/g, "")}`;
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const hasHandledDecodeRef = useRef(false);
  const preferredCameraIdRef = useRef<string | null>(null);

  const [isSupported, setIsSupported] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isStartingScanner, setIsStartingScanner] = useState(false);
  const [isResolvingBarcode, setIsResolvingBarcode] = useState(false);
  const [feedback, setFeedback] = useState<ScannerFeedback | null>(null);

  const isBusy = isPreparing || isStartingScanner || isResolvingBarcode;

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (!scanner) {
      return;
    }

    try {
      await scanner.stop();
    } catch {
      // Ignore stop errors if the stream was already stopped.
    }

    try {
      await Promise.resolve(scanner.clear());
    } catch {
      // Ignore clear errors during teardown.
    }
  }, []);

  const closeScanner = useCallback(() => {
    setIsOpen(false);
    setIsPreparing(false);
    setIsStartingScanner(false);
    hasHandledDecodeRef.current = false;
    void stopScanner();
  }, [stopScanner]);

  useEffect(() => {
    function updateSupport() {
      if (typeof window === "undefined") {
        setIsSupported(false);
        return;
      }

      setIsSupported(window.innerWidth < 768 && Boolean(navigator.mediaDevices));
    }

    updateSupport();
    window.addEventListener("resize", updateSupport);

    return () => {
      window.removeEventListener("resize", updateSupport);
    };
  }, []);

  useEffect(() => {
    if (isSupported) {
      return;
    }

    setIsOpen(false);
  }, [isSupported]);

  useEffect(() => {
    if (!(isOpen || feedback)) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [feedback, isOpen]);

  const handleLookup = useCallback(
    async (barcode: string) => {
      setIsResolvingBarcode(true);

      try {
        const response = await fetch(
          `/api/barcode/lookup?barcode=${encodeURIComponent(barcode)}`,
          {
            cache: "no-store",
          }
        );
        const json = (await response.json()) as BarcodeLookupResponse;

        if (json.success && json.found) {
          router.push(`/produkt/${encodeURIComponent(json.routeSlug)}`);
          return;
        }

        if (json.success && !json.found) {
          setFeedback({
            type: "not_found",
            title: "Produkt nicht gefunden",
            message: "Produkt nicht gefunden. Moechtest du es manuell hinzufuegen?",
            manualHref: json.manualHref,
            barcode,
          });
          return;
        }

        setFeedback({
          type: "error",
          title: "Scan fehlgeschlagen",
          message: json.error || getBarcodeLookupErrorMessage(),
        });
      } catch {
        setFeedback({
          type: "error",
          title: "Scan fehlgeschlagen",
          message: getBarcodeLookupErrorMessage(),
        });
      } finally {
        setIsResolvingBarcode(false);
      }
    },
    [router]
  );

  const getPreferredCameraSelection = useCallback((): string | MediaTrackConstraints => {
    if (preferredCameraIdRef.current) {
      return preferredCameraIdRef.current;
    }

    return {
      facingMode: {
        ideal: "environment",
      },
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCancelled = false;

    async function startScanner() {
      setIsPreparing(false);
      setIsStartingScanner(true);

      try {
        const scannerWindow = await loadHtml5QrcodeCdn();

        if (
          isCancelled ||
          !scannerWindow.Html5Qrcode
        ) {
          return;
        }

        const startTargets: Array<string | MediaTrackConstraints> = [];
        const preferredTarget = getPreferredCameraSelection();

        startTargets.push(preferredTarget);
        startTargets.push({ facingMode: { exact: "environment" } });
        startTargets.push({ facingMode: "environment" });

        const dedupedTargets = startTargets.filter((target, index, allTargets) => {
          const serializedTarget =
            typeof target === "string" ? target : JSON.stringify(target);

          return (
            index ===
            allTargets.findIndex((candidate) => {
              const serializedCandidate =
                typeof candidate === "string" ? candidate : JSON.stringify(candidate);

              return serializedCandidate === serializedTarget;
            })
          );
        });

        const supportedFormats = getSupportedBarcodeFormats(scannerWindow);
        let lastError: unknown = null;

        for (const target of dedupedTargets) {
          if (isCancelled) {
            return;
          }

          const scanner = new scannerWindow.Html5Qrcode(scannerElementId, true);
          scannerRef.current = scanner;

          try {
            await scanner.start(
              target,
              {
                fps: 10,
                qrbox: {
                  width: 280,
                  height: 140,
                },
                formatsToSupport:
                  supportedFormats && supportedFormats.length > 0
                    ? supportedFormats
                    : undefined,
              },
              (decodedText) => {
                const barcode = normalizeDetectedBarcode(decodedText);

                if (hasHandledDecodeRef.current || !barcode) {
                  return;
                }

                hasHandledDecodeRef.current = true;
                onBarcodeDetected?.(barcode);
                setIsOpen(false);

                void (async () => {
                  await stopScanner();
                  await handleLookup(barcode);
                  hasHandledDecodeRef.current = false;
                })();
              },
              () => undefined
            );

            return;
          } catch (error) {
            lastError = error;
            scannerRef.current = null;

            try {
              await Promise.resolve(scanner.clear());
            } catch {
              // Ignore cleanup errors between fallback attempts.
            }
          }
        }

        throw lastError ?? new Error("Keine kompatible Kamera gefunden.");
      } catch (error) {
        if (isCancelled) {
          return;
        }

        console.error("Barcode scanner start failed", error);
        setIsOpen(false);
        setFeedback({
          type: isCameraPermissionError(error) ? "permission" : "error",
          title: isCameraPermissionError(error)
            ? "Kamerazugriff benoetigt"
            : "Scanner nicht verfuegbar",
          message: isCameraPermissionError(error)
            ? "Kamerazugriff erforderlich um Barcodes zu scannen."
            : formatScannerError(error) || "Die Kamera konnte gerade nicht gestartet werden.",
        });
      } finally {
        if (!isCancelled) {
          setIsStartingScanner(false);
        }
      }
    }

    void startScanner();

    return () => {
      isCancelled = true;
      hasHandledDecodeRef.current = false;
      void stopScanner();
    };
  }, [
    getPreferredCameraSelection,
    handleLookup,
    isOpen,
    onBarcodeDetected,
    scannerElementId,
    stopScanner,
  ]);

  async function handleOpenScanner() {
    if (!isSupported || isBusy) {
      return;
    }

    setFeedback(null);
    setIsPreparing(true);
    preferredCameraIdRef.current = null;

    try {
      const scannerWindow = await loadHtml5QrcodeCdn();

      if (!scannerWindow.Html5Qrcode) {
        throw new Error("Scanner-Bibliothek nicht verfuegbar.");
      }

      if (scannerWindow.Html5Qrcode.getCameras) {
        try {
          const cameraDevices = await scannerWindow.Html5Qrcode.getCameras();
          preferredCameraIdRef.current = pickPreferredRearCameraId(cameraDevices);
        } catch (error) {
          if (isCameraPermissionError(error)) {
            throw error;
          }

          console.error("Barcode scanner camera enumeration failed", error);
          preferredCameraIdRef.current = null;
        }
      }

      setIsOpen(true);
    } catch (error) {
      console.error("Barcode scanner open failed", error);
      setFeedback({
        type: isCameraPermissionError(error) ? "permission" : "error",
        title: isCameraPermissionError(error)
          ? "Kamerazugriff benoetigt"
          : "Scanner nicht verfuegbar",
        message: isCameraPermissionError(error)
          ? "Kamerazugriff erforderlich um Barcodes zu scannen."
          : formatScannerError(error) || "Die Kamera konnte gerade nicht gestartet werden.",
      });
    } finally {
      setIsPreparing(false);
    }
  }

  if (!isSupported) {
    return null;
  }

  const trigger = (
    <button
      type="button"
      onClick={handleOpenScanner}
      disabled={isBusy}
      aria-label={ariaLabel || label}
      className={
        variant === "button"
          ? `inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#35503D] bg-[linear-gradient(135deg,rgba(94,226,135,0.18),rgba(18,27,39,0.96))] px-5 py-3 text-sm font-semibold text-[#E9FFF0] transition-colors hover:border-[#5EE287] hover:bg-[linear-gradient(135deg,rgba(94,226,135,0.26),rgba(18,27,39,0.98))] disabled:cursor-not-allowed disabled:opacity-60 ${className}`
          : `inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#2D3A4B] bg-[#18222E] text-[#D6E2EF] transition-colors hover:border-[#5EE287] hover:text-[#F3FFF6] disabled:cursor-not-allowed disabled:opacity-60 ${className}`
      }
    >
      {isBusy ? (
        <FiLoader className="animate-spin" size={variant === "button" ? 18 : 17} />
      ) : (
        <FiCamera size={variant === "button" ? 18 : 17} />
      )}
      {variant === "button" ? <span>{label}</span> : null}
    </button>
  );

  const scannerModal =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-[#070C12]/88 px-4 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Barcode scannen"
              className="w-full max-w-[420px] rounded-[32px] border border-[#2D3A4B] bg-[linear-gradient(145deg,rgba(18,26,38,0.98),rgba(9,14,21,0.98))] p-5 shadow-[0_28px_70px_rgba(0,0,0,0.45)]"
            >
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#9CC9AE]">
                  Barcode Scanner
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#D6E2EF]">
                  Halte die Kamera auf den Barcode der Verpackung
                </p>
              </div>

              <div className="relative mx-auto mt-5 aspect-square w-full max-w-[320px] overflow-hidden rounded-[28px] border border-[#2D3A4B] bg-[#0B1118]">
                <div id={scannerElementId} className="h-full w-full" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_48%,rgba(0,0,0,0.28)_100%)]" />
                <div className="pointer-events-none absolute inset-[14%] rounded-[26px] border-2 border-[#F24848] shadow-[0_0_0_1px_rgba(242,72,72,0.24),0_0_28px_rgba(242,72,72,0.18)]" />
                {isPreparing || isStartingScanner ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0B1118]/70 text-sm text-[#D6E2EF]">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#2D3A4B] bg-[#111925] px-4 py-2">
                      <FiLoader className="animate-spin" size={16} />
                      Kamera startet...
                    </span>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={closeScanner}
                className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-[#2D3A4B] bg-[#141C27] px-4 py-3 text-sm font-semibold text-white transition-colors hover:border-[#5EE287] hover:text-[#D9FFE6]"
              >
                Abbrechen
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  const feedbackDialog =
    feedback && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[155] flex items-end justify-center bg-[#070C12]/76 px-4 pb-6 pt-10 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-label={feedback.title}
              className="w-full max-w-[420px] rounded-[30px] border border-[#2D3A4B] bg-[linear-gradient(145deg,rgba(18,26,38,0.98),rgba(9,14,21,0.98))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.42)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-[#F3FFF6]">{feedback.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#C9D8E7]">
                    {feedback.message}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#2D3A4B] bg-[#121B27] text-white transition-colors hover:border-[#5EE287]"
                  aria-label="Hinweis schliessen"
                >
                  <FiX size={18} />
                </button>
              </div>

              {"barcode" in feedback ? (
                <div className="mt-4 rounded-2xl border border-[#2D3A4B] bg-[#101822] px-4 py-3 text-sm text-[#D6E2EF]">
                  Barcode: <span className="font-semibold text-white">{feedback.barcode}</span>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                {"manualHref" in feedback ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFeedback(null);
                      router.push(feedback.manualHref);
                    }}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#5EE287] px-4 py-2 text-sm font-semibold text-[#0C1910] transition-colors hover:bg-[#79F29C]"
                  >
                    Manuell hinzufuegen
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#2D3A4B] bg-[#141C27] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-[#5EE287] hover:text-[#D9FFE6]"
                >
                  Schliessen
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {trigger}
      {scannerModal}
      {feedbackDialog}
    </>
  );
}
