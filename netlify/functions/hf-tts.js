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

  const { text, voice = "af_heart", speed = 1, use_gpu = "false" } = payload || {};
  if (!text || typeof text !== "string") {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing required 'text' string." }),
    };
  }

  try {
    const requestBody = {
      data: [text, voice, Number(speed), use_gpu],
      api_name: "/generate_first",
    };

    const response = await fetch(`${HF_SPACE_URL}/api/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    let parsed;
    try {
      parsed = responseText ? JSON.parse(responseText) : null;
    } catch (error) {
      parsed = null;
    }

    if (!response.ok) {
      console.error("HF TTS request failed", {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get("content-type"),
        bodyPreview: responseText?.slice(0, 500),
      });
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error:
            parsed?.error ||
            responseText ||
            "Failed to fetch audio from the TTS service.",
        }),
      };
    }

    const data = parsed;
    const audioPath = Array.isArray(data?.data) ? data.data[0] : null;
    if (!audioPath || typeof audioPath !== "string") {
      console.error("HF TTS unexpected response", {
        contentType: response.headers.get("content-type"),
        bodyPreview: responseText?.slice(0, 500),
      });
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
