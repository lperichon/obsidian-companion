import { McpServersConfig } from '@h1deya/langchain-mcp-tools';

import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import Agent from './agent.js';

interface PluginSettings {
	anthropicApiKey: string;
	googleApiKey: string;
	openaiApiKey: string;
	localRestApiKey: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
	anthropicApiKey: '',
	googleApiKey: '',
	openaiApiKey: '',
	localRestApiKey: ''
}

export default class CompanionPlugin extends Plugin {
	settings: PluginSettings;
	agent: any;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', async (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			const query = 'List the files in my vault';
			const response = await this.agent.processQuery(query);
			new Notice(response);
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MainSettingTab(this.app, this));

		// TODO: Get servers from settings
		const localRestApiKey = this.settings.localRestApiKey;
		console.log(this)
		const mcpServers: McpServersConfig = {
			"obsidian-mcp-tools": {
				"command": ".obsidian/plugins/mcp-tools/bin/mcp-server",
				"args": [],
				"env": {
					"OBSIDIAN_API_KEY": localRestApiKey
				}
			}
		};

		const llmApiKey = this.settings.openaiApiKey;
		
		this.agent = new Agent();
		await this.agent.initialize(llmApiKey, mcpServers);
	}

	onunload() {
		this.agent?.cleanup()
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
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
	}
}
