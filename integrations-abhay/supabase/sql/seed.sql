-- =============================================================================
-- CareMap Integrations — Seed Data
-- =============================================================================
-- Demo seed data for hackathon. NO REAL PII.
--
-- HACKATHON NOTE:
-- - All provider names, addresses, and network mappings are FICTIONAL or
--   representative examples for demo purposes.
-- - Network status is assigned heuristically based on name patterns:
--   - "UPMC" => in-network for UPMC plan
--   - "AHN" / "Allegheny" => in-network for Aetna plan
--   - Urgent care chains => in-network for all plans
-- - This does NOT reflect actual insurance network agreements.
--
-- Pittsburgh coordinates: ~40.44, -79.99
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Clear existing seed data (for re-running)
-- -----------------------------------------------------------------------------
TRUNCATE provider_networks CASCADE;
TRUNCATE providers CASCADE;
TRUNCATE insurance_plans CASCADE;

-- -----------------------------------------------------------------------------
-- Insurance Plans
-- -----------------------------------------------------------------------------
INSERT INTO insurance_plans (id, payer, plan_name, network, state) VALUES
    ('11111111-1111-1111-1111-111111111111', 'BCBSTX', 'Blue Choice PPO Demo', 'PPO', 'PA'),
    ('22222222-2222-2222-2222-222222222222', 'Aetna', 'Open Choice PPO Demo', 'PPO', 'PA'),
    ('33333333-3333-3333-3333-333333333333', 'UPMC', 'UPMC PPO Demo', 'PPO', 'PA');

-- -----------------------------------------------------------------------------
-- Providers - Hospitals
-- -----------------------------------------------------------------------------
INSERT INTO providers (id, name, types, specialties, address, lat, lng, phone, website) VALUES
    -- UPMC Hospitals
    ('aaaaaaaa-0001-0001-0001-000000000001', 
     'UPMC Presbyterian Hospital', 
     ARRAY['hospital', 'health'], 
     ARRAY['emergency', 'surgery', 'cardiology', 'oncology'],
     '{"line1": "200 Lothrop St", "city": "Pittsburgh", "state": "PA", "zip": "15213"}',
     40.4416, -79.9569, '+1-412-647-2345', 'https://www.upmc.com/presbyterian'),
    
    ('aaaaaaaa-0001-0001-0001-000000000002', 
     'UPMC Shadyside Hospital', 
     ARRAY['hospital', 'health'], 
     ARRAY['emergency', 'oncology', 'womens_health'],
     '{"line1": "5230 Centre Ave", "city": "Pittsburgh", "state": "PA", "zip": "15232"}',
     40.4554, -79.9392, '+1-412-623-2121', 'https://www.upmc.com/shadyside'),
    
    ('aaaaaaaa-0001-0001-0001-000000000003', 
     'UPMC Mercy Hospital', 
     ARRAY['hospital', 'health'], 
     ARRAY['emergency', 'trauma', 'burn_center'],
     '{"line1": "1400 Locust St", "city": "Pittsburgh", "state": "PA", "zip": "15219"}',
     40.4328, -79.9825, '+1-412-232-8111', 'https://www.upmc.com/mercy'),
    
    -- AHN / Allegheny Hospitals
    ('aaaaaaaa-0001-0001-0001-000000000004', 
     'Allegheny General Hospital', 
     ARRAY['hospital', 'health'], 
     ARRAY['emergency', 'cardiology', 'neurology', 'trauma'],
     '{"line1": "320 E North Ave", "city": "Pittsburgh", "state": "PA", "zip": "15212"}',
     40.4548, -79.9943, '+1-412-359-3131', 'https://www.ahn.org/agh'),
    
    ('aaaaaaaa-0001-0001-0001-000000000005', 
     'AHN Forbes Hospital', 
     ARRAY['hospital', 'health'], 
     ARRAY['emergency', 'orthopedics', 'surgery'],
     '{"line1": "2570 Haymaker Rd", "city": "Monroeville", "state": "PA", "zip": "15146"}',
     40.4298, -79.7589, '+1-412-858-2000', 'https://www.ahn.org/forbes'),
    
    ('aaaaaaaa-0001-0001-0001-000000000006', 
     'AHN West Penn Hospital', 
     ARRAY['hospital', 'health'], 
     ARRAY['emergency', 'womens_health', 'neonatal'],
     '{"line1": "4800 Friendship Ave", "city": "Pittsburgh", "state": "PA", "zip": "15224"}',
     40.4621, -79.9456, '+1-412-578-5000', 'https://www.ahn.org/westpenn');

