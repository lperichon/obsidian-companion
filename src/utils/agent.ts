import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOllama } from '@langchain/ollama';
import { MemorySaver } from '@langchain/langgraph';
import {
    convertMcpToLangchainTools,
    McpServersConfig,
    McpServerCleanupFn
} from '@h1deya/langchain-mcp-tools';

export default class Agent {
    mcpCleanup: McpServerCleanupFn | undefined;
    private static agent: any;
    private conversationHistory: Array<HumanMessage | AIMessage> = [];
    private checkpointer: MemorySaver;
    private threadId: string | undefined;

    constructor() {
        this.checkpointer = new MemorySaver();
    }

    async initialize(apiKey: string, mcpServers: McpServersConfig, threadId?: string) {
        console.info('Initializing agent')
        this.threadId = threadId;
        try {
            const llm = new ChatOllama({
                model: 'qwen2.5:7b',
                temperature: 0
            })

            const { tools, cleanup } = await convertMcpToLangchainTools(mcpServers);
            this.mcpCleanup = cleanup;

            Agent.agent = await createReactAgent({
                llm,
                tools,
                checkpointer: this.checkpointer
            });
        } catch (error) {
            console.error('Failed to initialize agent:', error);
            throw error;
        }
    }

    async processQuery(query: string) {
        try {
            console.info('query:', query);
            
            const humanMessage = new HumanMessage(query);
            this.conversationHistory.push(humanMessage);
            
            const messages = { messages: this.conversationHistory };
            const config = { configurable: { thread_id: this.threadId || 'default' } };
            
            const result = await Agent.agent.invoke(messages, {
                callbacks: [{
                    handleToolStart: async (tool: any) => {
                        console.log(`Starting tool: ${tool.name}`);
                        console.log(`Tool input: ${JSON.stringify(tool.input, undefined, ' ')}`);
                    },
                    handleToolEnd: async (output: any) => {
                        console.log(`Tool output: ${JSON.stringify(output, undefined, ' ')}`);
                    },
                    handleLLMStart: async (llm: any) => {
                        console.log(`LLM thinking...`);
                    },
                    handleLLMEnd: async (output: any) => {
                        console.log(`LLM response: ${JSON.stringify(output, undefined, ' ')}`);
                    }
                }],
                configurable: config.configurable
            });
            
            const aiMessage = result.messages[result.messages.length - 1];
            
            this.conversationHistory.push(aiMessage);
            
            const response = aiMessage.content;
            console.info('response:', response);

            return response;
        } catch (error) {
            console.error('Error processing query:', error);
            throw error;
        }
    }

    clearConversationHistory() {
        this.conversationHistory = [];
        // Generate a new thread ID when clearing history
        this.threadId = crypto.randomUUID();
    }

    getSerializableHistory() {
        return {
            messages: this.conversationHistory.map(msg => ({
                type: msg._getType(),
                content: msg.content
            })),
            threadId: this.threadId
        };
    }

    loadSerializableHistory(history: { messages: Array<{type: string, content: string}>, threadId?: string }) {
        this.threadId = history.threadId || crypto.randomUUID();
        this.conversationHistory = history.messages.map(item => {
            if (item.type === 'human') {
                return new HumanMessage(item.content);
            } else {
                return new AIMessage(item.content);
            }
        });
    }

    cleanup() {
        this.mcpCleanup?.();
    }
}