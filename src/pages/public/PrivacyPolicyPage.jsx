import React from 'react';
import { Card } from '../../components/common/Card';
import { ShieldCheck } from 'lucide-react';

export const PrivacyPolicyPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-3">
          <ShieldCheck className="h-4 w-4" />
          <span>University Lab Demo Privacy Policy</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Last updated: October 2026 · StockLine Inventory System
        </p>
      </div>

      <Card className="p-6 sm:p-8 space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            1. Scope and University Educational Notice
          </h2>
          <p>
            StockLine is an academic Software Engineering Lab prototype frontend demonstrating the MERN
            architecture. All demo data, customer entries, purchase orders, and sales records are maintained
            strictly inside your web browser’s LocalStorage and are not transmitted to external production servers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            2. Data Collected Locally
          </h2>
          <p>
            When utilizing the demo modules, your browser saves names, demo SKUs, simulated order delivery
            addresses, and user role selections. You can completely purge this information at any time
            through the Settings menu using the "Reset Demo Data" action or by clearing browser site storage.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            3. Future Backend Integration
          </h2>
          <p>
            Upon future completion of the Express.js and MongoDB backend phase, user authentication tokens
            and business documents will be secured with enterprise encryption standards and JWT authentication.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            4. Contact
          </h2>
          <p>
            For inquiries regarding this software engineering lab project, reach out to the project maintainers
            at <span className="font-mono text-emerald-600">support@stockline-demo.com</span>.
          </p>
        </section>
      </Card>
    </div>
  );
};
