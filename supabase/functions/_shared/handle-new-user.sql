CREATE OR REPLACE VIEW wilaya_distribution AS
SELECT 
  p.raw_user_meta_data->>'wilaya' as wilaya,
  COUNT(*) as user_count
FROM auth.users p
WHERE p.raw_user_meta_data->>'wilaya' IS NOT NULL
GROUP BY p.raw_user_meta_data->>'wilaya'
HAVING COUNT(*) > 0;