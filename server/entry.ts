import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Render starts the compiled server from dist-server/, but the existing
// server entry expects the project root so `process.cwd()/dist` resolves
// to the Vite client build output.
process.chdir(path.resolve(__dirname, "../.."));

await import("../server.js");
