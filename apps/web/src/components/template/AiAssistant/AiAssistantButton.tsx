import { useState } from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { AiAssistantModal } from "./AiAssistantModal";

export function AiAssistantButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative flex size-9 shrink-0 items-center justify-center rounded-full border border-purple-500/30 bg-purple-50/80 text-purple-600 transition-all hover:border-purple-500/50 hover:bg-purple-100 hover:text-purple-700 active:scale-95 focus:outline-hidden dark:border-purple-500/30 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:border-purple-400/50 dark:hover:bg-purple-900/50 dark:hover:text-purple-200 cursor-pointer"
        title="Filomonline AI Asistan (Ehliyet/Ruhsat Okuma, Sesli Komut, Filtreleme)"
        aria-label="Filomonline AI Asistan"
      >
        <SparklesIcon className="size-5 transition-transform group-hover:rotate-12" />
        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 ring-2 ring-white dark:ring-dark-700 animate-pulse" />
      </button>

      <AiAssistantModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
