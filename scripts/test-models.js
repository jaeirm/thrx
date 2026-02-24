
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Read config from .env.local manually since we are running with node
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/NEXT_PUBLIC_GEMINI_API_KEY=([^\r\n]+)/);

if (!apiKeyMatch) {
    console.error("API Key not found inside .env.local");
    process.exit(1);
}

const apiKey = apiKeyMatch[1].trim().replace(/^['"]|['"]$/g, ''); // Trim and remove quotes if present

console.log(`API Key loaded: ${apiKey.substring(0, 5)}... (${apiKey.length} chars)`);

async function checkModelsWithFetch() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        console.log(`Fetching models from: ${url.replace(apiKey, 'HIDDEN_KEY')}`);

        const response = await fetch(url);
        if (!response.ok) {
            console.error(`List Models Failed: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error('Response:', text);
            return;
        }

        const data = await response.json();
        console.log("Available Models:");
        if (data.models) {
            const names = data.models.map(m => m.name).join('\n');
            fs.writeFileSync('models_list.txt', names);
            console.log("Written to models_list.txt");
        } else {
            console.log("No models found in response.");
        }

    } catch (error) {
        console.error("Fetch Error:", error.message);
    }
}

checkModelsWithFetch();
