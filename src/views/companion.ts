import { ItemView, WorkspaceLeaf } from 'obsidian';
import CompanionPlugin from '../main.js';

export const VIEW_TYPE_COMPANION = 'companion-view';

export class CompanionView extends ItemView {
  plugin: CompanionPlugin;

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
    container.createEl('h4', { text: 'Obsidian Companion' });
    
    // Create query input field
    const inputContainer = container.createDiv({ cls: 'companion-input-container' });
    const queryInput = inputContainer.createEl('textarea', {
      cls: 'companion-query-input',
      attr: { placeholder: 'Enter your query here...' }
    });
    
    // Create submit button
    const button = container.createEl("button", {
      text: "Submit",
      attr: {type: "submit"}
    });

    const chatContainer = container.createDiv({ cls: 'companion-chat-container' });

    button.addEventListener("click", async () => {
      const query = queryInput.value;
      if (!query) {
        return;
      }
      const queryContainer = chatContainer.createDiv({ cls: 'companion-query-container' });
      queryContainer.createEl('h5', { text: 'Query:' });
      queryContainer.createDiv({ cls: 'companion-query', text: query });
      try {
        const response = await this.plugin.agent.processQuery(query);
        // Display the response
        const responseContainer = chatContainer.createDiv({ cls: 'companion-response-container' });
        responseContainer.createEl('h5', { text: 'Response:' });
        const responseDiv = responseContainer.createDiv({ cls: 'companion-response'});
        responseDiv.innerText = response;
      } catch (error) {
        console.error('Error processing query:', error);
      }
    });
  }

  async onClose() {
    // Nothing to clean up.
  }
}