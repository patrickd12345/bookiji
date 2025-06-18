'use client';

import AuthEntry from '@/components/AuthEntry';
import { theme, combineClasses } from '@/config/theme';

export default function GetStartedPage() {
  return (
    <div className={combineClasses(
      'min-h-screen',
      theme.colors.background.gradient,
      'py-12 px-4 sm:px-6 lg:px-8'
    )}>
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h1 className={combineClasses(
            'text-4xl font-extrabold',
            theme.typography.heading.gradient
          )}>
            Get Started with Bookiji
          </h1>
          <p className={combineClasses(
            'mt-3 text-xl',
            theme.typography.body.color
          )}>
            Join the world's first AI-powered booking platform
          </p>
        </div>
        <AuthEntry mode="signup" />
      </div>
    </div>
  );
} 