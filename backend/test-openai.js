
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, ".env")
});

async function testOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  if (!key) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  console.log("Testing model:", model);

  const response = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: "Generate one technical React interview question."
          }
        ]
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("OpenAI error:", data.error?.message);
    process.exitCode = 1;
    return;
  }

  console.log("SUCCESS");
  console.log("Response:", data.choices?.[0]?.message?.content);
}

testOpenAI().catch(error => console.error(error.message));
