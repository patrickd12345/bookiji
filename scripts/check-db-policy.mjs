#!/usr/bin/env node
/**
 * Database Management Policy Enforcement
 *
 * Goals:
 * - Prevent manual/rogue SQL processes from creeping in via docs/config.
 * - Keep Supabase migrations coherent and CLI-first.
 * - Prevent secrets from being committed into templates/docs.
 *
 * This script is intentionally lightweight and runs in:
 * - Husky pre-commit
 * - CI workflows
 */
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function fail(message) {
  // eslint-disable-next-line no-console
  console.error(`❌ DB POLICY: ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  // eslint-disable-next-line no-console
  console.log(`✅ DB POLICY: ${message}`);
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

function checkNoSecretsInEnvTemplate() {
  const file = path.join(repoRoot, "env.template");
  if (!exists(file)) return;
  const txt = readText(file);

  // Heuristics: fail on values that look like real secrets/tokens.
  const secretPatterns = [
    /\bsbp_[a-f0-9]{20,}\b/i, // Supabase access token (real)
    /\bsb_secret_[A-Za-z0-9_-]{10,}\b/, // Supabase secret key (real)
    /\bsk_(live|test)_[A-Za-z0-9]{10,}\b/, // Stripe secret
    /\bwhsec_[A-Za-z0-9]{10,}\b/, // Stripe webhook secret
    /\bpk_(live|test)_[A-Za-z0-9]{10,}\b/, // Stripe publishable
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/, // JWT-like
    /\bmssp\.[A-Za-z0-9._-]{10,}\b/, // Mailersend style
  ];

  for (const re of secretPatterns) {
    const m = txt.match(re);
    if (m) {
      fail(
        `env.template contains what looks like a secret/token (${m[0].slice(
          0,
          16,
        )}…). Replace with placeholders.`,
      );
      break;
    }
  }
}

function checkDocsDoNotRecommendManualSql() {
  const docsDir = path.join(repoRoot, "docs");
  if (!exists(docsDir)) return;

  const files = listFilesRecursive(docsDir, (p) => p.endsWith(".md"));
  const forbiddenPhrases = [
    "Option B: Manual SQL Execution",
    "manually run the SQL files",
    "Copy contents from `supabase/migrations`",
  ];

  for (const file of files) {
    const txt = readText(file);
    for (const phrase of forbiddenPhrases) {
      if (txt.includes(phrase)) {
        fail(
          `Docs recommend manual SQL ("${phrase}") in ${relative(
            file,
          )}. Policy requires CLI-only migrations.`,
        );
        return;
      }
    }
  }
}

function checkMigrationFilenames() {
  const migrationsDir = path.join(repoRoot, "supabase", "migrations");
  if (!exists(migrationsDir)) return;

  const files = listFilesRecursive(migrationsDir, (p) => p.endsWith(".sql"));

  // Allow:
  // - Legacy numeric migrations: 0001_name.sql, 0002_name.sql
  // - Timestamp migrations: 20250117000000_name.sql (14-digit)
  const allowedBase = /^\d{14}_.+\.sql$/;
  const allowedLegacy = /^(?:0001|0002)_.+\.sql$/;

  for (const file of files) {
    const base = path.basename(file);
    if (base.startsWith("_")) {
      // `_hold/...` directory is allowed, but file names should still be timestamped.
      fail(
        `Migration file name cannot start with "_" (${relative(
          file,
        )}). Use timestamped names via \`supabase migration new\`.`,
      );
      return;
    }
    if (!allowedLegacy.test(base) && !allowedBase.test(base)) {
      fail(
        `Invalid migration filename "${base}" (${relative(
          file,
        )}). Expected 14-digit timestamp prefix (YYYYMMDDHHMMSS_) or legacy 0001_/0002_.`,
      );
      return;
    }
  }

  ok("Migration filenames look valid");
}

