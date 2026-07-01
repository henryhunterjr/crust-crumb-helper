
-- 1) Merge & dedupe rows sharing the same email (case-insensitive)
WITH ranked AS (
  SELECT id, lower(email) AS ek,
         ROW_NUMBER() OVER (
           PARTITION BY lower(email)
           ORDER BY (CASE WHEN array_length(communities,1) IS NULL THEN 1 ELSE 0 END),
                    (CASE WHEN skool_username IS NULL THEN 1 ELSE 0 END),
                    created_at ASC
         ) AS rn
  FROM public.members
  WHERE email IS NOT NULL AND email <> ''
),
keepers AS (SELECT id, ek FROM ranked WHERE rn = 1),
merged AS (
  SELECT k.id AS keeper_id,
         ARRAY(SELECT DISTINCT unnest(array_agg(coalesce(m.communities, ARRAY[]::text[])) FILTER (WHERE m.communities IS NOT NULL))) AS all_comms_raw
  FROM keepers k
  JOIN public.members m ON lower(m.email) = k.ek
  GROUP BY k.id
)
UPDATE public.members m
SET communities = (
  SELECT ARRAY(SELECT DISTINCT x FROM (
    SELECT unnest(coalesce(mm.communities, ARRAY[]::text[])) AS x
    FROM public.members mm WHERE lower(mm.email) = lower(m.email)
  ) t WHERE x IS NOT NULL AND x <> '')
),
wingman_tags = (
  SELECT ARRAY(SELECT DISTINCT x FROM (
    SELECT unnest(coalesce(mm.wingman_tags, ARRAY[]::text[])) AS x
    FROM public.members mm WHERE lower(mm.email) = lower(m.email)
  ) t WHERE x IS NOT NULL AND x <> '')
)
FROM keepers k
WHERE m.id = k.id;

-- 2) Delete non-keeper duplicates (email-based)
DELETE FROM public.members m
USING (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY lower(email)
    ORDER BY (CASE WHEN array_length(communities,1) IS NULL THEN 1 ELSE 0 END),
             (CASE WHEN skool_username IS NULL THEN 1 ELSE 0 END),
             created_at ASC
  ) AS rn
  FROM public.members
  WHERE email IS NOT NULL AND email <> ''
) r
WHERE m.id = r.id AND r.rn > 1;

-- 3) Dedupe null-email rows by lower(skool_name)
DELETE FROM public.members m
USING (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY lower(skool_name)
    ORDER BY created_at ASC
  ) AS rn
  FROM public.members
  WHERE (email IS NULL OR email = '') AND skool_name IS NOT NULL
) r
WHERE m.id = r.id AND r.rn > 1;

-- 4) Prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS members_email_lower_uniq
  ON public.members (lower(email))
  WHERE email IS NOT NULL AND email <> '';
