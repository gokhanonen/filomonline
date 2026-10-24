import { Page } from "@/components/shared/Page";
import { DefinitionsNav } from "@/components/shared/DefinitionsNav";
import { CompanySettingsCard } from "@/app/pages/settings/components/CompanySettingsCard";

export default function CompanyPage() {
  return (
    <Page title="Tanımlar - Firma">
      <div className="w-full px-(--margin-x) py-4 space-y-4">
        <DefinitionsNav activeId="company" />
        <div className="max-w-5xl">
          <CompanySettingsCard />
        </div>
      </div>
    </Page>
  );
}
