-- Seed initial premium rates for the chatbot devis estimation
-- Admin can update these via the platform at any time.
-- Formula: premium = base_premium + (age * rate_per_year)

INSERT INTO premium_rates (id, policy_type, base_premium, rate_per_year, description, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'AUTO',         1200.00, 15.00, 'RC Auto / Tiers Plus / Tous Risques',      true, now(), now()),
  (gen_random_uuid(), 'HOME',          800.00, 10.00, 'Multirisques Habitation / Incendie',        true, now(), now()),
  (gen_random_uuid(), 'HEALTH',       2400.00, 30.00, 'AMO / Complémentaire Santé',                true, now(), now()),
  (gen_random_uuid(), 'LIFE',          600.00, 20.00, 'Décès / Épargne Vie / Retraite',            true, now(), now()),
  (gen_random_uuid(), 'PROFESSIONAL', 1800.00, 12.00, 'Multirisques Professionnelle',              true, now(), now()),
  (gen_random_uuid(), 'CONSTRUCTION', 3000.00, 18.00, 'TRC + RCD',                                 true, now(), now()),
  (gen_random_uuid(), 'ACCIDENT',      500.00,  8.00, 'Accidents Corporels',                       true, now(), now()),
  (gen_random_uuid(), 'TRANSPORT',    1500.00, 10.00, 'Maritime / Aérien / Terrestre marchandises',true, now(), now())
ON CONFLICT (policy_type) DO UPDATE SET
  base_premium = EXCLUDED.base_premium,
  rate_per_year = EXCLUDED.rate_per_year,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = now();
