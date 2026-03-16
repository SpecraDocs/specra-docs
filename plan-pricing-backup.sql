-- Original plan pricing backup (2026-03-16)
-- Use this to restore after testing payments

-- Current values:
-- | slug       | priceUsd | priceUsdAnnual | priceKes | priceKesAnnual |
-- |------------|----------|----------------|----------|----------------|
-- | free       |        0 |              0 |        0 |              0 |
-- | starter    |     1900 |           1500 |     2450 |           2450 |
-- | pro        |     4900 |           3900 |     6300 |           6300 |
-- | enterprise |        0 |              0 |        0 |              0 |

-- Restore command:
UPDATE "Plan" SET "priceUsd" = 1900, "priceUsdAnnual" = 1500, "priceKes" = 2450, "priceKesAnnual" = 2450 WHERE slug = 'starter';
UPDATE "Plan" SET "priceUsd" = 4900, "priceUsdAnnual" = 3900, "priceKes" = 6300, "priceKesAnnual" = 6300 WHERE slug = 'pro';
