// Registra el hook de alias "@/" para los tests. Uso:
//   node --experimental-strip-types --import ./scripts/register-alias.mjs <test>.ts
import { register } from "node:module";
register("./alias-hook.mjs", import.meta.url);
