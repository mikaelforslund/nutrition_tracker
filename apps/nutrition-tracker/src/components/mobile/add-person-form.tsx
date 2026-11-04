"use client";

import { useActionState } from "react";
import { addPerson, type SignInState } from "@/app/m/actions";

const INITIAL: SignInState = {};

export function AddPersonForm() {
  const [state, action, isPending] = useActionState(addPerson, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-3">
      {/* New people start in this device's timezone so "today" is right for them. */}
      <input
        type="hidden"
        name="timezone"
        ref={(input) => {
          if (input) input.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
        }}
      />
      <input
        name="name"
        aria-label="Your name"
        placeholder="Your name"
        autoComplete="given-name"
        required
        maxLength={40}
        className="h-[50px] w-full rounded-[12px] bg-ios-card px-4 text-ios-label outline-none placeholder:text-ios-tertiary"
      />
      {state.message ? <p className="px-1 text-[13px] text-ios-red">{state.message}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="h-[50px] w-full rounded-[12px] bg-ios-blue font-semibold text-white active:opacity-80 disabled:opacity-50"
      >
        Continue
      </button>
    </form>
  );
}
