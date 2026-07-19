import { appendFile, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMAGE_ROOTS = [path.join("assets", "img"), path.join("assets", "images")];
const IMAGE_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"]);
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".mjs"]);
const SKIPPED_DIRECTORIES = new Set([".git", "_site", "node_modules", "playwright-report", "test-results"]);

function read24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function imageInfo(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { format: "PNG", width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.subarray(0, 3).toString("ascii") === "GIF") {
    return { format: "GIF", width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    let offset = 12;
    while (offset + 8 <= buffer.length) {
      const type = buffer.subarray(offset, offset + 4).toString("ascii");
      const size = buffer.readUInt32LE(offset + 4);
      const data = offset + 8;
      if (type === "VP8X" && data + 10 <= buffer.length) {
        return { format: "WEBP", width: read24LE(buffer, data + 4) + 1, height: read24LE(buffer, data + 7) + 1 };
      }
      if (type === "VP8 " && data + 10 <= buffer.length) {
        return { format: "WEBP", width: buffer.readUInt16LE(data + 6) & 0x3fff, height: buffer.readUInt16LE(data + 8) & 0x3fff };
      }
      if (type === "VP8L" && data + 5 <= buffer.length) {
        const bits = buffer.readUInt32LE(data + 1);
        return { format: "WEBP", width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      offset = data + size + (size % 2);
    }
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 <= buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3 && offset + 9 <= buffer.length) {
        return { format: "JPEG", width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
  }
  if (buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    // AVIF stores the primary image dimensions in an ISO-BMFF `ispe` box.
    // The box can be nested, so scan for the first complete property record.
    const ispe = Buffer.from("ispe", "ascii");
    let offset = buffer.indexOf(ispe);
    while (offset !== -1) {
      if (offset + 16 <= buffer.length) {
        const width = buffer.readUInt32BE(offset + 8);
        const height = buffer.readUInt32BE(offset + 12);
        if (width > 0 && height > 0) return { format: "AVIF", width, height };
      }
      offset = buffer.indexOf(ispe, offset + ispe.length);
    }
  }
  return { format: "UNKNOWN", width: null, height: null };
}

async function walk(directory, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) await walk(path.join(directory, entry.name), files);
    } else if (entry.isFile()) {
      files.push(path.join(directory, entry.name));
    }
  }
  return files;
}

function toWebPath(root, file) {
  return `/${path.relative(root, file).split(path.sep).join("/")}`;
}

function countOccurrences(text, needle) {
  let count = 0;
  let offset = 0;
  while ((offset = text.indexOf(needle, offset)) !== -1) {
    count += 1;
    offset += needle.length;
  }
  return count;
}

export async function auditImageAssets({ root = rootDir } = {}) {
  const imageFiles = (await Promise.all(IMAGE_ROOTS.map(async (relativeRoot) => {
    const imageRoot = path.join(root, relativeRoot);
    return walk(imageRoot).catch(() => []);
  }))).flat().filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()));
  const records = await Promise.all(imageFiles.map(async (file) => {
    const [header, details] = await Promise.all([readFile(file), stat(file)]);
    const info = imageInfo(header);
    return {
      path: toWebPath(root, file),
      bytes: details.size,
      format: info.format,
      width: info.width,
      height: info.height,
      references: 0,
      referenced_by: []
    };
  }));

  const sourceFiles = (await walk(root)).filter((file) => TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()));
  const sourceText = await Promise.all(sourceFiles.map(async (file) => ({
    path: path.relative(root, file).split(path.sep).join("/"),
    text: await readFile(file, "utf8").catch(() => "")
  })));
  for (const record of records) {
    const references = sourceText
      .map((source) => ({ path: source.path, occurrences: countOccurrences(source.text, record.path) }))
      .filter((source) => source.occurrences > 0);
    record.references = references.reduce((total, source) => total + source.occurrences, 0);
    record.referenced_by = references;
  }

  records.sort((left, right) => right.bytes - left.bytes || left.path.localeCompare(right.path));
  const totalBytes = records.reduce((total, record) => total + record.bytes, 0);
  const overOneMebibyte = records.filter((record) => record.bytes > 1024 * 1024);
  return {
    schema_version: 2,
    image_roots: IMAGE_ROOTS.map((relativeRoot) => `/${relativeRoot.split(path.sep).join("/")}/`),
    generated_at: new Date().toISOString(),
    totals: {
      files: records.length,
      bytes: totalBytes,
      files_over_one_mebibyte: overOneMebibyte.length,
      unreferenced_files: records.filter((record) => record.references === 0).length
    },
    images: records
  };
}

