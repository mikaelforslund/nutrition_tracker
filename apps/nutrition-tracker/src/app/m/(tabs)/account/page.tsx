import { CircleUserRound } from "lucide-react";
import { switchPerson } from "@/app/m/actions";
import { LargeTitle, Row, Section } from "@/components/mobile/ios";
import { requireMobileUser } from "@/lib/mobile-session";
import { getProfile } from "@/lib/nutrition/repository";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireMobileUser();
  const profile = await getProfile(user.id);

  return (
    <>
      <LargeTitle title="Account" />

      <Section footer="There are no passwords yet, so anyone using this app can pick any name.">
        <div className="flex items-center gap-3 px-4 py-3">
          <CircleUserRound aria-hidden className="size-12 text-ios-tertiary" strokeWidth={1.25} />
          <div>
            <p className="font-medium">{profile.displayName ?? "Unknown"}</p>
            <p className="text-[13px] text-ios-secondary">Not signed in</p>
          </div>
        </div>
        <Row label="Sign In" value="Coming Soon" />
      </Section>

      <Section header="Daily Goals" footer="Change these on the desktop dashboard.">
        <Row label="Calories" value={`${profile.targetCalories.toLocaleString("en-US")} kcal`} />
        <Row label="Protein" value={`${profile.targetProteinG} g`} />
        <Row label="Carbs" value={`${profile.targetCarbsG} g`} />
        <Row label="Fat" value={`${profile.targetFatG} g`} />
      </Section>

      <Section>
        <form action={switchPerson}>
          <button type="submit" className="h-11 w-full text-ios-red active:bg-ios-fill">
            Switch Person
          </button>
        </form>
      </Section>
    </>
  );
}
