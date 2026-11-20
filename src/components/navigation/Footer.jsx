import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../common/Logo';
import { Mail, Phone, MapPin, ShieldCheck, Heart } from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Logo isWhite={true} size="lg" showTagline={true} />
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              StockLine is a next-generation MERN inventory management and multi-channel order fulfillment
              platform built for fast-moving businesses, warehouses, and retailers.
            </p>
            <div className="pt-2 text-xs text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>University Software Engineering Lab Demo Project</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/"
                  onClick={() => {
                    if (window.location.pathname === '/') {
                      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                    }
                  }}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-emerald-400 transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-emerald-400 transition-colors">
                  Public Storefront
                </Link>
              </li>
              <li>
                <Link to="/demo-access" className="hover:text-emerald-400 transition-colors">
                  Demo Roles Hub
                </Link>
              </li>
            </ul>
          </div>

          {/* Management Modules */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">SaaS Modules</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Product Catalog & SKUs</li>
              <li>Purchase Orders & Intake</li>
              <li>Sales & POS Invoicing</li>
              <li>Stock Rebalancing</li>
              <li>Real-time Reports</li>
            </ul>
          </div>

          {/* Contact (Placeholder) */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Support & Lab</h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>support@stockline-demo.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>+880 1711-000000 (Demo)</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Dhaka, Bangladesh</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {currentYear} StockLine. All rights reserved. Built with React & Tailwind.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-slate-300 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-slate-300 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
