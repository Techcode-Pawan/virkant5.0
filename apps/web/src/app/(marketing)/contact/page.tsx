"use client";

import React, { useState } from "react";
import { Mail, CheckCircle2, Building, Send } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      <div className="text-center space-y-3">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-teal">
          Enterprise Deployments
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-txt-primary">
          Connect With Our Engineering Team
        </h1>
        <p className="text-sm text-txt-muted leading-relaxed">
          Request private on-premise air-gapped deployment specs or enterprise facility onboarding.
        </p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface p-8 shadow-sm">
        {submitted ? (
          <div className="text-center space-y-3 py-8">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
            <h3 className="text-lg font-semibold text-txt-primary">
              Inquiry Dispatched
            </h3>
            <p className="text-xs text-txt-muted">
              Our industrial solutions architecture team will follow up within one business day.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="Marcus Cole"
                className="w-full rounded-md border border-border-subtle bg-elevated/50 px-3.5 py-2 text-sm text-txt-primary focus:outline-none focus:border-teal"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1">
                Plant Facility / Organization
              </label>
              <input
                type="text"
                required
                placeholder="Precision Forging Plant 3"
                className="w-full rounded-md border border-border-subtle bg-elevated/50 px-3.5 py-2 text-sm text-txt-primary focus:outline-none focus:border-teal"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1">
                Work Email
              </label>
              <input
                type="email"
                required
                placeholder="m.cole@plant.example.com"
                className="w-full rounded-md border border-border-subtle bg-elevated/50 px-3.5 py-2 text-sm text-txt-primary focus:outline-none focus:border-teal"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1">
                Equipment Types & Deployment Scope
              </label>
              <textarea
                rows={4}
                required
                placeholder="Describe machine types (CNC mills, hydraulic presses, turbines) and document volume..."
                className="w-full rounded-md border border-border-subtle bg-elevated/50 px-3.5 py-2 text-sm text-txt-primary focus:outline-none focus:border-teal"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-md bg-brand py-2.5 text-sm font-semibold text-white shadow-xs hover:opacity-90 transition-opacity"
            >
              <Send className="h-4 w-4" />
              <span>Submit Enterprise Request</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
