import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
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
    private conversationHistory: Array<HumanMessage | AIMessage> = [];
    private maxConversationLength: number = 10;

    async initialize(apiKey: string, mcpServers: McpServersConfig, maxConversationLength: number = 10) {
        console.info('Initializing agent')
        this.maxConversationLength = maxConversationLength;
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

    setMaxConversationLength(length: number) {
        this.maxConversationLength = length;
        this.trimConversationHistory();
    }

    private trimConversationHistory() {
        if (this.conversationHistory.length > this.maxConversationLength * 2) {
            const excessMessages = this.conversationHistory.length - (this.maxConversationLength * 2);
            this.conversationHistory = this.conversationHistory.slice(excessMessages);
        }
    }

    async processQuery(query: string) {
        try {
            console.info('query:', query);
            
            const humanMessage = new HumanMessage(query);
            this.conversationHistory.push(humanMessage);
            
            this.trimConversationHistory();
            
            const messages = { messages: this.conversationHistory };
            
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
                }]
            });
            
            const aiMessage = result.messages[result.messages.length - 1];
            
            this.conversationHistory.push(aiMessage);
            
            this.trimConversationHistory();
            
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
    }

    getSerializableHistory() {
        return this.conversationHistory.map(msg => ({
            type: msg._getType(),
            content: msg.content
        }));
    }

    loadSerializableHistory(history: Array<{type: string, content: string}>) {
        this.conversationHistory = history.map(item => {
            if (item.type === 'human') {
                return new HumanMessage(item.content);
            } else {
                return new AIMessage(item.content);
            }
        });
        this.trimConversationHistory();
    }

    cleanup() {
        console.info('Cleanup');
        this.mcpCleanup?.();
    }
}