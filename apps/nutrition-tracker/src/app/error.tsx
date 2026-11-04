"use client";

import { Button, Card, CardContent } from "@trackerx/ui";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="flex flex-col items-start gap-3">
        <h1 className="text-base font-semibold">This page couldn&apos;t load</h1>
        <p className="text-sm text-zinc-500">
          The server may not be able to reach the database. Check that it&apos;s running, then try
          again.
        </p>
        <Button onClick={reset}>Try again</Button>
      </CardContent>
    </Card>
  );
}
