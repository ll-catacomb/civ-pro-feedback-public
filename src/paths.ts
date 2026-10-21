import path from "node:path";
import { fileURLToPath } from "node:url";

/** Repository root, so every command works no matter where it is launched from. */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
