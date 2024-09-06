import { App, PluginSettingTab, Setting } from 'obsidian';
import FindJiraIssuePlugin from './FindJiraIssuePlugin';
import { FindJiraIssueSettings } from '../types';

export default class FindJiraIssueSettingTab extends PluginSettingTab {
    private plugin: FindJiraIssuePlugin;

    constructor(app: App, plugin: FindJiraIssuePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        this.createSetting('Jira URL', 'Enter your Jira instance URL', 'https://your-domain.atlassian.net', 'jiraUrl');
        this.createSetting('Username', 'Enter your Jira username (email address)', 'your.email@example.com', 'username');
        this.createSetting('API Token', 'Enter your Jira API token', 'Enter your API token', 'apiToken');
        this.createSetting('Project', 'Enter your Jira project name or prefix', 'Enter project name/prefix', 'project');
    }

    private createSetting(name: string, desc: string, placeholder: string, prop: keyof FindJiraIssueSettings) {
        new Setting(this.containerEl)
            .setName(name)
            .setDesc(desc)
            .addText(text => text
                .setPlaceholder(placeholder)
                .setValue(this.plugin.settings[prop])
                .onChange(async (value) => {
                    this.plugin.settings[prop] = value;
                    await this.plugin.saveSettings();
                }));
    }
}