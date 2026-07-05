import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { VerifyEmailContent } from "./content";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted">
          <Spinner />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
