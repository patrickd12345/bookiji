-- Allow service role to insert/update profiles for seeding and admin operations
-- This is needed for E2E test seeding and admin user management

CREATE POLICY "Service role can manage profiles" ON profiles
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');









