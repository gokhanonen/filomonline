import {
  EnvelopeIcon,
  ArrowTopRightOnSquareIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { type Lead } from "@/services/crmService";
import { LEAD_STATUS_CONFIG, LEAD_SOURCE_CONFIG } from "./constants";

interface Props {
  leads: Lead[];
  onSelectLead: (leadId: string) => void;
}

export function TableView({ leads, onSelectLead }: Props) {
  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center text-xs text-gray-400 dark:border-dark-700">
        Arama kriterlerinize uygun potansiyel alıcı bulunamadı.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xs dark:border-dark-600 dark:bg-dark-800">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-gray-200/80 bg-gray-50/80 text-tiny font-bold uppercase tracking-wider text-gray-500 dark:border-dark-600 dark:bg-dark-850 dark:text-dark-200">
            <tr>
              <th className="px-4 py-3">Potansiyel Alıcı</th>
              <th className="px-4 py-3">İletişim</th>
              <th className="px-4 py-3">Kaynak</th>
              <th className="px-4 py-3">Aşama</th>
              <th className="px-4 py-3">İlgilendiği Araçlar</th>
              <th className="px-4 py-3 text-right">Bütçe</th>
              <th className="px-4 py-3 text-center">İşlem / Randevu</th>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3 text-right">Aksiyon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
            {leads.map((lead) => {
              const statusCfg = LEAD_STATUS_CONFIG[lead.status];
              const sourceCfg = LEAD_SOURCE_CONFIG[lead.source];

              return (
                <tr
                  key={lead.id}
                  onClick={() => onSelectLead(lead.id)}
                  className="cursor-pointer transition-colors hover:bg-gray-50/80 dark:hover:bg-dark-750"
                >
                  {/* Ad Soyad */}
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-gray-900 dark:text-dark-50">
                      {lead.fullName}
                    </div>
                    {lead.email && (
                      <div className="flex items-center gap-1 text-tiny text-gray-400">
                        <EnvelopeIcon className="size-3" />
                        <span>{lead.email}</span>
                      </div>
                    )}
                  </td>

                  {/* İletişim */}
                  <td className="px-4 py-3.5">
                    {lead.phone ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-700 dark:text-dark-200">
                          {lead.phone}
                        </span>
                        <a
                          href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                          title="WhatsApp Aç"
                        >
                          <ArrowTopRightOnSquareIcon className="size-3.5" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  {/* Kaynak */}
                  <td className="px-4 py-3.5">
                    {sourceCfg ? (
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${sourceCfg.badgeColor}`}
                      >
                        {sourceCfg.label}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  {/* Aşama */}
                  <td className="px-4 py-3.5">
                    {statusCfg && (
                      <Badge color={statusCfg.color} variant="soft" className="text-tiny">
                        {statusCfg.label}
                      </Badge>
                    )}
                  </td>

                  {/* İlgilendiği Araçlar */}
                  <td className="px-4 py-3.5">
                    {lead.interestedVehicles && lead.interestedVehicles.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {lead.interestedVehicles.slice(0, 2).map((iv) => (
                          <span
                            key={iv.id}
                            className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-tiny font-semibold text-gray-700 dark:bg-dark-700 dark:text-dark-200"
                          >
                            {iv.vehicle?.plate}
                          </span>
                        ))}
                        {lead.interestedVehicles.length > 2 && (
                          <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-tiny text-gray-400 dark:bg-dark-700">
                            +{lead.interestedVehicles.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">Araç seçilmedi</span>
                    )}
                  </td>

                  {/* Bütçe */}
                  <td className="px-4 py-3.5 text-right font-medium text-gray-900 dark:text-dark-100">
                    {lead.budget ? (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {Number(lead.budget).toLocaleString("tr-TR")} TL
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  {/* Randevu / Teklif */}
                  <td className="px-4 py-3.5 text-center text-tiny text-gray-600 dark:text-dark-300">
                    <span className="inline-flex gap-2">
                      <span title="Deneme Sürüşü">🚗 {lead._count?.testDrives ?? 0}</span>
                      <span title="Teklif">📄 {lead._count?.quotes ?? 0}</span>
                    </span>
                  </td>

                  {/* Tarih */}
                  <td className="px-4 py-3.5 text-tiny text-gray-500 dark:text-dark-300">
                    {new Date(lead.createdAt).toLocaleDateString("tr-TR")}
                  </td>

                  {/* Aksiyon */}
                  <td className="px-4 py-3.5 text-right">
                    <Button
                      variant="outlined"
                      color="neutral"
                      className="gap-1 px-2.5 py-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLead(lead.id);
                      }}
                    >
                      <EyeIcon className="size-3.5" />
                      <span>Detay</span>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
