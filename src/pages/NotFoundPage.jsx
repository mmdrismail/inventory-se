import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="text-6xl font-extrabold text-emerald-500 font-mono">404</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            The page you are looking for does not exist or has been relocated in the StockLine system.
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link to="/">
            <Button variant="outline" icon={Home}>
              Home
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="primary">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
