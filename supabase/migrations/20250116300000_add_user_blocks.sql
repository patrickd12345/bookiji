-- Add user blocks table and related functionality
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- Add indexes for performance
CREATE INDEX idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON public.user_blocks(blocked_id);

-- Enable RLS
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own blocks" ON public.user_blocks
    FOR SELECT
    USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

CREATE POLICY "Users can create blocks" ON public.user_blocks
    FOR INSERT
    WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can remove their own blocks" ON public.user_blocks
    FOR DELETE
    USING (auth.uid() = blocker_id);

-- Function to check if a user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_blocks
        WHERE (blocker_id = user_a AND blocked_id = user_b)
           OR (blocker_id = user_b AND blocked_id = user_a)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update booking policies to prevent blocked users from interacting
DROP POLICY IF EXISTS "Customers can create bookings" ON public.bookings;
CREATE POLICY "Customers can create bookings" ON public.bookings
    FOR INSERT
    WITH CHECK (
        auth.uid() = customer_id 
        AND NOT is_user_blocked(customer_id, vendor_id)
    );

-- Update search policies to exclude blocked users
DROP POLICY IF EXISTS "Customers can view active services" ON public.services;
CREATE POLICY "Customers can view active services" ON public.services
    FOR SELECT
    USING (
        is_active = true 
        AND NOT is_user_blocked(auth.uid(), vendor_id)
    ); 