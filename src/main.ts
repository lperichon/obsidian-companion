import { McpServersConfig } from '@h1deya/langchain-mcp-tools';

import { App, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';
import { CompanionView, VIEW_TYPE_COMPANION } from './views/companion.js';
import Agent from './utils/agent.js';
import './styles.css';

interface PluginSettings {
	anthropicApiKey: string;
	googleApiKey: string;
	openaiApiKey: string;
	localRestApiKey: string;
	// New settings for conversation history
	maxConversationLength: number;
	saveConversationOnClose: boolean;
}

const DEFAULT_SETTINGS: PluginSettings = {
	anthropicApiKey: '',
	googleApiKey: '',
	openaiApiKey: '',
	localRestApiKey: '',
	// Default values for new settings
	maxConversationLength: 10,
	saveConversationOnClose: false
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

		const llmApiKey = this.settings.openaiApiKey;
		
		// Initialize the agent with the max conversation length from settings
		this.agent = new Agent();
		await this.agent.initialize(llmApiKey, mcpServers, this.settings.maxConversationLength);
		
		// Load conversation history if enabled
		if (this.settings.saveConversationOnClose) {
			const data = await this.loadData();
			if (data && data.conversationHistory) {
				this.agent.loadSerializableHistory(data.conversationHistory);
			}
		}
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
		
		new Setting(containerEl)
		.setName('OpenAI API Lkey')
		.setDesc('It\'s a secret')
		.addText(text => text
			.setPlaceholder('Enter your secret')
			.setValue(this.plugin.settings.openaiApiKey)
			.onChange(async (value) => {
				this.plugin.settings.openaiApiKey = value;
				await this.plugin.saveSettings();
			}));

		new Setting(containerEl)
			.setName('Anthropic API Lkey')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.anthropicApiKey)
				.onChange(async (value) => {
					this.plugin.settings.anthropicApiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Google API Lkey')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.googleApiKey)
				.onChange(async (value) => {
					this.plugin.settings.googleApiKey = value;
					await this.plugin.saveSettings();
				}));
		
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
				
		// Add new settings for conversation history
		containerEl.createEl('h3', { text: 'Conversation History Settings' });
		
		new Setting(containerEl)
			.setName('Max Conversation Length')
			.setDesc('Maximum number of messages to keep in conversation history')
			.addSlider(slider => slider
				.setLimits(1, 50, 1)
				.setValue(this.plugin.settings.maxConversationLength)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.maxConversationLength = value;
					// Update the agent's max conversation length
					if (this.plugin.agent) {
						this.plugin.agent.setMaxConversationLength(value);
					}
					await this.plugin.saveSettings();
				}));
				
		new Setting(containerEl)
			.setName('Save Conversation on Close')
			.setDesc('Save conversation history when closing the plugin')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.saveConversationOnClose)
				.onChange(async (value) => {
					this.plugin.settings.saveConversationOnClose = value;
					await this.plugin.saveSettings();
				}));
	}
} 