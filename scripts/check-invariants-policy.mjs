#!/usr/bin/env node
/**
 * Process-Invariant Enforcement (PIE) Policy Check
 * 
 * Scans codebase for violations of invariant enforcement patterns.
 * Similar to check-db-policy.mjs but covers all risky surfaces.
 */

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function fail(message) {
  console.error(`❌ INVARIANT POLICY: ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`✅ INVARIANT POLICY: ${message}`);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function listFilesRecursive(dir, predicate = () => true) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    if (!current) break;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        if (predicate(full)) out.push(full);
      }
    }
  }
  return out;
}

function relative(p) {
  return path.relative(repoRoot, p).replaceAll("\\", "/");
}

/**
 * Check: Bookings lifecycle - authoritative paths
 */
function checkBookingsAuthoritativePaths() {
  const bookingsDir = path.join(repoRoot, "src", "app", "api", "bookings");
  if (!exists(bookingsDir)) return;

  const files = listFilesRecursive(bookingsDir, (p) => /\.(ts|tsx)$/.test(p));
  
  // Authoritative paths that MUST exist
  const requiredPaths = [
    "confirm/route.ts", // Booking confirmation
    "create/route.ts", // Booking creation
  ];

  const foundPaths = new Set();
  for (const file of files) {
    const relPath = relative(file);
    for (const required of requiredPaths) {
      if (relPath.includes(required)) {
        foundPaths.add(required);
      }
    }
  }

  // Check for direct state updates bypassing authoritative paths
  for (const file of files) {
    const txt = readText(file);
    const relPath = relative(file);
    
    // Forbidden: Direct UPDATE to bookings.state outside webhook
    if (!relPath.includes("webhooks") && 
        /\.update\([^)]*state\s*[:=]/.test(txt) &&
        !relPath.includes("confirm") &&
        !relPath.includes("create")) {
      fail(
        `${relPath}: Direct booking state update detected. Use authoritative paths (webhook, confirm, create) instead.`
      );
      return;
    }
  }

  ok("Bookings lifecycle authoritative paths verified");
}

/**
 * Check: Payments - payment intent verification
 */
function checkPaymentIntentVerification() {
  const paymentsDir = path.join(repoRoot, "src", "app", "api");
  if (!exists(paymentsDir)) return;

  const files = listFilesRecursive(paymentsDir, (p) => 
    /\.(ts|tsx)$/.test(p) && 
    (p.includes("bookings") || p.includes("payments"))
  );

  for (const file of files) {
    const txt = readText(file);
    const relPath = relative(file);
    
    // Check if file accepts stripe_payment_intent_id
    if (/stripe_payment_intent_id/.test(txt)) {
      // Must verify via Stripe API
      if (!/stripe\.paymentIntents\.(retrieve|create)/.test(txt) &&
          !/verifyPaymentIntent|verify.*payment.*intent/i.test(txt)) {
        // Exception: webhook handlers don't need verification (they verify signature)
        if (!relPath.includes("webhooks")) {
          fail(
            `${relPath}: Accepts stripe_payment_intent_id but does not verify via Stripe API. See docs/invariants/payments-refunds.md INV-1.`
          );
          return;
        }
      }
    }
  }

  ok("Payment intent verification checks passed");
}

/**
 * Check: Webhooks - signature verification
 */
function checkWebhookSignatureVerification() {
  const webhooksDir = path.join(repoRoot, "src", "app", "api", "webhooks");
  if (!exists(webhooksDir)) return;

  const files = listFilesRecursive(webhooksDir, (p) => /\.(ts|tsx)$/.test(p));

  for (const file of files) {
    const txt = readText(file);
    const relPath = relative(file);
    
    // Must verify webhook signature
    if (!/stripe\.webhooks\.constructEvent|verifyWebhookSignature|verify.*signature/i.test(txt)) {
      fail(
        `${relPath}: Webhook handler does not verify signature. See docs/invariants/webhooks.md INV-1.`
      );
      return;
    }
  }

  ok("Webhook signature verification checks passed");
}

/**
 * Check: Admin actions - admin role verification
 */
function checkAdminRoleVerification() {
  const adminDir = path.join(repoRoot, "src", "app", "api", "admin");
  if (!exists(adminDir)) return;

  const files = listFilesRecursive(adminDir, (p) => /\.(ts|tsx)$/.test(p));

  for (const file of files) {
    const txt = readText(file);
    const relPath = relative(file);
    
    // Must verify admin role (check for requireAdmin function call or direct role check)
    if (!/requireAdmin|role\s*===?\s*['"]admin['"]|isAdmin|assertAdmin|checkAdmin/i.test(txt) &&
        !/profiles.*role.*admin/i.test(txt)) {
      fail(
        `${relPath}: Admin endpoint does not verify admin role. See docs/invariants/admin-ops.md INV-1.`
      );
      return;
    }
  }

  ok("Admin role verification checks passed");
}

/**
 * Check: Time validation - no past bookings
 */
function checkTimeValidation() {
  const bookingsDir = path.join(repoRoot, "src", "app", "api", "bookings");
  if (!exists(bookingsDir)) return;

  const files = listFilesRecursive(bookingsDir, (p) => 
    /\.(ts|tsx)$/.test(p) && 
    (p.includes("create") || p.includes("confirm"))
  );

  for (const file of files) {
    const txt = readText(file);
    const relPath = relative(file);
    
    // Must validate start_time > NOW()
    if (/start_time|startTime/.test(txt)) {
      if (!/(start_time|startTime)\s*>\s*(NOW\(\)|new\s+Date\(\)|Date\.now\(\))/.test(txt) &&
          !/cannot.*past|past.*booking|start.*future/i.test(txt)) {
        // Exception: webhook handlers don't create bookings
        if (!relPath.includes("webhooks")) {
          fail(
            `${relPath}: Booking creation does not validate start_time > NOW(). See docs/invariants/time-scheduling.md INV-1.`
          );
          return;
        }
      }
    }
  }

  ok("Time validation checks passed");
}

/**
 * Check: Idempotency keys required
 */
function checkIdempotencyKeys() {
  const apiDir = path.join(repoRoot, "src", "app", "api");
  if (!exists(apiDir)) return;

  // State-changing endpoints that require idempotency keys
  const stateChangingPaths = [
    "bookings/confirm",
    "bookings/create",
    "payments/refund",
    "admin/system-flags",
  ];

  const files = listFilesRecursive(apiDir, (p) => 
    /\.(ts|tsx)$/.test(p) && 
    stateChangingPaths.some(path => p.includes(path))
  );

  for (const file of files) {
    const txt = readText(file);
    const relPath = relative(file);
    
    // Check if idempotency key is handled
    if (!/idempotency|idempotent/i.test(txt)) {
      fail(
        `${relPath}: State-changing endpoint does not handle idempotency keys. See docs/invariants/retries-idempotency.md INV-1.`
      );
      return;
    }
  }

  ok("Idempotency key checks passed");
}

/**
 * Check: Kill switch enforcement
 */
function checkKillSwitchEnforcement() {
  const bookingsDir = path.join(repoRoot, "src", "app", "api", "bookings");
  if (!exists(bookingsDir)) return;

  const files = listFilesRecursive(bookingsDir, (p) => 
    /\.(ts|tsx)$/.test(p) && 
    (p.includes("confirm") || p.includes("create"))
  );

  for (const file of files) {
    const txt = readText(file);
    const relPath = relative(file);
    
    // Must call assertSchedulingEnabled (except webhooks)
    if (!relPath.includes("webhooks")) {
      if (!/assertSchedulingEnabled|schedulingKillSwitch/i.test(txt)) {
        fail(
          `${relPath}: Booking endpoint does not enforce kill switch. See docs/invariants/admin-ops.md INV-5.`
        );
        return;
      }
    }
  }

  ok("Kill switch enforcement checks passed");
}

/**
 * Check: Jarvis Phase 3 Escalation Invariants
 */
function checkJarvisEscalationInvariants() {
  const escalationDir = path.join(repoRoot, "src", "lib", "jarvis", "escalation");
  if (!exists(escalationDir)) {
    // Escalation not implemented yet, skip checks
    return;
  }

  const decideNextActionFile = path.join(escalationDir, "decideNextAction.ts");
  if (!exists(decideNextActionFile)) {
    fail(
      `Jarvis escalation directory exists but decideNextAction.ts not found.`
    );
    return;
  }

  const decideNextActionTxt = readText(decideNextActionFile);

  // Check 1: decideNextAction.ts must not import any LLM modules
  const llmImportPatterns = [
    /from\s+['"].*llm/i,
    /from\s+['"].*groq/i,
    /from\s+['"].*openai/i,
    /from\s+['"].*anthropic/i,
    /import.*assessIncident/i,
    /import.*llmAssessment/i,
  ];
  
  for (const pattern of llmImportPatterns) {
    if (pattern.test(decideNextActionTxt)) {
      fail(
        `decideNextAction.ts: Must not import LLM modules. Escalation decisions must be deterministic. Found: ${decideNextActionTxt.match(pattern)?.[0]}`
      );
      return;
    }
  }

  // Check 2: Escalation decision output must be one of allowed types
  const allowedTypes = [
    "DO_NOT_NOTIFY",
    "SEND_SILENT_SMS",
    "SEND_LOUD_SMS",
    "WAIT"
  ];
  
  const decisionTypePattern = /type:\s*['"](DO_NOT_NOTIFY|SEND_SILENT_SMS|SEND_LOUD_SMS|WAIT)['"]/g;
  const foundTypes = new Set();
  let match;
  while ((match = decisionTypePattern.exec(decideNextActionTxt)) !== null) {
    foundTypes.add(match[1]);
  }

  // Check that all return statements use allowed types
  const returnStatements = decideNextActionTxt.match(/return\s+\{[^}]*type:/g) || [];
  for (const ret of returnStatements) {
    const typeMatch = ret.match(/type:\s*['"]([^'"]+)['"]/);
    if (typeMatch && !allowedTypes.includes(typeMatch[1])) {
      fail(
        `decideNextAction.ts: Invalid escalation decision type '${typeMatch[1]}'. Must be one of: ${allowedTypes.join(", ")}`
      );
      return;
    }
  }

  // Check 3: Hard cap constant must exist and be <= 5
  const sleepPolicyFile = path.join(escalationDir, "sleepPolicy.ts");
  if (!exists(sleepPolicyFile)) {
    fail(
      `Jarvis escalation directory exists but sleepPolicy.ts not found.`
    );
    return;
  }

  const sleepPolicyTxt = readText(sleepPolicyFile);
  const maxNotificationsPattern = /maxNotificationsPerIncident:\s*(\d+)/;
  const maxNotificationsMatch = sleepPolicyTxt.match(maxNotificationsPattern);
  
  if (!maxNotificationsMatch) {
    fail(
      `sleepPolicy.ts: maxNotificationsPerIncident constant not found. Hard cap must be defined.`
    );
    return;
  }

  const maxNotifications = parseInt(maxNotificationsMatch[1], 10);
  if (maxNotifications > 5) {
    fail(
      `sleepPolicy.ts: maxNotificationsPerIncident (${maxNotifications}) exceeds hard cap of 5.`
    );
    return;
  }

  // Check 4: ACK handling must set acknowledged_at and gate orchestrator notifications
  const smsReplyFile = path.join(repoRoot, "src", "app", "api", "jarvis", "sms-reply", "route.ts");
  if (!exists(smsReplyFile)) {
    fail(
      `Jarvis SMS reply route not found.`
    );
    return;
  }

  const smsReplyTxt = readText(smsReplyFile);
  
  // Must call markIncidentAcknowledged for ACK
  if (!/markIncidentAcknowledged/i.test(smsReplyTxt)) {
    fail(
      `sms-reply/route.ts: ACK command must call markIncidentAcknowledged.`
    );
    return;
  }

  // Check that orchestrator gates on acknowledged_at
  const escalationOrchestratorFile = path.join(escalationDir, "orchestrator.ts");
  if (!exists(escalationOrchestratorFile)) {
    fail(
      `Jarvis escalation orchestrator not found.`
    );
    return;
  }

  const orchestratorTxt = readText(escalationOrchestratorFile);
  
  // Must check acknowledged_at when getting unacknowledged incidents
  if (!/acknowledged_at|acknowledgedAt/i.test(orchestratorTxt)) {
    fail(
      `escalation/orchestrator.ts: Must check acknowledged_at to gate notifications.`
    );
    return;
  }

  // Check that decideNextAction gates on acknowledgedAt
  if (!/acknowledgedAt|acknowledged_at/i.test(decideNextActionTxt)) {
    fail(
      `decideNextAction.ts: Must check acknowledgedAt to prevent notifications.`
    );
    return;
  }

  ok("Jarvis escalation invariants checks passed");
}

function main() {
  ok("Running invariant policy checks...");
  checkBookingsAuthoritativePaths();
  checkPaymentIntentVerification();
  checkWebhookSignatureVerification();
  checkAdminRoleVerification();
  checkTimeValidation();
  checkIdempotencyKeys();
  checkKillSwitchEnforcement();
  checkJarvisEscalationInvariants();

  if (process.exitCode && process.exitCode !== 0) {
    console.error(
      "\nInvariant policy checks failed. Fix the issues above before committing/merging.",
    );
    console.error("See docs/invariants/ for detailed invariant documentation.");
    process.exit(1);
  }

  ok("All invariant policy checks passed");
}

main();

