import path from "node:path";

// Node's built-in env-file loader (20.6+) — no dotenv dependency needed.
// Swallows a missing file rather than crashing; tests that need
// NEXT_PUBLIC_SUPABASE_URL etc. will fail with a clear "supabaseUrl is
// required" error instead, which is diagnostic enough.
try {
  process.loadEnvFile(path.resolve(process.cwd(), ".env.local"));
} catch {
  // no .env.local — fall through
}
