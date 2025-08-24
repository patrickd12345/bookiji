'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCreditsSummary } from '@/types/credits';
import { getTierIcon, getTierColor, formatCredits } from '@/lib/credits';

interface CreditsRedemptionProps {
  userId: string;
  totalCost: number;
  onCreditsAppliedAction: (amount: number, finalCost: number) => void;
  className?: string;
}

export function CreditsRedemption({ 
  userId, 
  totalCost, 
  onCreditsAppliedAction, 
  className = '' 
}: CreditsRedemptionProps) {
  const [credits, setCredits] = useState<UserCreditsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redemptionAmount, setRedemptionAmount] = useState(0);
  const [isApplying, setIsApplying] = useState(false);

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

  const calculateMaxRedemption = () => {
    if (!credits) return 0;
    
    // Maximum 25% of total cost
    const maxPercentage = 25;
    const maxByPercentage = (totalCost * maxPercentage) / 100;
    
    // Cannot exceed user's balance
    return Math.min(maxByPercentage, credits.credits_balance);
  };

  const calculateFinalCost = (amount: number) => {
    if (!credits) return totalCost;
    
    // Apply tier discount
    const discount = (amount * credits.discount_percentage) / 100;
    return totalCost - amount + discount;
  };

  const handleAmountChange = (value: string) => {
    const amount = parseFloat(value) || 0;
    const maxAmount = calculateMaxRedemption();

    if (amount > maxAmount) {
      setRedemptionAmount(maxAmount);
    } else if (amount < 0) {
      setRedemptionAmount(0);
    } else {
      setRedemptionAmount(amount);
    }
  };

  const handleMaxRedemption = () => {
    const maxAmount = calculateMaxRedemption();
    setRedemptionAmount(maxAmount);
  };

  const handleApplyCredits = async () => {
    if (redemptionAmount <= 0) return;

    setIsApplying(true);
    try {
      const response = await fetch('/api/credits/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: redemptionAmount,
          description: `Credit redemption for booking - $${redemptionAmount.toFixed(2)}`,
          reference_type: 'booking',
          metadata: { total_cost: totalCost }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const finalCost = calculateFinalCost(redemptionAmount);
        onCreditsAppliedAction(redemptionAmount, finalCost);
        
        // Refresh credits
        await fetchUserCredits();
        
        // Reset form
        setRedemptionAmount(0);
      } else {
        setError(result.error || 'Failed to apply credits');
      }
    } catch (err) {
      setError('Error applying credits');
      console.error('Error applying credits:', err);
    } finally {
      setIsApplying(false);
    }
  };



  if (loading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardHeader>
          <CardTitle className="h-6 bg-gray-200 rounded w-32"></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded w-20"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !credits) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="pt-6">
          <div className="text-red-500 text-sm">
            {error || 'Unable to load credits'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxRedemption = calculateMaxRedemption();
  const canRedeem = maxRedemption >= 5.00; // Minimum $5.00
  const finalCost = calculateFinalCost(redemptionAmount);
  const savings = totalCost - finalCost;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>💎 Apply Credits</span>
          <Badge variant="outline" className={getTierColor(credits.current_tier)}>
            {getTierIcon(credits.current_tier)} {credits.current_tier}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Credits */}
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium">Available Credits:</span>
          <span className="text-lg font-bold text-green-600">
            {formatCredits(credits.credits_balance)}
          </span>
        </div>

        {/* Redemption Input */}
        <div className="space-y-2">
          <Label htmlFor="credits-amount">Amount to Apply</Label>
          <div className="flex space-x-2">
            <Input
              id="credits-amount"
              type="number"
              min="0"
              max={maxRedemption}
              step="0.01"
              value={redemptionAmount || ''}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleMaxRedemption}
              disabled={!canRedeem}
            >
              Max
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Maximum: {formatCredits(maxRedemption)} (25% of total cost)
          </p>
        </div>

        {/* Tier Benefits */}
        {credits.discount_percentage > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-blue-600">🎉</span>
              <span className="font-medium text-blue-800">
                {credits.current_tier} Tier Bonus: {credits.discount_percentage}% discount on redemption
              </span>
            </div>
          </div>
        )}

        {/* Cost Breakdown */}
        {redemptionAmount > 0 && (
          <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Original Cost:</span>
              <span>{formatCredits(totalCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Credits Applied:</span>
              <span className="text-green-600">-{formatCredits(redemptionAmount)}</span>
            </div>
            {credits.discount_percentage > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tier Discount:</span>
                <span className="text-blue-600">-{formatCredits((redemptionAmount * credits.discount_percentage) / 100)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>Final Cost:</span>
              <span className="text-lg text-green-600">{formatCredits(finalCost)}</span>
            </div>
            <div className="text-center text-sm text-green-600 font-medium">
              You save {formatCredits(savings)}!
            </div>
          </div>
        )}

        {/* Apply Button */}
        <Button
          onClick={handleApplyCredits}
          disabled={!canRedeem || redemptionAmount <= 0 || isApplying}
          className="w-full"
          size="lg"
        >
          {isApplying ? 'Applying...' : `Apply ${formatCredits(redemptionAmount)} Credits`}
        </Button>

        {/* Error Display */}
        {error && (
          <div className="text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        {/* Instructions */}
        {!canRedeem && (
          <div className="text-center text-sm text-gray-500">
            <p>Minimum {formatCredits(5.00)} required to redeem credits</p>
            <p>Earn credits by completing bookings and referring friends!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
