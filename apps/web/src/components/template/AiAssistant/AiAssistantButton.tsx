import { useState } from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui";
import { AiAssistantModal } from "./AiAssistantModal";

export function AiAssistantButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="flat"
        isIcon
        className="group relative size-9 rounded-full bg-gradient-to-tr from-primary-500/10 via-purple-500/15 to-primary-500/10 text-primary-600 transition-all hover:bg-gradient-to-tr hover:from-primary-500/20 hover:to-purple-500/30 hover:scale-105 active:scale-95 dark:from-primary-400/10 dark:to-purple-400/20 dark:text-primary-400"
        title="Filomonline AI Asistan (Ehliyet/Ruhsat Okuma, Sesli Komut, Filtreleme)"
        aria-label="Filomonline AI Asistan"
      >
        <SparklesIcon className="size-5 transition-transform group-hover:rotate-12" />
        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 ring-2 ring-white dark:ring-dark-750 animate-pulse" />
      </Button>

      <AiAssistantModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
