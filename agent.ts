import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage } from '@langchain/core/messages';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOllama } from '@langchain/ollama';
import {
    convertMcpToLangchainTools,
    McpServersConfig,
    McpServerCleanupFn
} from '@h1deya/langchain-mcp-tools';

export default class Agent {
    mcpCleanup: McpServerCleanupFn | undefined;
    private static agent: any;

    async initialize(apiKey: string, mcpServers: McpServersConfig) {
        console.info('Initializing agent')
        try {
            const llm = new ChatOllama({
                model: 'qwen2.5:7b',
                temperature: 0
            })

            const { tools, cleanup } = await convertMcpToLangchainTools(mcpServers);
            this.mcpCleanup = cleanup;

            Agent.agent = createReactAgent({
                llm,
                tools
            });
        } catch (error) {
            console.error('Failed to initialize agent:', error);
            throw error;
        }
    }

    async processQuery(query: string) {
        try {
            console.info('query:', query);
            const messages = { messages: [new HumanMessage(query)] };
            const result = await Agent.agent.invoke(messages, {
                callbacks: [{
                    handleToolStart: async (tool) => {
                        console.log(`Starting tool: ${tool.name}`);
                        console.log(`Tool input: ${JSON.stringify(tool.input)}`);
                    },
                    handleToolEnd: async (output) => {
                        console.log(`Tool output: ${JSON.stringify(output)}`);
                    },
                    handleLLMStart: async (llm) => {
                        console.log(`LLM thinking...`);
                    },
                    handleLLMEnd: async (output) => {
                        console.log(`LLM response: ${JSON.stringify(output)}`);
                    }
                }]
            });
            const response = result.messages[result.messages.length - 1].content;
            console.info('response:', response);

            return response;
        } catch (error) {
            console.error('Error processing query:', error);
            throw error;
        }
    }

    cleanup() {
        console.info('Cleanup');
        this.mcpCleanup?.();
    }
}