-- -----------------------------------------------------------------------------
-- Providers - Urgent Care
-- -----------------------------------------------------------------------------
INSERT INTO providers (id, name, types, specialties, address, lat, lng, phone, website) VALUES
    ('bbbbbbbb-0002-0002-0002-000000000001', 
     'MedExpress Urgent Care - Oakland', 
     ARRAY['doctor', 'health'], 
     ARRAY['urgent_care', 'primary_care'],
     '{"line1": "3708 Forbes Ave", "city": "Pittsburgh", "state": "PA", "zip": "15213"}',
     40.4383, -79.9561, '+1-412-621-7777', 'https://www.medexpress.com'),
    
    ('bbbbbbbb-0002-0002-0002-000000000002', 
     'MedExpress Urgent Care - South Hills', 
     ARRAY['doctor', 'health'], 
     ARRAY['urgent_care', 'primary_care'],
     '{"line1": "2865 Banksville Rd", "city": "Pittsburgh", "state": "PA", "zip": "15216"}',
     40.4012, -80.0234, '+1-412-531-7777', 'https://www.medexpress.com'),
    
    ('bbbbbbbb-0002-0002-0002-000000000003', 
     'UPMC Urgent Care - Waterfront', 
     ARRAY['doctor', 'health'], 
     ARRAY['urgent_care', 'primary_care'],
     '{"line1": "180 E Waterfront Dr", "city": "Homestead", "state": "PA", "zip": "15120"}',
     40.4056, -79.9112, '+1-412-476-5600', 'https://www.upmc.com/urgentcare'),
    
    ('bbbbbbbb-0002-0002-0002-000000000004', 
     'ConvenientCare Urgent Care - Squirrel Hill', 
     ARRAY['doctor', 'health'], 
     ARRAY['urgent_care', 'primary_care'],
     '{"line1": "5850 Forbes Ave", "city": "Pittsburgh", "state": "PA", "zip": "15217"}',
     40.4312, -79.9201, '+1-412-421-2500', NULL);

-- -----------------------------------------------------------------------------
-- Providers - Imaging Centers
-- -----------------------------------------------------------------------------
INSERT INTO providers (id, name, types, specialties, address, lat, lng, phone, website) VALUES
    ('cccccccc-0003-0003-0003-000000000001', 
     'UPMC Imaging Services - Monroeville', 
     ARRAY['health'], 
     ARRAY['radiology', 'imaging', 'mri', 'ct_scan'],
     '{"line1": "2580 Mosside Blvd", "city": "Monroeville", "state": "PA", "zip": "15146"}',
     40.4287, -79.7612, '+1-412-864-2100', 'https://www.upmc.com/imaging'),
    
    ('cccccccc-0003-0003-0003-000000000002', 
     'Allegheny Imaging Associates', 
     ARRAY['health'], 
     ARRAY['radiology', 'imaging', 'mammography'],
     '{"line1": "1307 Federal St", "city": "Pittsburgh", "state": "PA", "zip": "15212"}',
     40.4561, -80.0089, '+1-412-359-6800', 'https://www.ahn.org/imaging'),
    
    ('cccccccc-0003-0003-0003-000000000003', 
     'Independent Imaging Center', 
     ARRAY['health'], 
     ARRAY['radiology', 'imaging', 'ultrasound'],
     '{"line1": "420 E North Ave", "city": "Pittsburgh", "state": "PA", "zip": "15212"}',
     40.4532, -79.9901, '+1-412-321-4500', NULL);

-- -----------------------------------------------------------------------------
-- Providers - Primary Care
-- -----------------------------------------------------------------------------
INSERT INTO providers (id, name, types, specialties, address, lat, lng, phone, website) VALUES
    ('dddddddd-0004-0004-0004-000000000001', 
     'UPMC Internal Medicine - Oakland', 
     ARRAY['doctor', 'health'], 
     ARRAY['primary_care', 'internal_medicine'],
     '{"line1": "3601 Fifth Ave", "city": "Pittsburgh", "state": "PA", "zip": "15213"}',
     40.4401, -79.9589, '+1-412-692-4000', 'https://www.upmc.com/primarycare'),
    
    ('dddddddd-0004-0004-0004-000000000002', 
     'AHN Primary Care - Wexford', 
     ARRAY['doctor', 'health'], 
     ARRAY['primary_care', 'family_medicine'],
     '{"line1": "12311 Perry Hwy", "city": "Wexford", "state": "PA", "zip": "15090"}',
     40.6234, -80.0567, '+1-724-934-5600', 'https://www.ahn.org/primarycare'),
    
    ('dddddddd-0004-0004-0004-000000000003', 
     'Shadyside Family Medicine', 
     ARRAY['doctor', 'health'], 
     ARRAY['primary_care', 'family_medicine', 'pediatrics'],
     '{"line1": "5231 Centre Ave", "city": "Pittsburgh", "state": "PA", "zip": "15232"}',
     40.4556, -79.9387, '+1-412-621-3400', NULL),
    
    ('dddddddd-0004-0004-0004-000000000004', 
     'South Hills Medical Associates', 
     ARRAY['doctor', 'health'], 
     ARRAY['primary_care', 'internal_medicine'],
     '{"line1": "1500 Oxford Dr", "city": "Bethel Park", "state": "PA", "zip": "15102"}',
     40.3278, -80.0345, '+1-412-831-2000', NULL);

