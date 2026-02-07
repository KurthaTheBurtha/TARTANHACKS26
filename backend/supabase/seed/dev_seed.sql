-- Development seed data
-- Note: This assumes you have test users in auth.users
-- Adjust user_ids to match your test users

-- Insert sample providers
INSERT INTO providers_cache (npi, name, specialty, address, city, state, zip) VALUES
('1234567890', 'Example Medical Group', 'Internal Medicine', '123 Main St', 'Pittsburgh', 'PA', '15213'),
('0987654321', 'City Hospital', 'Hospital', '456 Oak Ave', 'Pittsburgh', 'PA', '15213'),
('1122334455', 'Specialty Clinic', 'Cardiology', '789 Pine Rd', 'Pittsburgh', 'PA', '15213')
ON CONFLICT (npi) DO NOTHING;

-- Insert sample network rules (assuming provider_ids from above)
-- Note: You'll need to adjust these IDs based on actual inserted provider IDs
INSERT INTO network_rules (provider_id, plan_id, network_status, effective_date)
SELECT 
    id,
    'plan_standard',
    'in_network',
    '2024-01-01'::DATE
FROM providers_cache
WHERE npi IN ('1234567890', '0987654321')
ON CONFLICT DO NOTHING;

-- Note: Sample documents, extractions, and chat sessions would require actual user_ids
-- from auth.users. You can add those manually or via API after creating test users.
