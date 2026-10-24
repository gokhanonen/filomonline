import { TbBox, TbTool, TbTruck, TbCar, TbPencil, TbTrash } from "react-icons/tb";
import { PRODUCT_TYPE_LABELS, type Product, type ProductType } from "@/@types/product";

const TYPE_ICON: Record<ProductType, React.ElementType> = {
  MATERIAL: TbBox,
  RECEIVED_SERVICE: TbTool,
  PROVIDED_SERVICE: TbTruck,
  VEHICLE: TbCar,
};
const TYPE_BADGE: Record<ProductType, string> = {
  MATERIAL: "bg-info/15 text-info",
  RECEIVED_SERVICE: "bg-warning/15 text-warning",
  PROVIDED_SERVICE: "bg-success/15 text-success",
  VEHICLE: "bg-secondary/15 text-secondary",
};

function money(v: string): string {
  return Number(v).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " ₺";
}

interface Props {
  product: Product;
  onEdit: () => void;
  onDelete?: () => void;
}

export function ProductCard({ product: p, onEdit, onDelete }: Props) {
  const Icon = TYPE_ICON[p.type];
  return (
    <div className="group flex flex-col rounded-2xl border border-gray-150 bg-white p-4 shadow-sm transition hover:shadow-lg dark:border-dark-600 dark:bg-dark-700">
      <div className="flex items-start gap-3">
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${TYPE_BADGE[p.type]}`}>
          <Icon className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-gray-800 dark:text-dark-50">{p.name}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-tiny text-gray-400">{p.code}</span>
            <span className={`rounded px-1.5 py-0.5 text-tiny font-medium ${TYPE_BADGE[p.type]}`}>
              {PRODUCT_TYPE_LABELS[p.type]}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-tiny uppercase text-gray-400">Alış</p>
          <p className="font-medium text-gray-700 dark:text-dark-100">{money(p.buyingPrice)}</p>
        </div>
        <div>
          <p className="text-tiny uppercase text-gray-400">Satış</p>
          <p className="font-medium text-gray-700 dark:text-dark-100">{money(p.sellingPrice)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-gray-150 pt-3 dark:border-dark-500">
        <span className="text-sm text-gray-500 dark:text-dark-300">
          {p.unit} · KDV %{Number(p.taxRate)}
        </span>
        <div className="flex gap-1.5 opacity-0 transition group-hover:opacity-100">
          <button type="button" onClick={onEdit} title="Düzenle" className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-primary-600 dark:bg-dark-600 dark:text-dark-200">
            <TbPencil className="size-4" />
          </button>
          {onDelete && (
            <button type="button" onClick={onDelete} title="Pasifleştir" className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-error dark:bg-dark-600 dark:text-dark-200">
              <TbTrash className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
