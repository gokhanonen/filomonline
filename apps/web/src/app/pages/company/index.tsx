import { Page } from "@/components/shared/Page";
import { CompanySettingsCard } from "@/app/pages/settings/components/CompanySettingsCard";

export default function CompanyPage() {
  return (
    <Page title="Firma Tanımları">
      <div className="w-full max-w-5xl px-(--margin-x) py-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            Firma Tanımları
          </h2>
          <p className="text-sm text-gray-400 dark:text-dark-300">
            Aktif firmanızın logo, resmi ticari unvan, vergi ve iletişim bilgilerini yönetin
          </p>
        </div>

        <CompanySettingsCard />
      </div>
    </Page>
  );
}