function checkHoldFolderNotUsedAsSourceOfTruth() {
  const holdDir = path.join(repoRoot, "supabase", "migrations", "_hold");
  if (!exists(holdDir)) return;
  // Presence is allowed, but policy is that it should never be used for prod/staging.
  // We only enforce that it stays clearly a hold area by requiring a README file.
  const holdReadme = path.join(holdDir, "README.md");
  if (!exists(holdReadme)) {
    fail(
      "`supabase/migrations/_hold/` exists but has no README.md explaining its limited use. Add one per policy.",
    );
  }
}

function checkNoDirectSqlExecution() {
  // Check scripts directory for patterns that indicate direct SQL execution for SCHEMA CHANGES
  // Note: Read-only queries (SELECT) are allowed, but schema changes (CREATE/ALTER/DROP) are forbidden
  const scriptsDir = path.join(repoRoot, "scripts");
  if (!exists(scriptsDir)) return;

  const scriptFiles = listFilesRecursive(scriptsDir, (p) =>
    /\.(mjs|js|ts|tsx)$/.test(p),
  );

  const forbiddenPatterns = [
    // Executing migration SQL directly (reading migration files and executing them)
    {
      pattern: /readFileSync.*migrations.*\.sql.*query|readFileSync.*migrations.*\.sql.*execute|readFileSync.*migrations.*\.sql.*client\.query/i,
      message: "Reads migration SQL and executes directly - use 'supabase db push' instead",
    },
    // Executing CREATE/ALTER/DROP statements directly
    {
      pattern: /\.query\([^)]*CREATE\s+(?:TABLE|INDEX|FUNCTION|TRIGGER|POLICY)/i,
      message: "Executes CREATE statements directly - use migrations via 'supabase db push'",
    },
    {
      pattern: /\.query\([^)]*ALTER\s+TABLE/i,
      message: "Executes ALTER TABLE directly - use migrations via 'supabase db push'",
    },
    {
      pattern: /\.query\([^)]*DROP\s+(?:TABLE|INDEX|FUNCTION|TRIGGER|POLICY)/i,
      message: "Executes DROP statements directly - use migrations via 'supabase db push'",
    },
    // Using pg library to execute migration SQL
    {
      pattern: /import.*pg.*from.*migrations|require\(['"]pg['"]\).*migrations/i,
      message: "Uses 'pg' library with migration files - use 'supabase db push' instead",
    },
  ];

  const allowedPatterns = [
    /introspect/i, // Introspection scripts (read-only) are allowed
    /check-/i, // Policy check scripts are allowed
    /verify-/i, // Verification scripts (read-only) are allowed
    /SELECT/i, // SELECT queries are allowed (read-only)
  ];

  for (const file of scriptFiles) {
    const txt = readText(file);
    const relativePath = relative(file);

    // Skip if it's clearly a read-only script
    const isReadOnly = allowedPatterns.some((pattern) =>
      pattern.test(relativePath) || pattern.test(txt),
    );
    if (isReadOnly) {
      continue;
    }

    for (const { pattern, message } of forbiddenPatterns) {
      if (pattern.test(txt)) {
        fail(
          `${relativePath}: ${message}. See docs/development/DATABASE_MANAGEMENT_POLICY.md`,
        );
        return;
      }
    }
  }

  ok("No direct SQL execution patterns detected in scripts");
}

function main() {
  ok("Running database policy checks...");
  checkNoSecretsInEnvTemplate();
  checkDocsDoNotRecommendManualSql();
  checkMigrationFilenames();
  checkHoldFolderNotUsedAsSourceOfTruth();
  checkNoDirectSqlExecution();

  if (process.exitCode && process.exitCode !== 0) {
    // eslint-disable-next-line no-console
    console.error(
      "\nDB policy checks failed. Fix the issues above before committing/merging.",
    );
    process.exit(1);
  }

  ok("All DB policy checks passed");
}

main();


