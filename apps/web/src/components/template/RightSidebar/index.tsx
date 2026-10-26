// Import Dependencies
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";

// Local Imports
import { useEffect, useState } from "react";
import { ScrollShadow } from "@/components/ui";
import { useDisclosure } from "@/hooks";
import VerticalSliderIcon from "@/assets/dualicons/vertical-slider.svg?react";
import { getSummary, type ReportSummary } from "@/services/reportService";
import { Header } from "./Header";
import { Search } from "./Search";
import { BankingCard } from "./BankingCard";
import { Apps } from "./Apps";
import { Widgets } from "./Widgets";
import { News } from "./News";
import { Upgrade } from "./Upgrade";

// ----------------------------------------------------------------------

export function RightSidebar() {
  const [isOpen, { open, close }] = useDisclosure();

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="group flex size-9 shrink-0 items-center justify-center rounded-full border border-gray-200/80 bg-gray-50/80 text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900 focus:outline-hidden dark:border-dark-600 dark:bg-dark-750/80 dark:text-dark-200 dark:hover:border-dark-500 dark:hover:bg-dark-700 dark:hover:text-dark-50 cursor-pointer"
        title="Hızlı İşlemler & Raporlar"
        aria-label="Hızlı İşlemler & Raporlar"
      >
        <VerticalSliderIcon className="size-5 text-current transition-transform group-hover:scale-110" />
      </button>
      <RightSidebarContent isOpen={isOpen} close={close} />
    </>
  );
}

interface RightSidebarContentProps {
  isOpen: boolean;
  close: () => void;
}

function RightSidebarContent({ isOpen, close }: RightSidebarContentProps) {
  const [summary, setSummary] = useState<ReportSummary | null>(null);

  useEffect(() => {
    if (isOpen) {
      getSummary()
        .then(setSummary)
        .catch(() => void 0);
    }
  }, [isOpen]);

  return (
    <Transition show={isOpen}>
      <Dialog open={true} onClose={close} static autoFocus>
        <TransitionChild
          as="div"
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="fixed inset-0 z-60 bg-gray-900/50 backdrop-blur-sm transition-opacity dark:bg-black/40"
        ></TransitionChild>

        <TransitionChild
          as={DialogPanel}
          enter="ease-out transform-gpu transition-transform duration-200"
          enterFrom="translate-x-full"
          enterTo="translate-x-0"
          leave="ease-in transform-gpu transition-transform duration-200"
          leaveFrom="translate-x-0"
          leaveTo="translate-x-full"
          className="fixed inset-y-0 right-0 z-61 flex w-screen transform-gpu flex-col bg-white transition-transform duration-200 dark:bg-dark-750 sm:inset-y-2 sm:mx-2 sm:w-80 sm:rounded-xl"
        >
          <Header close={close} />
          <ScrollShadow
            size={4}
            className="hide-scrollbar overflow-y-auto overscroll-contain pb-5"
          >
            <Search close={close} />
            <BankingCard close={close} summary={summary} />
            <Apps close={close} />
            <Widgets close={close} summary={summary} />
            <News close={close} />
            <Upgrade close={close} summary={summary} />
          </ScrollShadow>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
} 