import { ReactNode } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-100">
      <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/60" aria-hidden="true" />
      <div className="fixed inset-0 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
        <DialogPanel
          className={clsx(
            "mt-8 w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-dark-700",
            className,
          )}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-dark-500">
            <DialogTitle className="text-base font-medium text-gray-800 dark:text-dark-50">
              {title}
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-100"
            >
              <XMarkIcon className="size-5" />
            </button>
          </div>
          <div className="px-5 py-4">{children}</div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
