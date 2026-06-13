// Script para resetear tu password de TijerApp con SERVICE_ROLE_KEY local.
// Uso: node scripts/reset-my-password.mjs
//
// Lee SUPABASE_SERVICE_ROLE_KEY de .env.local automáticamente.
// Te pide email + nueva password en stdin. La cambia en auth.users.

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const envPath = ".env.local";
const env = await readFile(envPath, "utf8");
function getEnv(key) {
  const match = env.match(new RegExp(`^${key}=(.+)$`, "m"));
  if (!match) throw new Error(`Falta ${key} en ${envPath}`);
  return match[1].trim().replace(/^["']|["']$/g, "");
}

const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const rl = createInterface({ input: stdin, output: stdout });
const email = (await rl.question("Email del user a resetear: ")).trim().toLowerCase();
const newPassword = (await rl.question("Nueva password: ")).trim();
rl.close();

if (newPassword.length < 8) {
  console.error("La password debe tener al menos 8 chars.");
  process.exit(1);
}

const { data: usersData } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 200,
});
const user = (usersData?.users ?? []).find(
  (u) => (u.email ?? "").toLowerCase() === email,
);

if (!user) {
  console.error(`No encontré un user con email ${email}`);
  process.exit(1);
}

console.log(`Encontré: ${user.email} (id: ${user.id})`);

const { error } = await supabase.auth.admin.updateUserById(user.id, {
  password: newPassword,
});

if (error) {
  console.error("Error reseteando:", error.message);
  process.exit(1);
}

console.log("\n✅ Password reseteada OK. Andá a tijerapp.vercel.app/owner/login");
