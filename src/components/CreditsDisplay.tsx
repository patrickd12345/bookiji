'use client';

import React, { useEffect, useState } from 'react';
import { UserCreditsSummary } from '@/types/credits';
import { getTierIcon, getTierColor, formatCredits } from '@/lib/credits';

interface CreditsDisplayProps {
  userId: string;
  showDetails?: boolean;
  className?: string;
}

export default function CreditsDisplay({ userId, showDetails = false, className = '' }: CreditsDisplayProps) {
  const [credits, setCredits] = useState<UserCreditsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserCredits();
  }, [userId]);

  const fetchUserCredits = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/credits/user');
      const result = await response.json();
      
      if (result.success) {
        setCredits(result.data);
      } else {
        setError(result.error || 'Failed to fetch credits');
      }
    } catch (err) {
      setError('Error loading credits');
      console.error('Error fetching credits:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <p className="text-sm text-gray-500">Loading credits...</p>
        <div className="h-8 bg-gray-200 rounded w-24"></div>
        {showDetails && (
          <div className="mt-2 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </div>
        )}
      </div>
    );
  }

  if (error || !credits) {
    return (
      <div className={`text-red-500 text-sm ${className}`}>
        {error || 'Unable to load credits'}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Main Credits Display */}
      <div className="flex items-center space-x-2">
        <span className="text-2xl font-bold text-green-600">
          {formatCredits(credits.credits_balance)}
        </span>
        <span className="text-sm text-gray-500">credits</span>
      </div>

      {/* Tier Badge */}
      <div className={`mt-2 flex items-center space-x-2 ${className}`}>
        <span className={`inline-flex ${getTierColor(credits.current_tier)}`}>
          {getTierIcon(credits.current_tier)}
        </span>
        <span className={`inline-flex text-sm font-medium ${getTierColor(credits.current_tier)}`}>
          {credits.current_tier}
        </span>
      </div>

      {/* Detailed Information */}
      {showDetails && (
        <div className="mt-3 space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Total Earned:</span>
            <span className="font-medium">{formatCredits(credits.total_credits_earned)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Spent:</span>
            <span className="font-medium">{formatCredits(credits.total_credits_spent)}</span>
          </div>
          <div className="flex justify-between">
            <span>Referrals:</span>
            <span className="font-medium">{`${credits.completed_referrals}/${credits.total_referrals} completed`}</span>
          </div>
          
          {/* Tier Benefits */}
          {credits.benefits && Object.keys(credits.benefits).length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-500 mb-1">Tier Benefits:</div>
              <div className="space-y-1">
                {credits.benefits.priority_support && (
                  <div className="flex items-center space-x-1 text-xs">
                    <span className="text-blue-500">✓</span>
                    <span>Priority Support</span>
                  </div>
                )}
                {credits.benefits.exclusive_offers && (
                  <div className="flex items-center space-x-1 text-xs">
                    <span className="text-purple-500">✓</span>
                    <span>Exclusive Offers</span>
                  </div>
                )}
                {credits.benefits.vip_events && (
                  <div className="flex items-center space-x-1 text-xs">
                    <span className="text-green-500">✓</span>
                    <span>VIP Events</span>
                  </div>
                )}
                {credits.benefits.dedicated_manager && (
                  <div className="flex items-center space-x-1 text-xs">
                    <span className="text-green-500">✓</span>
                    <span>Dedicated Manager</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