export function validateImageBudget(report, budget) {
  const errors = [];
  const expectedFormatByExtension = new Map([
    [".avif", "AVIF"],
    [".gif", "GIF"],
    [".jpeg", "JPEG"],
    [".jpg", "JPEG"],
    [".png", "PNG"],
    [".webp", "WEBP"]
  ]);
  if (report.totals.bytes > budget.max_total_bytes) {
    errors.push(`Image total ${report.totals.bytes} exceeds budget ${budget.max_total_bytes}.`);
  }
  if (report.totals.files_over_one_mebibyte > budget.max_files_over_one_mebibyte) {
    errors.push(`Images over 1 MiB: ${report.totals.files_over_one_mebibyte} exceeds ${budget.max_files_over_one_mebibyte}.`);
  }
  for (const image of report.images) {
    const extension = path.extname(image.path).toLowerCase();
    const expectedFormat = expectedFormatByExtension.get(extension);
    if (image.bytes > budget.max_single_file_bytes) errors.push(`${image.path} exceeds per-file byte budget.`);
    if (expectedFormat && image.format !== expectedFormat) errors.push(`${image.path} is ${image.format}, but its extension requires ${expectedFormat}.`);
    if (budget.required_format && image.path.startsWith("/assets/img/") && image.format !== budget.required_format) {
      errors.push(`${image.path} is ${image.format}, expected ${budget.required_format} in /assets/img/.`);
    }
    if (!Number.isInteger(image.width) || !Number.isInteger(image.height)) errors.push(`${image.path} has unreadable dimensions.`);
    if (image.width > budget.max_width) errors.push(`${image.path} exceeds maximum width ${budget.max_width}.`);
  }
  return errors;
}

export function imageBudgetMarkdown(report, errors = []) {
  const mib = (bytes) => (bytes / (1024 * 1024)).toFixed(2);
  const largest = report.images.slice(0, 5);
  const lines = [
    "## Image asset budget",
    "",
    `- ${report.totals.files} images; ${mib(report.totals.bytes)} MiB total; ${report.totals.files_over_one_mebibyte} over 1 MiB.`,
    `- ${report.totals.unreferenced_files} image assets have no repository text reference (reported, not blocked).`,
    "",
    "| Largest image | Dimensions | Size | References |",
    "| --- | ---: | ---: | ---: |"
  ];
  for (const image of largest) lines.push(`| ${image.path} | ${image.width}×${image.height} | ${mib(image.bytes)} MiB | ${image.references} |`);
  if (errors.length) lines.push("", ...errors.map((error) => `- ❌ ${error}`));
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const budgetPath = path.join(rootDir, "content", "quality-baselines", "image-asset-budget.json");
  const report = await auditImageAssets();
  let errors = [];
  if (args.has("--check")) {
    const budget = JSON.parse(await readFile(budgetPath, "utf8"));
    errors = validateImageBudget(report, budget);
  }
  const markdown = imageBudgetMarkdown(report, errors);
  if (args.has("--github-summary") && process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown, "utf8");
  }
  process.stdout.write(args.has("--json") ? `${JSON.stringify(report, null, 2)}\n` : markdown);
  if (errors.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
