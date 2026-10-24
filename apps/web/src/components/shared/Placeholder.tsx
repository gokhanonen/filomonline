// Modül sayfaları yazılana kadar kullanılan geçici içerik.
import { Page } from "@/components/shared/Page";
import { Card } from "@/components/ui";

interface PlaceholderProps {
  title: string;
  description?: string;
}

export default function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <Page title={title}>
      <main className="w-full px-(--margin-x) py-6">
        <h2 className="text-xl font-medium text-gray-800 dark:text-dark-50">
          {title}
        </h2>
        <Card className="mt-4 flex min-h-48 items-center justify-center p-6 text-center">
          <p className="text-gray-400 dark:text-dark-300">
            {description ?? "Bu modül yakında eklenecek."}
          </p>
        </Card>
      </main>
    </Page>
  );
}
