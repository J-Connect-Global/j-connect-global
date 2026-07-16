import path from "node:path";
import { buildPagesArtifact } from "../build-pages-artifact.mjs";

const siteDir = path.resolve(process.cwd(), "_site");
await buildPagesArtifact({ siteDir });
process.env.STATIC_ROOT = siteDir;
await import("./static-server.mjs");
