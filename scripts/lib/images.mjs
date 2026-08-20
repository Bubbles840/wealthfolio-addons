import { readFileSync } from "node:fs";

/**
 * Minimal image inspection. A declared cover has to be a real image of that
 * type — an extension is a claim, not evidence, and the catalog renders these
 * files to users.
 */

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readPng(buffer) {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  if (buffer.subarray(12, 16).toString("ascii") !== "IHDR") return null;
  return { format: "png", width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readWebp(buffer) {
  if (buffer.length < 30) return null;
  if (buffer.subarray(0, 4).toString("ascii") !== "RIFF") return null;
  if (buffer.subarray(8, 12).toString("ascii") !== "WEBP") return null;

  const chunk = buffer.subarray(12, 16).toString("ascii");

  // Extended format: canvas size is stored as two 24-bit values, minus one.
  if (chunk === "VP8X") {
    return {
      format: "webp",
      width: (buffer.readUIntLE(24, 3) & 0xffffff) + 1,
      height: (buffer.readUIntLE(27, 3) & 0xffffff) + 1,
    };
  }

  // Lossy: dimensions follow the 3-byte start code in the VP8 keyframe header.
  if (chunk === "VP8 ") {
    return {
      format: "webp",
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  // Lossless: 14 bits each, packed after the signature byte.
  if (chunk === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return {
      format: "webp",
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  return { format: "webp", width: 0, height: 0 };
}

/**
 * Returns { format, width, height } for a real PNG or WebP, or null when the
 * bytes are not an image of a supported type.
 */
export function inspectImage(filePath) {
  const buffer = readFileSync(filePath);
  return readPng(buffer) ?? readWebp(buffer);
}
