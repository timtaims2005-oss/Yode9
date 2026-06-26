import OpenAI from "openai";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY must be set. Please add your OpenAI API key to the Secrets tab.",
    );
  }
  _client = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
  return _client;
}

export const openai = new Proxy({} as OpenAI, {
  get(_target, prop: string | symbol) {
    const client = getClient();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
