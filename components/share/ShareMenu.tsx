"use client";

// components/share/ShareMenu.tsx
// Single dropdown that wraps every "share or export" action for a page.
// Designed for the itinerary view but generic enough to drop anywhere.
//
// Inside the dropdown:
//   - Copy link        → navigator.clipboard.writeText
//   - WhatsApp         → wa.me URL
//   - Email            → mailto: URL
//   - Download PDF     → window.print() with our print stylesheet
//   - Download CSV     → only shown if `csvData` is provided
//
// The whole component is `print:hidden` so it never appears in the PDF.

import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import {
  ShareIcon,
  ChevronDownIcon,
  CopyIcon,
  WhatsAppIcon,
  MailIcon,
  PrinterIcon,
  DownloadIcon,
  CalendarIcon,
} from "@/components/ui/Icons";

interface CSVData {
  filename: string;
  csv: string;
}

interface Props {
  title: string;
  summary: string;
  /**
   * Pass a function that returns the CSV body + suggested filename. If omitted
   * the CSV menu item is hidden.
   */
  csvData?: () => CSVData;
  /** Hide the "Download PDF" item if the page isn't print-friendly. */
  printable?: boolean;
  /**
   * Wire an "Add to calendar" item. Parent owns the dialog state because the
   * date picker lives outside the dropdown.
   */
  onAddToCalendar?: () => void;
}

export default function ShareMenu({
  title,
  summary,
  csvData,
  printable = true,
  onAddToCalendar,
}: Props) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Resolve the share URL on the client only — `window` isn't available in SSR.
  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function copyLink() {
    setOpen(false);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard.");
    } catch {
      toast.error("Couldn't copy. Select the URL bar to copy manually.");
    }
  }

  function shareWhatsApp() {
    const text = `${title}\n\n${summary}\n\n${url}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setOpen(false);
  }

  function shareEmail() {
    const subject = `Trip plan: ${title}`;
    const body = `Take a look at this Sarthi itinerary:\n\n${title}\n${summary}\n\n${url}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setOpen(false);
  }

  function downloadPDF() {
    setOpen(false);
    // Defer a tick so the dropdown unmounts before the print dialog opens.
    window.setTimeout(() => window.print(), 100);
  }

  function downloadCSV() {
    if (!csvData) return;
    const { filename, csv } = csvData();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    toast.success("CSV downloaded.");
    setOpen(false);
  }

  // Web Share API — on mobile this triggers the OS share sheet, which lets the
  // user pick WhatsApp / Messages / AirDrop / etc. without us knowing which apps
  // are installed. We expose it as a primary action when available.
  const hasNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function nativeShare() {
    if (!hasNativeShare) return;
    try {
      await navigator.share({ title, text: summary, url });
      setOpen(false);
    } catch {
      // user cancelled — silent
    }
  }

  return (
    <div ref={ref} className="relative print:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border-2 border-gray-200 hover:border-gray-300 text-gray-800 font-semibold transition-colors focus-ring"
      >
        <ShareIcon size={18} />
        Share &amp; Export
        <ChevronDownIcon
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full left-0 right-0 mt-2 z-30 bg-white rounded-2xl shadow-card-hover border border-gray-100 p-1.5 animate-slide-down"
        >
          {hasNativeShare && (
            <>
              <MenuItem
                icon={<ShareIcon size={16} />}
                label="Share via…"
                hint="Use system share sheet"
                onClick={nativeShare}
              />
              <Divider />
            </>
          )}
          <MenuItem
            icon={<CopyIcon size={16} />}
            label="Copy link"
            hint="Paste anywhere"
            onClick={copyLink}
          />
          <MenuItem
            icon={<WhatsAppIcon size={16} className="text-green-600" />}
            label="WhatsApp"
            hint="Open chat with text"
            onClick={shareWhatsApp}
          />
          <MenuItem
            icon={<MailIcon size={16} />}
            label="Email"
            hint="Open your mail app"
            onClick={shareEmail}
          />
          {(printable || csvData || onAddToCalendar) && <Divider />}
          {onAddToCalendar && (
            <MenuItem
              icon={<CalendarIcon size={16} />}
              label="Add to calendar"
              hint="Google · Apple · Outlook (.ics)"
              onClick={() => {
                setOpen(false);
                onAddToCalendar();
              }}
            />
          )}
          {printable && (
            <MenuItem
              icon={<PrinterIcon size={16} />}
              label="Download PDF"
              hint="Save via print → PDF"
              onClick={downloadPDF}
            />
          )}
          {csvData && (
            <MenuItem
              icon={<DownloadIcon size={16} />}
              label="Download CSV"
              hint="Tabular day-by-day"
              onClick={downloadCSV}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-forest-800 transition-colors"
    >
      <span className="grid place-items-center w-7 h-7 rounded-full bg-cream text-gray-700 shrink-0">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-gray-900">
          {label}
        </span>
        {hint && (
          <span className="block text-[11px] text-gray-500">{hint}</span>
        )}
      </span>
    </button>
  );
}

function Divider() {
  return <div className="my-1 h-px bg-gray-100" />;
}
