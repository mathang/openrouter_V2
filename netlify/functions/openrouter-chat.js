// netlify/functions/openrouter-chat.js
// CommonJS-style Netlify function for better compatibility

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error:
          "OPENROUTER_API_KEY is not set on the server. Configure it in Netlify environment variables.",
      }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const { messages } = body || {};
  if (!Array.isArray(messages)) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing 'messages' array" }),
    };
  }

  try {
    const openrouterRes = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://openrouterchatbot.netlify.app",
          "X-Title": "AI Tools Teaching Chatbot",
        },
        body: JSON.stringify({
          model: "google/gemma-3-27b-it:free",
          messages,
          temperature: 0.4,
          stream: true,
        }),
      }
    );

    if (!openrouterRes.ok) {
      const errorText = await openrouterRes.text();
      let data = null;
      try {
        data = JSON.parse(errorText);
      } catch (e) {
        // Non-JSON from OpenRouter
      }
      console.error("OpenRouter error:", data || errorText);
      return {
        statusCode: openrouterRes.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: data && data.error ? data.error : errorText || "Unknown error",
        }),
      };
    }

    const streamHeaders = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    };

    return new Response(openrouterRes.body, {
      status: 200,
      headers: streamHeaders,
    });
  } catch (err) {
    console.error("OpenRouter request failed:", err);
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to contact OpenRouter: " + (err.message || "unknown"),
      }),
    };
  }
};
