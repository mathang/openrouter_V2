import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { INTERVIEW_PARTS } from "../netlify/functions/interview-script.js";

const endpoint = process.env.TTS_ENDPOINT || "https://openrouterchatbot.netlify.app/.netlify/functions/hf-tts";
const outDir = path.resolve("generated/interview-audio-parts");
fs.mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generatePart(text, index) {
  const output = path.join(outDir, `part-${String(index + 1).padStart(2, "0")}.wav`);
  if (fs.existsSync(output) && fs.statSync(output).size > 1000) return output;

  let lastError;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: "af_heart", speed: 1.0 }),
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`HTTP ${response.status}: ${detail.slice(0, 300)}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 1000) throw new Error(`Audio response too small: ${buffer.length} bytes`);
      fs.writeFileSync(output, buffer);
      console.log(`Generated ${index + 1}/${INTERVIEW_PARTS.length}: ${buffer.length} bytes`);
      return output;
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt} failed for part ${index + 1}: ${error.message}`);
      await sleep(Math.min(15000 * attempt, 60000));
    }
  }
  throw lastError;
}

const files = [];
for (let i = 0; i < INTERVIEW_PARTS.length; i += 1) {
  files.push(await generatePart(INTERVIEW_PARTS[i], i));
}

const concatPath = path.join(outDir, "concat.txt");
fs.writeFileSync(concatPath, files.map((file) => `file '${path.basename(file).replaceAll("'", "'\\''")}'`).join("\n") + "\n");

const wavOut = path.resolve("generated/NHG_NTU_RRIS_interview_preparation_Kokoro_af_heart.wav");
const mp3Out = path.resolve("generated/NHG_NTU_RRIS_interview_preparation_Kokoro_af_heart.mp3");

let result = spawnSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", concatPath, "-c", "copy", wavOut], { stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);
result = spawnSync("ffmpeg", ["-y", "-i", wavOut, "-codec:a", "libmp3lame", "-b:a", "128k", mp3Out], { stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);

console.log(`Created ${wavOut}`);
console.log(`Created ${mp3Out}`);
