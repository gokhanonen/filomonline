import { Box, Progress } from "@/components/ui";
import { Link } from "react-router";
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";

interface UpgradeProps {
  close?: () => void;
}

export function Upgrade({ close }: UpgradeProps) {
  return (
    <Box className="mx-3 mt-4 rounded-lg bg-gray-100 p-3 px-3 py-2.5 dark:bg-dark-600">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CloudArrowUpIcon className="size-4 text-primary-600 dark:text-primary-400" />
          <p className="text-xs text-gray-600 dark:text-dark-200">
            <span className="font-bold text-gray-800 dark:text-dark-100">
              2.4 GB
            </span>{" "}
            / 100 GB Evrak Alanı
          </p>
        </div>
        <Link
          to="/catalog?tab=documents"
          onClick={close}
          className="text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
        >
          Evraklar
        </Link>
      </div>
      <div className="mt-2.5">
        <Progress value={8} color="primary" classNames={{ bar: "h-1.5" }} />
      </div>
      <p className="mt-1.5 text-[10px] text-gray-400 dark:text-dark-400">
        Ruhsat, poliçe ve sözleşme ekleri güvenli bulutta saklanır.
      </p>
    </Box>
  );
}
