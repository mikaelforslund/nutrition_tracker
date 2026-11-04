import { ChevronRight } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { choosePerson } from "@/app/m/actions";
import { AddPersonForm } from "@/components/mobile/add-person-form";
import { getEnv } from "@/lib/env";
import { LAST_PERSON_COOKIE, findPerson } from "@/lib/sessions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome" };

/**
 * AUTH PLACEHOLDER: the email button is disabled on purpose. Only this device's
 * last person is offered, so one person's name isn't shown to anyone else.
 */
export default async function SignInPage() {
  if (getEnv().AUTH_MODE !== "mock") redirect("/login");

  const lastPersonId = (await cookies()).get(LAST_PERSON_COOKIE)?.value;
  const person = lastPersonId ? await findPerson(lastPersonId) : null;

  return (
    <main className="flex min-h-dvh flex-col px-6 pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <div className="flex flex-col items-center text-center">
        <img src="/icon.svg" alt="" className="size-20 rounded-[18px]" />
        <h1 className="mt-5 text-[34px] leading-tight font-bold tracking-tight">Who&apos;s Using This?</h1>
        <p className="mt-1 text-ios-secondary">
          {person ? "Continue, or enter a different name." : "Enter your name to continue."}
        </p>
      </div>

      {person ? (
        <form action={choosePerson.bind(null, person.userId)} className="mt-8">
          <button
            type="submit"
            className="flex min-h-[50px] w-full items-center gap-3 rounded-[12px] bg-ios-card px-4 text-left active:bg-ios-fill"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-ios-blue text-[15px] font-semibold text-white">
              {person.displayName.slice(0, 1).toUpperCase()}
            </span>
            <span className="flex-1 truncate">{person.displayName}</span>
            <ChevronRight aria-hidden className="size-4 text-ios-tertiary" />
          </button>
        </form>
      ) : null}

      <div className="mt-6">
        <AddPersonForm />
      </div>

      <div className="mt-auto pt-8">
        <button
          type="button"
          disabled
          className="h-[50px] w-full rounded-[12px] bg-ios-fill font-semibold text-ios-tertiary"
        >
          Sign In with Email
        </button>
        <p className="mt-2 text-center text-[13px] text-ios-secondary">Sign in is coming soon.</p>
      </div>
    </main>
  );
}
