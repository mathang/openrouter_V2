import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const botsDir = path.resolve(__dirname, "../../bots");

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function listBots() {
  const entries = await fs.readdir(botsDir, { withFileTypes: true });
  const bots = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const botId = entry.name;
    const configPath = path.join(botsDir, botId, "config.json");
    try {
      const config = await readJson(configPath);
      bots.push({
        id: config.id || botId,
        title: config.title || config.displayName || botId,
        displayName: config.displayName || config.shortName || botId,
        shortName: config.shortName || config.displayName || botId,
        subtitle: config.subtitle || "",
        profileImageUrl: config.profileImageUrl || "",
      });
    } catch (error) {
      console.warn(`Skipping bot ${botId}:`, error.message);
    }
  }

  return bots.sort((a, b) => a.id.localeCompare(b.id));
}

async function loadBot(botId) {
  const botPath = path.join(botsDir, botId);
  const configPath = path.join(botPath, "config.json");
  const instructionsPath = path.join(botPath, "instructions.md");
  const knowledgePath = path.join(botPath, "knowledgebase.md");

  const [config, instructions, knowledgeBase] = await Promise.all([
    readJson(configPath),
    fs.readFile(instructionsPath, "utf8"),
    fs.readFile(knowledgePath, "utf8"),
  ]);

  return {
    bot: {
      ...config,
      id: config.id || botId,
    },
    instructions,
    knowledgeBase,
  };
}

export const handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const requestedBotId = event.queryStringParameters?.bot?.trim();
  const botId = requestedBotId ? path.basename(requestedBotId) : null;

  if (requestedBotId && botId !== requestedBotId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid bot id." }),
    };
  }

  try {
    if (!botId) {
      const bots = await listBots();
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bots }),
      };
    }

    const payload = await loadBot(botId);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    };
  } catch (error) {
    const bots = await listBots().catch(() => []);
    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Bot configuration not found.",
        availableBots: bots,
      }),
    };
  }
};
