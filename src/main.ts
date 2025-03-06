import { McpServersConfig } from '@h1deya/langchain-mcp-tools';

import { App, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';
import { CompanionView, VIEW_TYPE_COMPANION } from './views/companion.js';
import Agent from './utils/agent.js';
import './styles.css';

interface PluginSettings {
	localRestApiKey: string;
	openRouterApiKey: string;
	useLlmProvider: string;
	// New settings for conversation history
	saveConversationOnClose: boolean;
	saveConversationsAsFiles: boolean;
}

const DEFAULT_SETTINGS: PluginSettings = {
	localRestApiKey: '',
	openRouterApiKey: '',
	useLlmProvider: 'local',
	// Default values for new settings
	saveConversationOnClose: false,
	saveConversationsAsFiles: false
}

export default class CompanionPlugin extends Plugin {
	settings: PluginSettings;
	agent: any;

	async onload() {
		await this.loadSettings();
		// Custom views need to be registered when the plugin is enabled
		this.registerView(
			VIEW_TYPE_COMPANION,
			(leaf) => new CompanionView(leaf, this)
		);

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('dice', 'Activate Obsidian Companion', () => {
			this.activateView();
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MainSettingTab(this.app, this));

		// TODO: Get servers from settings
		const localRestApiKey = this.settings.localRestApiKey;

		const mcpServers: McpServersConfig = {
			"obsidian-mcp-tools": {
				"command": "/Users/luisperichon/Workspace/obsidian-mcp/.obsidian/plugins/mcp-tools/bin/mcp-server",
				"args": [],
				"env": {
					"OBSIDIAN_API_KEY": localRestApiKey
				}
			}
		};

		let llmApiKey = this.settings.openRouterApiKey;
		let llmProvider = this.settings.useLlmProvider;
		
		// Initialize the agent
		this.agent = new Agent();
		
		// Load conversation history if enabled
		let threadId;
		if (this.settings.saveConversationOnClose) {
			const data = await this.loadData();
			if (data && data.conversationHistory) {
				this.agent.loadSerializableHistory(data.conversationHistory);
				threadId = data.conversationHistory.threadId;
			}
		}
		
		await this.agent.initialize(llmApiKey, llmProvider, mcpServers, threadId);
	}

	onunload() {
		// Save conversation history if enabled
		if (this.settings.saveConversationOnClose) {
			this.saveConversationHistory();
		}
		this.agent?.cleanup();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
	
	async saveConversationHistory() {
		if (this.agent) {
			const data = await this.loadData();
			const updatedData = {
				...data,
				conversationHistory: this.agent.getSerializableHistory()
			};
			await this.saveData(updatedData);

			// Save conversation as a file if enabled
			if (this.settings.saveConversationsAsFiles) {
				await this.saveConversationAsFile();
			}
		}
	}

	async saveConversationAsFile() {
		if (!this.agent) return;

		const history = this.agent.getSerializableHistory();
		if (!history || !history.messages || history.messages.length === 0) return;

		// Create the companion-conversations folder if it doesn't exist
		const folderPath = 'companion-conversations';
		if (!this.app.vault.getAbstractFileByPath(folderPath)) {
			await this.app.vault.createFolder(folderPath);
		}

		// Generate filename with timestamp
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const filename = `${folderPath}/${timestamp}.md`;

		// Convert conversation to markdown
		let markdown = '# Obsidian Companion Conversation\n\n';
		markdown += `Date: ${new Date().toLocaleString()}\n\n`;
		markdown += '---\n\n';

		for (const message of history.messages) {
			if (message.type === 'human') {
				markdown += `## You\n${message.content}\n\n`;
			} else {
				markdown += `## Companion\n${message.content}\n\n`;
			}
		}

		// Create or update the file
		try {
			await this.app.vault.create(filename, markdown);
		} catch (error) {
			console.error('Error saving conversation to file:', error);
			new Notice('Failed to save conversation to file');
		}
	}

	async activateView() {
		const { workspace } = this.app;
	
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_COMPANION);
	
		if (leaves.length > 0) {
		  // A leaf with our view already exists, use that
		  leaf = leaves[0];
		} else {
		  // Our view could not be found in the workspace, create a new leaf
		  // in the right sidebar for it
		  leaf = workspace.getRightLeaf(false);
		  await leaf?.setViewState({ type: VIEW_TYPE_COMPANION, active: true });
		}
	
		// "Reveal" the leaf in case it is in a collapsed sidebar
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	  }
}

class MainSettingTab extends PluginSettingTab {
	plugin: CompanionPlugin;

	constructor(app: App, plugin: CompanionPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		
		containerEl.createEl('h3', { text: 'API Keys' });
		
		new Setting(containerEl)
			.setName('Local REST API KEY')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.localRestApiKey)
				.onChange(async (value) => {
					this.plugin.settings.localRestApiKey = value;
					await this.plugin.saveSettings();
				}));
				
		new Setting(containerEl)
			.setName('OpenRouter API Key')
			.setDesc('API key for OpenRouter')
			.addText(text => text
				.setPlaceholder('Enter your OpenRouter API key')
				.setValue(this.plugin.settings.openRouterApiKey)
				.onChange(async (value) => {
					this.plugin.settings.openRouterApiKey = value;
					await this.plugin.saveSettings();
				}));
		
		containerEl.createEl('h3', { text: 'LLM Provider Settings' });
		
		new Setting(containerEl)
			.setName('Default LLM Provider')
			.setDesc('Choose between local (Ollama) or remote (OpenRouter) LLM')
			.addDropdown(dropdown => dropdown
				.addOption('local', 'Local (Ollama)')
				.addOption('remote', 'Remote (OpenRouter)')
				.setValue(this.plugin.settings.useLlmProvider)
				.onChange(async (value) => {
					this.plugin.settings.useLlmProvider = value;
					await this.plugin.saveSettings();
					// Reinitialize the agent with the new provider
					if (this.plugin.agent) {
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
						await this.plugin.agent.initialize(llmApiKey, value, mcpServers);
					}
				})
			);
				
		// Add new settings for conversation history
		containerEl.createEl('h3', { text: 'Conversation History Settings' });
		
		new Setting(containerEl)
			.setName('Save conversation on close')
			.setDesc('Save the conversation history when closing Obsidian')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.saveConversationOnClose)
				.onChange(async (value) => {
					this.plugin.settings.saveConversationOnClose = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName('Save conversations as files')
			.setDesc('Save each conversation as a separate note in the vault under companion-conversations folder')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.saveConversationsAsFiles)
				.onChange(async (value) => {
					this.plugin.settings.saveConversationsAsFiles = value;
					await this.plugin.saveSettings();
				})
			);
	}
} 