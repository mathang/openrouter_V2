const HF_SPACE_URL = "https://deaconhead-kokoro-tts.hf.space";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const token = process.env.HUGGINGFACE_TOKEN;
  if (!token) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error:
          "HUGGINGFACE_TOKEN is not set on the server. Configure it in Netlify environment variables.",
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const { text, voice = "af_heart", speed = 1 } = payload || {};
  if (!text || typeof text !== "string") {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing required 'text' string." }),
    };
  }

  try {
    const response = await fetch(`${HF_SPACE_URL}/api/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: [text, voice, Number(speed)],
        api_name: "/predict",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: errorText || "Failed to fetch audio from the TTS service.",
        }),
      };
    }

    const data = await response.json();
    const audioPath = Array.isArray(data?.data) ? data.data[0] : null;
    if (!audioPath || typeof audioPath !== "string") {
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Unexpected response from TTS service." }),
      };
    }

    const audioUrl = audioPath.startsWith("http")
      ? audioPath
      : `${HF_SPACE_URL}${audioPath.startsWith("/") ? "" : "/"}${audioPath}`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioUrl }),
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "TTS request failed." }),
    };
  }
};
