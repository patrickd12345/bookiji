'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';

export default function BetaProgram() {
  const router = useRouter();
  const [betaEnabled, setBetaEnabled] = useState(false);
  const [betaType, setBetaType] = useState<'early_access' | 'public_beta' | null>(null);
  const [loading, setLoading] = useState(true);

  const checkBetaStatus = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('beta_status')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.warn('Could not fetch beta_status (column may not exist):', error.message);
        // beta_status column doesn't exist, so beta features are not available
        setBetaEnabled(false);
        setBetaType(null);
      } else if (profile?.beta_status) {
        setBetaEnabled(true);
        setBetaType(profile.beta_status.type);
      }
    } catch (error) {
      console.warn('Error checking beta status:', error);
      setBetaEnabled(false);
      setBetaType(null);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    checkBetaStatus();
  }, [checkBetaStatus]);

  const handleBetaToggle = async (enabled: boolean) => {
    setBetaEnabled(enabled);
    if (!enabled) {
      try {
        // Opt out of beta
        const { error } = await supabase
          .from('profiles')
          .update({ 
            beta_status: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', (await supabase.auth.getSession()).data.session?.user.id);
        
        if (error) {
          console.warn('Could not update beta_status (column may not exist):', error.message);
          // Don't fail the UI, just log the warning
        }
        setBetaType(null);
      } catch (error) {
        console.warn('Error updating beta status:', error);
      }
    }
  };

  const handleBetaTypeChange = async (type: 'early_access' | 'public_beta') => {
    setBetaType(type);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          beta_status: {
            type,
            joined_at: new Date().toISOString(),
            features: type === 'early_access' 
              ? ['all']
              : ['core_features', 'ui_improvements']
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', (await supabase.auth.getSession()).data.session?.user.id);
      
      if (error) {
        console.warn('Could not update beta_status (column may not exist):', error.message);
        // Don't fail the UI, just log the warning
      }
    } catch (error) {
      console.warn('Error updating beta status:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Beta Program</h1>
      
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Beta Updates</h2>
            <p className="text-gray-600">Get early access to new features and help shape the future of Bookiji</p>
            {!betaEnabled && (
              <p className="text-sm text-amber-600 mt-2">
                ⚠️ Beta features are currently not available in your database schema. 
                Contact support to enable beta program features.
              </p>
            )}
          </div>
          <Switch 
            checked={betaEnabled}
            onCheckedChange={handleBetaToggle}
            disabled={!betaEnabled} // Disable if beta features not available
          />
        </div>

        {betaEnabled && (
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <input
                type="radio"
                id="early_access"
                name="beta_type"
                checked={betaType === 'early_access'}
                onChange={() => handleBetaTypeChange('early_access')}
                className="mt-1"
              />
              <div>
                <label htmlFor="early_access" className="font-medium block">Early Access Program</label>
                <p className="text-sm text-gray-600">
                  Get the earliest access to new features. May be less stable.
                  Ideal for tech-savvy users who want to provide detailed feedback.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <input
                type="radio"
                id="public_beta"
                name="beta_type"
                checked={betaType === 'public_beta'}
                onChange={() => handleBetaTypeChange('public_beta')}
                className="mt-1"
              />
              <div>
                <label htmlFor="public_beta" className="font-medium block">Public Beta Program</label>
                <p className="text-sm text-gray-600">
                  Test new features that are nearly ready for release.
                  More stable than Early Access. Perfect for most users.
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {betaEnabled && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Current Beta Features</h2>
          <ul className="space-y-3">
            <li className="flex items-center text-green-600">
              <span className="mr-2">✓</span>
              Enhanced AI booking assistant
            </li>
            <li className="flex items-center text-green-600">
              <span className="mr-2">✓</span>
              New calendar interface
            </li>
            <li className="flex items-center text-green-600">
              <span className="mr-2">✓</span>
              Smart availability predictions
            </li>
            {betaType === 'early_access' && (
              <>
                <li className="flex items-center text-blue-600">
                  <span className="mr-2">⚡</span>
                  Experimental features in development
                </li>
                <li className="flex items-center text-blue-600">
                  <span className="mr-2">⚡</span>
                  Direct feedback channel to developers
                </li>
              </>
            )}
          </ul>
        </Card>
      )}
    </div>
  );
} 