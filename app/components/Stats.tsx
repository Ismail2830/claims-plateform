import React from 'react';

export function Stats() {
  return (
    <section className="py-12 bg-neutral-50 border-y border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <p className="text-3xl font-bold text-neutral-900">15 min</p>
            <p className="text-sm text-neutral-500">Temps moyen de déclaration</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-neutral-900">24/7</p>
            <p className="text-sm text-neutral-500">Support disponible</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-neutral-900">95%</p>
            <p className="text-sm text-neutral-500">Satisfaction client</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-neutral-900">1M€+</p>
            <p className="text-sm text-neutral-500">Indemnisations versées</p>
          </div>
        </div>
      </div>
    </section>
  );
}