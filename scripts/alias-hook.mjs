// Hook de resolución para correr tests con `node --experimental-strip-types`:
// mapea el alias "@/..." (de tsconfig paths) a src/... y agrega .ts si falta.
import { pathToFileURL } from "node:url";
import { resolve as pathResolve } from "node:path";

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    let p = pathResolve(process.cwd(), "src", specifier.slice(2));
    if (!/\.[cm]?[jt]s$/.test(p)) p += ".ts";
    return next(pathToFileURL(p).href, context);
  }
  return next(specifier, context);
}
