import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = `file:${path.join(backendRoot, "data", "test.db")}`;
process.env.PULSEFORGE_SYNC_TOKEN = "test-bootstrap-token";

execSync("npx prisma db push --skip-generate", {
  cwd: backendRoot,
  env: process.env,
  stdio: "pipe",
});