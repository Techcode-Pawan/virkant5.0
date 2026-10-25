"use client";

import React from "react";
import Link from "next/link";
import AIEmblem3D from "@/components/brand/Emblem";
import { useSession } from "@/lib/session";

const CAPABILITIES = [
  {
    title: "Answers with the page they came from",
    body: "Upload SOPs, OEM manuals and diagrams. Every answer cites the document and page, and in Documents-only mode the assistant says so plainly when your library doesn't cover a question.",
  },
  {
    title: "Hands-free on the shop floor",
    body: "Start a voice session and keep talking between questions. It listens until you end it, reads answers aloud, and stops instantly when you interrupt.",
  },
  {
    title: "Not tied to one AI provider",
    body: "Use Gemini, OpenAI, Claude or a local Ollama model. If one is down or rate-limited, the next configured provider answers, and you can see which one did.",
  },
  {
    title: "Six languages",
    body: "Ask in English, Hindi, Spanish, German, French or Japanese. Part numbers, fault codes and units stay exactly as written in the manual.",
  },
];

export default function LandingPage() {
  const { status } = useSession();
  const signedIn = status === "authenticated";

  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:pt-20">
        <div>
          <h1 className="max-w-[16ch] text-[2.5rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[3.25rem]">
            Your plant&apos;s procedures, answered in seconds.
          </h1>
          <p className="mt-5 max-w-[52ch] text-[1.0625rem] leading-relaxed text-txt-muted">
            ForgeWise AI searches your SOPs, equipment manuals and schematics, and answers operators and engineers by chat or voice, citing the exact page.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={signedIn ? "/dashboard" : "/login"} className="btn-primary h-11 px-5 text-[0.9375rem]">
              {signedIn ? "Open workspace" : "Sign in"}
            </Link>
            <Link href="/features" className="btn-secondary h-11 px-5 text-[0.9375rem]">See how it works</Link>
          </div>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-[460px]">
          <AIEmblem3D label="ForgeWise AI emblem" />
        </div>
      </section>

      <section className="border-t border-border-subtle">
        <div className="mx-auto grid max-w-6xl gap-x-12 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-2">
          {CAPABILITIES.map((c) => (
            <div key={c.title} className="max-w-[52ch]">
              <h2 className="text-[1.0625rem] font-semibold tracking-[-0.01em]">{c.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-txt-muted">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border-subtle">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <p className="max-w-[70ch] text-sm leading-relaxed text-txt-muted">
            <span className="font-medium text-straw">Safety first.</span> ForgeWise AI is a reference tool. Isolate energy sources, follow your site&apos;s Lockout/Tagout and PPE rules, and confirm critical values on the machine nameplate before starting work.
          </p>
        </div>
      </section>
    </div>
  );
}
