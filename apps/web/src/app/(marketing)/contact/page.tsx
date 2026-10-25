"use client";

import React, { useState } from "react";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");

  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`ForgeWise AI enquiry${company ? ` from ${company}` : ""}`)}&body=${encodeURIComponent(`${message}\n\n${name}${company ? `, ${company}` : ""}`)}`;

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em]">Contact</h1>
      <p className="mt-2 text-sm text-txt-muted">
        Questions about deployment, on-premise installation or onboarding a plant.
      </p>
      {CONTACT_EMAIL ? (
        <form
          className="panel mt-8 space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            window.location.href = mailto;
          }}
        >
          <div>
            <label className="label" htmlFor="c-name">Your name</label>
            <input id="c-name" className="field" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="c-company">Company (optional)</label>
            <input id="c-company" className="field" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="c-msg">Message</label>
            <textarea id="c-msg" rows={5} className="field h-auto py-2" value={message} onChange={(e) => setMessage(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary">Open in your e-mail app</button>
          <p className="text-xs text-txt-faint">This opens a pre-filled e-mail to {CONTACT_EMAIL}. Nothing is sent from this page.</p>
        </form>
      ) : (
        <p className="panel mt-8 p-6 text-sm text-txt-muted">
          Contact your ForgeWise administrator. To show a contact form here, set NEXT_PUBLIC_CONTACT_EMAIL in apps/web/.env.local.
        </p>
      )}
    </div>
  );
}
