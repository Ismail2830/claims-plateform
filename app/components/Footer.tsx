import { ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-100 py-8 sm:py-10 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <ShieldCheck className="text-white w-4 h-4" />
            </div>
            <span className="text-base sm:text-lg font-bold">ISM Assurance</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 sm:gap-8 text-sm text-neutral-500">
            <a href="#" className="hover:text-blue-600 transition-colors">Confidentialité</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Conditions d'utilisation</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Contact</a>
            <a href="/auth/admin" className="hover:text-blue-600 transition-colors">Administration</a>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 text-center md:text-right">© 2026 SinistreConnect. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}