-- -----------------------------------------------------------------------------
-- Providers - Cardiology
-- -----------------------------------------------------------------------------
INSERT INTO providers (id, name, types, specialties, address, lat, lng, phone, website) VALUES
    ('eeeeeeee-0005-0005-0005-000000000001', 
     'UPMC Heart & Vascular Institute', 
     ARRAY['doctor', 'hospital'], 
     ARRAY['cardiology', 'cardiovascular_surgery', 'electrophysiology'],
     '{"line1": "200 Lothrop St", "city": "Pittsburgh", "state": "PA", "zip": "15213"}',
     40.4418, -79.9565, '+1-412-647-2345', 'https://www.upmc.com/heart'),
    
    ('eeeeeeee-0005-0005-0005-000000000002', 
     'Allegheny Cardiology Associates', 
     ARRAY['doctor'], 
     ARRAY['cardiology', 'interventional_cardiology'],
     '{"line1": "320 E North Ave", "city": "Pittsburgh", "state": "PA", "zip": "15212"}',
     40.4545, -79.9940, '+1-412-359-8900', 'https://www.ahn.org/cardiology'),
    
    ('eeeeeeee-0005-0005-0005-000000000003', 
     'Pittsburgh Cardiology Specialists', 
     ARRAY['doctor'], 
     ARRAY['cardiology', 'preventive_cardiology'],
     '{"line1": "580 S Aiken Ave", "city": "Pittsburgh", "state": "PA", "zip": "15232"}',
     40.4523, -79.9345, '+1-412-661-5500', NULL);

-- -----------------------------------------------------------------------------
-- Providers - Orthopedics
-- -----------------------------------------------------------------------------
INSERT INTO providers (id, name, types, specialties, address, lat, lng, phone, website) VALUES
    ('ffffffff-0006-0006-0006-000000000001', 
     'UPMC Sports Medicine - South Side', 
     ARRAY['doctor', 'health'], 
     ARRAY['orthopedics', 'sports_medicine', 'physical_therapy'],
     '{"line1": "3200 S Water St", "city": "Pittsburgh", "state": "PA", "zip": "15203"}',
     40.4267, -79.9678, '+1-412-432-3600', 'https://www.upmc.com/sports'),
    
    ('ffffffff-0006-0006-0006-000000000002', 
     'AHN Orthopedic Institute', 
     ARRAY['doctor'], 
     ARRAY['orthopedics', 'joint_replacement', 'spine'],
     '{"line1": "1307 Federal St", "city": "Pittsburgh", "state": "PA", "zip": "15212"}',
     40.4558, -80.0085, '+1-412-359-4700', 'https://www.ahn.org/ortho'),
    
    ('ffffffff-0006-0006-0006-000000000003', 
     'Steel City Orthopedics', 
     ARRAY['doctor'], 
     ARRAY['orthopedics', 'hand_surgery'],
     '{"line1": "725 Cherrington Pkwy", "city": "Moon Township", "state": "PA", "zip": "15108"}',
     40.5089, -80.2134, '+1-412-262-8700', NULL);

