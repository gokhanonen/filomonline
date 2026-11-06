// Local Imports
import { BrandLogo } from "@/components/shared/BrandLogo";
import { Progress } from "@/components/ui";

// ----------------------------------------------------------------------

export function SplashScreen() {
  return (
    <>
      <div className="fixed grid h-full w-full place-content-center">
        <BrandLogo variant="full" className="h-24 w-auto shadow-md" />
        <Progress
          color="primary"
          isIndeterminate
          animationDuration="1s"
          className="mt-2 h-1"
        />
      </div>
    </>
  );
}
