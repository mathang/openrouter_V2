import { Client } from "@gradio/client";
import { INTERVIEW_PARTS } from "./interview-script.js";

let cachedAppPromise;

const getApp = () => {
  if (!cachedAppPromise) {
    const token = process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN;
    cachedAppPromise = token
      ? Client.connect("https://deaconhead-kokoro-tts.hf.space", { hf_token: token })
      : Client.connect("https://deaconhead-kokoro-tts.hf.space");
  }
  return cachedAppPromise;
};

export const handler = async (event) => {
  try {
    const part = Number.parseInt(event.queryStringParameters?.part ?? "0", 10);
    const speed = Number.parseFloat(event.queryStringParameters?.speed ?? "1.0");
    const voice = event.queryStringParameters?.voice || "af_heart";

    if (!Number.isInteger(part) || part < 0 || part >= INTERVIEW_PARTS.length) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: `part must be between 0 and ${INTERVIEW_PARTS.length - 1}` }),
      };
    }

    const token = process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN;
    const app = await getApp();
    const result = await app.predict("/predict", [" . ." + INTERVIEW_PARTS[part], voice, speed]);
    const audioUrl = result?.data?.[0]?.url;
    if (!audioUrl) throw new Error("Kokoro returned no audio URL");

    const audioResponse = await fetch(audioUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!audioResponse.ok) throw new Error(`Audio download failed with status ${audioResponse.status}`);

    const audioBuffer = await audioResponse.arrayBuffer();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": `inline; filename=NHG_NTU_RRIS_interview_part_${String(part + 1).padStart(2, "0")}.wav`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body: Buffer.from(audioBuffer).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error("Interview Kokoro error", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message, hint: "The private Hugging Face Space may be waking. Retry this part shortly." }),
    };
  }
};