-- -----------------------------------------------------------------------------
-- Providers - Behavioral Health
-- -----------------------------------------------------------------------------
INSERT INTO providers (id, name, types, specialties, address, lat, lng, phone, website) VALUES
    ('gggggggg-0007-0007-0007-000000000001', 
     'UPMC Western Psychiatric Hospital', 
     ARRAY['hospital', 'health'], 
     ARRAY['psychiatry', 'behavioral_health', 'addiction_medicine'],
     '{"line1": "3811 OHara St", "city": "Pittsburgh", "state": "PA", "zip": "15213"}',
     40.4445, -79.9601, '+1-412-624-2100', 'https://www.upmc.com/westernpsych'),
    
    ('gggggggg-0007-0007-0007-000000000002', 
     'AHN Behavioral Health - West Penn', 
     ARRAY['doctor', 'health'], 
     ARRAY['psychiatry', 'behavioral_health', 'counseling'],
     '{"line1": "4800 Friendship Ave", "city": "Pittsburgh", "state": "PA", "zip": "15224"}',
     40.4619, -79.9452, '+1-412-578-5400', 'https://www.ahn.org/behavioral'),
    
    ('gggggggg-0007-0007-0007-000000000003', 
     'Pittsburgh Counseling Associates', 
     ARRAY['doctor'], 
     ARRAY['counseling', 'therapy', 'behavioral_health'],
     '{"line1": "5700 Corporate Dr", "city": "Pittsburgh", "state": "PA", "zip": "15237"}',
     40.5312, -80.0067, '+1-412-366-1300', NULL),
    
    ('gggggggg-0007-0007-0007-000000000004', 
     'Squirrel Hill Psychological Services', 
     ARRAY['doctor'], 
     ARRAY['psychology', 'therapy', 'child_psychology'],
     '{"line1": "5847 Forbes Ave", "city": "Pittsburgh", "state": "PA", "zip": "15217"}',
     40.4315, -79.9198, '+1-412-421-8500', NULL);

-- -----------------------------------------------------------------------------
-- Providers - Additional Specialties
-- -----------------------------------------------------------------------------
INSERT INTO providers (id, name, types, specialties, address, lat, lng, phone, website) VALUES
    ('hhhhhhhh-0008-0008-0008-000000000001', 
     'UPMC Eye Center', 
     ARRAY['doctor', 'health'], 
     ARRAY['ophthalmology', 'optometry'],
     '{"line1": "203 Lothrop St", "city": "Pittsburgh", "state": "PA", "zip": "15213"}',
     40.4420, -79.9572, '+1-412-647-2200', 'https://www.upmc.com/eye'),
    
    ('hhhhhhhh-0008-0008-0008-000000000002', 
     'Allegheny Dermatology Associates', 
     ARRAY['doctor'], 
     ARRAY['dermatology', 'skin_cancer'],
     '{"line1": "9104 Babcock Blvd", "city": "Pittsburgh", "state": "PA", "zip": "15237"}',
     40.5456, -80.0123, '+1-412-367-8100', NULL),
    
    ('hhhhhhhh-0008-0008-0008-000000000003', 
     'UPMC Womens Health - Magee', 
     ARRAY['doctor', 'hospital'], 
     ARRAY['obstetrics', 'gynecology', 'womens_health'],
     '{"line1": "300 Halket St", "city": "Pittsburgh", "state": "PA", "zip": "15213"}',
     40.4378, -79.9612, '+1-412-641-4000', 'https://www.upmc.com/magee');

-- =============================================================================
-- Provider Network Mappings
-- =============================================================================
-- HACKATHON NOTE:
-- These mappings are based on name heuristics for demo purposes:
-- - Providers with "UPMC" in name => in-network for UPMC plan
-- - Providers with "AHN" or "Allegheny" in name => in-network for Aetna plan
-- - Urgent care chains (MedExpress, ConvenientCare) => in-network for all
-- - Others receive mixed/unknown status
--
-- In production, this would come from official insurer provider directories.
-- =============================================================================

-- Plan IDs for reference:
-- BCBSTX: 11111111-1111-1111-1111-111111111111
-- Aetna:  22222222-2222-2222-2222-222222222222
-- UPMC:   33333333-3333-3333-3333-333333333333

-- -----------------------------------------------------------------------------
-- UPMC Providers => In-network for UPMC plan
-- -----------------------------------------------------------------------------
INSERT INTO provider_networks (provider_id, plan_id, in_network, confidence, source)
SELECT 
    p.id,
    '33333333-3333-3333-3333-333333333333'::uuid,
    true,
    0.90,
    'seed'
FROM providers p
WHERE p.name ILIKE '%UPMC%';

-- UPMC providers are out-of-network for Aetna (lower confidence, demo purposes)
INSERT INTO provider_networks (provider_id, plan_id, in_network, confidence, source)
SELECT 
    p.id,
    '22222222-2222-2222-2222-222222222222'::uuid,
    false,
    0.75,
    'seed'
FROM providers p
WHERE p.name ILIKE '%UPMC%';

-- UPMC providers - mixed for BCBS
INSERT INTO provider_networks (provider_id, plan_id, in_network, confidence, source)
SELECT 
    p.id,
    '11111111-1111-1111-1111-111111111111'::uuid,
    true,
    0.60,
    'heuristic'
FROM providers p
WHERE p.name ILIKE '%UPMC%';

