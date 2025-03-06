import Agent from '../src/utils/agent.js'

const localRestApiKey=''; // Enter API Key provided by the Local REST API Obsidian plugin

const mcpServers = {
	"obsidian-mcp-tools": {
        "command": "../mcp-tools/bin/mcp-server",
        "args": [],
        "env": {
            "OBSIDIAN_API_KEY": localRestApiKey
        }
    }
};

const apiKey = ''; // Enter API Key provided by OpenRouter

async function main() {
    let agent = new Agent();

    try {
        await agent.initialize(apiKey, 'remote', mcpServers);
        const query = 'List the files in my vault';
        await agent.processQuery(query);
    } finally {
        agent?.cleanup()
    }
}

main().catch(console.error);