import React from 'react';
import { Card } from '../../components/common/Card';
import { FileText } from 'lucide-react';

export const TermsOfServicePage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-3">
          <FileText className="h-4 w-4" />
          <span>Terms of Demonstration</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Terms of Service
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          StockLine Inventory Management System · Academic Prototype
        </p>
      </div>

      <Card className="p-6 sm:p-8 space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            1. Acceptance of Terms
          </h2>
          <p>
            By interacting with the StockLine frontend prototype, you acknowledge that this is a simulated
            environment built for educational evaluation of modern React.js, Tailwind CSS, and client-side data
            orchestration architectures.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            2. Simulated Transactions & Mock Payments
          </h2>
          <p>
            Purchases, sales orders, checkout submissions, and receipt prints generated inside this application
            represent mock business events. No real monetary transactions or deliveries are executed.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            3. Disclaimer of Warranty
          </h2>
          <p>
            The prototype is provided "as is" without warranty of continuous uptime or persistence beyond
            the lifecycle of local browser storage.
          </p>
        </section>
      </Card>
    </div>
  );
};
