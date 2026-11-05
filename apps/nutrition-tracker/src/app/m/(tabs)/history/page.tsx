import { HistoryTree } from "@/components/mobile/history-tree";
import { LargeTitle } from "@/components/mobile/ios";
import { requireMobileUser } from "@/lib/mobile-session";
import { getHistoryMonth } from "@/lib/nutrition/repository";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await requireMobileUser();
  const month = await getHistoryMonth(user.id, null);

  // Remounts the tree when new data arrives, so nothing it has loaded goes stale.
  const version = month.days.map((day) => `${day.day}:${day.calories}:${day.burned}`).join();

  return (
    <>
      <LargeTitle title="History" />
      {month.days.length === 0 ? (
        <p className="px-8 pt-12 text-center text-ios-secondary">Meals you log will appear here.</p>
      ) : (
        <HistoryTree key={version} initial={month} />
      )}
    </>
  );
}
