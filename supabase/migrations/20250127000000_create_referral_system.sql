-- Referral system tables using referee email

CREATE TABLE IF NOT EXISTS referrals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    referee_email text UNIQUE NOT NULL,
    referee_id uuid REFERENCES auth.users(id),
    role text CHECK (role IN ('customer','vendor')),
    credited boolean DEFAULT false,
    credited_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can view referrals" ON referrals
    FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Service role can manage referrals" ON referrals
    FOR ALL USING (auth.role() = 'service_role');