-- -----------------------------------------------------------------------------
-- AHN / Allegheny Providers => In-network for Aetna plan
-- -----------------------------------------------------------------------------
INSERT INTO provider_networks (provider_id, plan_id, in_network, confidence, source)
SELECT 
    p.id,
    '22222222-2222-2222-2222-222222222222'::uuid,
    true,
    0.85,
    'seed'
FROM providers p
WHERE p.name ILIKE '%AHN%' OR p.name ILIKE '%Allegheny%';

-- AHN providers are out-of-network for UPMC
INSERT INTO provider_networks (provider_id, plan_id, in_network, confidence, source)
SELECT 
    p.id,
    '33333333-3333-3333-3333-333333333333'::uuid,
    false,
    0.80,
    'seed'
FROM providers p
WHERE p.name ILIKE '%AHN%' OR p.name ILIKE '%Allegheny%';

-- AHN providers - in-network for BCBS
INSERT INTO provider_networks (provider_id, plan_id, in_network, confidence, source)
SELECT 
    p.id,
    '11111111-1111-1111-1111-111111111111'::uuid,
    true,
    0.70,
    'heuristic'
FROM providers p
WHERE p.name ILIKE '%AHN%' OR p.name ILIKE '%Allegheny%';

-- -----------------------------------------------------------------------------
-- Urgent Care Chains => In-network for ALL plans
-- -----------------------------------------------------------------------------
INSERT INTO provider_networks (provider_id, plan_id, in_network, confidence, source)
SELECT 
    p.id,
    plan.id,
    true,
    0.60,
    'heuristic'
FROM providers p
CROSS JOIN insurance_plans plan
WHERE p.name ILIKE '%MedExpress%' 
   OR p.name ILIKE '%ConvenientCare%'
ON CONFLICT (provider_id, plan_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Independent / Other Providers => Mixed status
-- -----------------------------------------------------------------------------
-- These providers don't have clear network affiliations; assign unknown status

-- Independent providers for BCBS (likely in-network for broad PPO)
INSERT INTO provider_networks (provider_id, plan_id, in_network, confidence, source)
SELECT 
    p.id,
    '11111111-1111-1111-1111-111111111111'::uuid,
    true,
    0.50,
    'unknown'
FROM providers p
WHERE p.name NOT ILIKE '%UPMC%' 
  AND p.name NOT ILIKE '%AHN%' 
  AND p.name NOT ILIKE '%Allegheny%'
  AND p.name NOT ILIKE '%MedExpress%'
  AND p.name NOT ILIKE '%ConvenientCare%'
ON CONFLICT (provider_id, plan_id) DO NOTHING;

-- Independent providers for Aetna (unknown status)
INSERT INTO provider_networks (provider_id, plan_id, in_network, confidence, source)
SELECT 
    p.id,
    '22222222-2222-2222-2222-222222222222'::uuid,
    false,
    0.40,
    'unknown'
FROM providers p
WHERE p.name NOT ILIKE '%UPMC%' 
  AND p.name NOT ILIKE '%AHN%' 
  AND p.name NOT ILIKE '%Allegheny%'
  AND p.name NOT ILIKE '%MedExpress%'
  AND p.name NOT ILIKE '%ConvenientCare%'
ON CONFLICT (provider_id, plan_id) DO NOTHING;

-- Independent providers for UPMC (unknown status)
INSERT INTO provider_networks (provider_id, plan_id, in_network, confidence, source)
SELECT 
    p.id,
    '33333333-3333-3333-3333-333333333333'::uuid,
    false,
    0.40,
    'unknown'
FROM providers p
WHERE p.name NOT ILIKE '%UPMC%' 
  AND p.name NOT ILIKE '%AHN%' 
  AND p.name NOT ILIKE '%Allegheny%'
  AND p.name NOT ILIKE '%MedExpress%'
  AND p.name NOT ILIKE '%ConvenientCare%'
ON CONFLICT (provider_id, plan_id) DO NOTHING;

-- =============================================================================
-- Verification Queries (run manually to verify seed)
-- =============================================================================
-- SELECT COUNT(*) AS provider_count FROM providers;
-- SELECT COUNT(*) AS plan_count FROM insurance_plans;
-- SELECT COUNT(*) AS network_count FROM provider_networks;
-- SELECT pn.in_network, COUNT(*) 
--   FROM provider_networks pn 
--   GROUP BY pn.in_network;
-- SELECT ip.plan_name, COUNT(*) AS in_network_count
--   FROM provider_networks pn
--   JOIN insurance_plans ip ON pn.plan_id = ip.id
--   WHERE pn.in_network = true
--   GROUP BY ip.plan_name;
