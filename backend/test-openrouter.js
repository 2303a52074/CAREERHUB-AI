
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, ".env")
});

async function test() {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim();
  const baseURL = (
    process.env.OPENROUTER_BASE_URL ||
    "https://openrouter.ai/api/v1"
  ).trim();

  console.log("API key loaded:", Boolean(key));
  console.log("Model:", model || "MISSING");
  console.log("Base URL:", baseURL);

  if (!key || !model) {
    throw new Error("OpenRouter configuration is missing.");
  }

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "CareerHub AI"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: "Say hello and generate one React interview question."
        }
      ]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("HTTP status:", response.status);
    console.error("API error:", data.error?.message);
    return;
  }

  console.log("\nSUCCESS");
  console.log("Returned model:", data.model);
  console.log("AI response:", data.choices?.[0]?.message?.content);
}

test().catch(error => console.error("Test failed:", error.message));
