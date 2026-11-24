import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage = () => {
  const { language, t } = useLanguage();

  const l = (texts) => {
    if (language === 'en') return texts.en;
    if (language === 'obro') return texts.obro || `${texts.bn} (${texts.en})`;
    return texts.bn;
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="text-6xl font-extrabold text-emerald-500 font-mono">404</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {l({ bn: 'পৃষ্ঠাটি পাওয়া যায়নি', en: 'Page Not Found', obro: 'Page Not Found' })}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {l({
              bn: 'আপনি যে পৃষ্ঠাটি খুঁজছেন তা বিদ্যমান নেই বা স্থানান্তরিত হয়েছে।',
              en: 'The page you are looking for does not exist or has been relocated in the StockLine system.',
              obro: 'Ei page-ti paowa jayni ba shorano hoyeche.',
            })}
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link to="/">
            <Button variant="outline" icon={Home}>
              {l({ bn: 'হোম পেজ', en: 'Home', obro: 'Home' })}
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="primary">
              {l({ bn: 'ড্যাশবোর্ডে যান', en: 'Go to Dashboard', obro: 'Go to Dashboard' })}
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
