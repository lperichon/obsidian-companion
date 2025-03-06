import { ItemView, WorkspaceLeaf } from 'obsidian';
import CompanionPlugin from '../main.js';

export const VIEW_TYPE_COMPANION = 'companion-view';

export class CompanionView extends ItemView {
  plugin: CompanionPlugin;
  private chatContainer: HTMLElement;
  private queryInput: HTMLTextAreaElement;

  constructor(leaf: WorkspaceLeaf, plugin: CompanionPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_COMPANION;
  }

  getDisplayText() {
    return 'Obsidian Companion';
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    
    // Create header with title and clear button
    const headerContainer = container.createDiv({ cls: 'companion-header-container' });
    headerContainer.createEl('h4', { text: 'Obsidian Companion', cls: 'companion-title' });
    
    const clearButton = headerContainer.createEl("button", {
      text: "Clear Chat",
      cls: "companion-clear-button",
      attr: {type: "button"}
    });
    
    // Add LLM provider toggle
    const toggleContainer = container.createDiv({ cls: 'companion-toggle-container' });
    const toggleLabel = toggleContainer.createEl('span', { text: 'LLM Provider: ', cls: 'companion-toggle-label' });
    
    // Create toggle button
    const toggleButton = toggleContainer.createEl('button', {
      cls: 'companion-toggle-button',
      attr: { type: 'button' }
    });
    
    // Set initial toggle state based on current provider
    const currentProvider = this.plugin.agent?.getCurrentLlmProvider() || this.plugin.settings.useLlmProvider;
    toggleButton.textContent = currentProvider === 'local' ? 'Local (Ollama)' : 'Remote (OpenRouter)';
    toggleButton.classList.add(currentProvider === 'local' ? 'local-active' : 'remote-active');
    
    // Add event listener for toggle button
    toggleButton.addEventListener('click', async () => {
      const newProvider = toggleButton.textContent?.includes('Local') ? 'remote' : 'local';
      toggleButton.textContent = newProvider === 'local' ? 'Local (Ollama)' : 'Remote (OpenRouter)';
      toggleButton.classList.remove('local-active', 'remote-active');
      toggleButton.classList.add(newProvider === 'local' ? 'local-active' : 'remote-active');
      
      // Switch LLM provider
      const llmApiKey = this.plugin.settings.openRouterApiKey;
      const mcpServers = {
        "obsidian-mcp-tools": {
          "command": "/Users/luisperichon/Workspace/obsidian-mcp/.obsidian/plugins/mcp-tools/bin/mcp-server",
          "args": [],
          "env": {
            "OBSIDIAN_API_KEY": this.plugin.settings.localRestApiKey
          }
        }
      };
      
      await this.plugin.agent.switchLlmProvider(newProvider, llmApiKey, mcpServers);
    });
    
    // Create query input field
    const inputContainer = container.createDiv({ cls: 'companion-input-container' });
    this.queryInput = inputContainer.createEl('textarea', {
      cls: 'companion-query-input',
      attr: { placeholder: 'Enter your query here...' }
    });
    
    // Create submit button
    const button = inputContainer.createEl("button", {
      text: "Submit",
      cls: "companion-submit-button",
      attr: {type: "submit"}
    });

    // Create chat container
    this.chatContainer = container.createDiv({ cls: 'companion-chat-container' });

    // Add event listener for clear button
    clearButton.addEventListener("click", () => {
      this.chatContainer.empty();
      this.plugin.agent.clearConversationHistory();
    });

    // Add event listener for submit button
    button.addEventListener("click", async () => {
      await this.handleQuerySubmission();
    });
    
    // Add event listener for Enter key (with Shift+Enter for new line)
    this.queryInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        await this.handleQuerySubmission();
      }
    });
    
    // Load existing conversation history if available
    if (this.plugin.settings.saveConversationOnClose) {
      await this.displaySavedConversation();
    }
  }
  
  // Method to handle query submission
  async handleQuerySubmission() {
    const query = this.queryInput.value;
    if (!query) {
      return;
    }
    
    // Display the query
    this.displayQuery(query);
    
    // Clear the input field
    this.queryInput.value = '';
    
    try {
      // Show loading indicator
      const loadingContainer = this.chatContainer.createDiv({ cls: 'companion-loading-container' });
      loadingContainer.createEl('div', { cls: 'companion-loading', text: 'Thinking...' });
      
      // Process the query
      const response = await this.plugin.agent.processQuery(query);
      
      // Remove loading indicator
      loadingContainer.remove();
      
      // Display the response
      this.displayResponse(response);
    } catch (error) {
      console.error('Error processing query:', error);
      
      // Display error message
      const errorContainer = this.chatContainer.createDiv({ cls: 'companion-error-container' });
      errorContainer.createEl('h5', { text: 'Error:' });
      errorContainer.createDiv({ cls: 'companion-error', text: 'An error occurred while processing your query.' });
    }
  }
  
  // Method to display a query in the chat container
  displayQuery(query: string) {
    const queryContainer = this.chatContainer.createDiv({ cls: 'companion-query-container' });
    queryContainer.createEl('h5', { text: 'You:' });
    queryContainer.createDiv({ cls: 'companion-query', text: query });
    
    // Scroll to bottom
    this.scrollToBottom();
  }
  
  // Method to display a response in the chat container
  displayResponse(response: string) {
    const responseContainer = this.chatContainer.createDiv({ cls: 'companion-response-container' });
    responseContainer.createEl('h5', { text: 'Companion:' });
    const responseDiv = responseContainer.createDiv({ cls: 'companion-response'});
    responseDiv.innerText = response;
    
    // Scroll to bottom
    this.scrollToBottom();
  }
  
  // Method to scroll the chat container to the bottom
  scrollToBottom() {
    this.chatContainer.scrollTo({
      top: this.chatContainer.scrollHeight,
      behavior: 'smooth'
    });
  }
  
  // Method to display saved conversation
  async displaySavedConversation() {
    const history = this.plugin.agent.getSerializableHistory();
    if (history && history.messages && history.messages.length > 0) {
        for (const message of history.messages) {
            if (message.type === 'human') {
                this.displayQuery(message.content);
            } else {
                this.displayResponse(message.content);
            }
        }
    }
  }

  async onClose() {
    console.log('onClose');
    // Save conversation history if enabled
    if (this.plugin.settings.saveConversationOnClose) {
      await this.plugin.saveConversationHistory();
    }
  }
}