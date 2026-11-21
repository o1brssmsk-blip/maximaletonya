"use client";

import { createPortal } from "react-dom";
import type { RefObject } from "react";

type PrizePopupHistoryItem = {
  prize: string;
  date: string;
  formattedDate: string;
};

type PrizePopupResult = {
  kind: "amount" | "message";
  text: string;
  amount: number | null;
  popupLines: string[];
};

type Props = {
  open: boolean;
  isMobile: boolean;
  result: PrizePopupResult | null;
  amountLine: string;
  description: string;

  continueButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
};

const POPUP_CONFIG = {
  desktop: {
    src: "/popup-assets/popup-desktop.webp",
    amountBoxClassName: "absolute left-[9%] top-[54%] flex h-[11%] w-[81%] items-center justify-center px-[3%]",
    ctaClassName: "absolute left-[9%] top-[66.5%] h-[11%] w-[80.5%] rounded-full",
    closeClassName: "absolute right-[6.5%] top-[9.5%] h-[11%] w-[8%] rounded-full",
    amountFontSize: (label: string) =>
      label.length >= 6 ? "clamp(1.8rem, 3.2vw, 2.7rem)" : label.length >= 5 ? "clamp(2.1rem, 3.6vw, 3.1rem)" : "clamp(2.4rem, 4.2vw, 3.5rem)",
    messageFontSize: "clamp(1.4rem, 2.3vw, 1.9rem)",
    maxWidthClassName: "md:max-w-[720px]",
  },
  mobile: {
    src: "/popup-assets/popup-mobile.webp",
    amountBoxClassName: "absolute left-[8.5%] top-[56.5%] flex h-[9.5%] w-[82%] items-center justify-center px-[4%]",
    ctaClassName: "absolute left-[8.3%] top-[65.5%] h-[9.5%] w-[82%] rounded-full",
    closeClassName: "absolute right-[7%] top-[9.5%] h-[6%] w-[9%] rounded-full",
    amountFontSize: (label: string) =>
      label.length >= 6 ? "clamp(2.2rem, 8.5vw, 3.1rem)" : label.length >= 5 ? "clamp(2.5rem, 9.5vw, 3.4rem)" : "clamp(2.8rem, 10.5vw, 3.7rem)",
    messageFontSize: "clamp(1.1rem, 4.6vw, 1.5rem)",
    maxWidthClassName: "sm:max-w-[420px]",
  },
} as const;

export function PrizePopup({
  open,
  isMobile,
  result,
  amountLine,
  description,
  continueButtonRef,
  onClose,
}: Props) {
  if (!open || !result || typeof document === "undefined") {
    return null;
  }

  const popupConfig = isMobile ? POPUP_CONFIG.mobile : POPUP_CONFIG.desktop;

  return createPortal(
    <div
      data-overlay-root="true"
      className="fixed inset-0 z-[99999] overflow-hidden bg-[#021b59]/20 px-2 py-2 animate-in fade-in duration-300"
      style={{
        paddingTop: "max(0.5rem, env(safe-area-inset-top))",
        paddingRight: "max(0.5rem, env(safe-area-inset-right))",
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(0.5rem, env(safe-area-inset-left))",
      }}
    >
      <div className="flex h-full items-center justify-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="wheel-result-title"
          aria-describedby="wheel-result-description"
          className={`relative mx-auto w-full max-w-[92vw] text-center animate-in zoom-in-95 duration-300 ${popupConfig.maxWidthClassName}`}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              onClose();
            }
          }}
          tabIndex={-1}
        >
          <div className="relative">
            <h2 id="wheel-result-title" className="sr-only">
              Apsveicam!
            </h2>
            <p id="wheel-result-description" className="sr-only">
              {description}
            </p>

            <img
              src={popupConfig.src}
              alt=""
              aria-hidden="true"
              className="mx-auto h-auto w-full select-none object-contain"
              draggable={false}
            />

            <div className={popupConfig.amountBoxClassName}>
              <div
                aria-live="polite"
                className="text-center font-extrabold text-[#0a1f5c] drop-shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
                style={{
                  fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
                  fontSize: result.kind === "amount" ? popupConfig.amountFontSize(amountLine) : popupConfig.messageFontSize,
                  lineHeight: result.kind === "amount" ? "0.95" : "1.05",
                  letterSpacing: result.kind === "amount" ? "-0.035em" : "-0.01em",
                }}
              >
                {result.kind === "amount" ? amountLine : result.popupLines.map((line) => <div key={line}>{line}</div>)}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Aizvērt"
              className={`${popupConfig.closeClassName} bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75`}
            />

            <button
              ref={continueButtonRef}
              type="button"
              onClick={onClose}
              className={`${popupConfig.ctaClassName} bg-transparent outline-none`}
            >
              <span className="sr-only">Sapratu</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
