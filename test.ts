import Agent from 'agent.js'

const localRestApiKey='26cfbf339e1ec1e33d3122594a6434e19a8427831e56715ef9d318f590c1815e'; // Enter API Key provided by the Local REST API Obsidian plugin

const mcpServers = {
	"obsidian-mcp-tools": {
        "command": "../mcp-tools/bin/mcp-server",
        "args": [],
        "env": {
            "OBSIDIAN_API_KEY": localRestApiKey
        }
    }
};

const apiKey = '';

async function main() {
    let agent = new Agent();

    try {
        await agent.initialize(apiKey, mcpServers);
        const query = 'List the files in my vault';
        await agent.processQuery(query);
    } finally {
        agent?.cleanup()
    }
}

main().catch(console.error);