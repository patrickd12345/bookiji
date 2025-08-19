"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { theme, combineClasses } from "@/config/theme";

export default function AuthEntry({ mode = "signup" }: { mode?: "signup" | "login" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(mode === "signup");

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        
        // Redirect immediately - useAuthReady will handle session readiness
        router.push("/choose-role");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/customer/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${isSignUp ? "sign up" : "sign in"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClasses = combineClasses(
    theme.components.input.base,
    theme.components.input.focus,
    theme.components.input.rounded,
    theme.components.input.placeholder
  );
  const buttonClasses = combineClasses(
    "w-full px-6 py-4 text-lg font-medium",
    theme.components.button.primary.base,
    theme.components.button.primary.hover,
    theme.components.button.primary.shadow,
    theme.components.button.primary.rounded,
    isLoading ? "opacity-70 cursor-not-allowed" : ""
  );
  const cardClasses = combineClasses(
    theme.components.card.background,
    theme.components.card.border,
    theme.components.card.shadow,
    theme.components.card.rounded,
    "p-8"
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className={cardClasses}
      >
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}
        <form className="space-y-6" onSubmit={handleEmailAuth}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClasses}
            />
          </div>
          {isSignUp && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClasses}
              />
            </div>
          )}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={buttonClasses}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="loading-dots flex space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span>{isSignUp ? "Creating account..." : "Signing in..."}</span>
                </div>
              ) : isSignUp ? "Create Account" : "Sign In"}
            </button>
          </div>
        </form>
        <div className="text-center pt-6">
          <p className="text-sm text-gray-600">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-blue-600 hover:underline font-medium"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
} 