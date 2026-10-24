import { Page } from "@/components/shared/Page";
import { DefinitionsNav } from "@/components/shared/DefinitionsNav";
import { CompanySettingsCard } from "@/app/pages/settings/components/CompanySettingsCard";

export default function CompanyPage() {
  return (
    <Page title="Tanımlar - Firma">
      <div className="w-full px-(--margin-x) py-6 space-y-6">
        <DefinitionsNav activeId="company" />
        <div className="max-w-5xl">
          <CompanySettingsCard />
        </div>
      </div>
    </Page>
  );
}
