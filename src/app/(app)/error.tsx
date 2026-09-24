"use client";

import { PageError } from "@/components/shell/page-error";

export default function AppError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <PageError {...props} />;
}
