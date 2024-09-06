import { App, Editor, Plugin, PluginSettingTab, Setting, requestUrl, ItemView, WorkspaceLeaf, MarkdownView } from 'obsidian';

interface FindJiraIssueSettings {
    jiraUrl: string;
    username: string;
    apiToken: string;
    project: string;
}

const DEFAULT_SETTINGS: FindJiraIssueSettings = {
    jiraUrl: '',
    username: '',
    apiToken: '',
    project: ''
}

interface JiraIssue {
    key: string;
    fields: {
        summary: string;
        status: {
            name: string;
        };
    };
}

export default class FindJiraIssuePlugin extends Plugin {
    settings: FindJiraIssueSettings;
    jiraView: JiraIssueView;
    lastActiveView: MarkdownView | null = null;

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest);
    }

    async onload() {
        await this.loadSettings();
        this.addRibbonIcon('search', 'Toggle Jira Issue View', this.toggleJiraView.bind(this));
        this.addCommand({
            id: 'toggle-jira-issue-view',
            name: 'Toggle Jira Issue View',
            callback: this.toggleJiraView.bind(this)
        });
        this.addSettingTab(new FindJiraIssueSettingTab(this.app, this));
        this.registerView('jira-issue-view', (leaf) => new JiraIssueView(leaf, this));
        this.registerActiveLeafChange();
    }

    onunload() {
        this.app.workspace.detachLeavesOfType('jira-issue-view');
    }

    private registerActiveLeafChange() {
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', (leaf) => {
                if (leaf.view instanceof MarkdownView) {
                    this.lastActiveView = leaf.view;
                }
            })
        );
    }

    async toggleJiraView() {
        const leaves = this.app.workspace.getLeavesOfType('jira-issue-view');
        if (leaves.length) {
            await this.app.workspace.revealLeaf(leaves[0]);
        } else {
            const rightLeaf = this.app.workspace.getRightLeaf(false);
            if (rightLeaf) {
                await rightLeaf.setViewState({
                    type: 'jira-issue-view',
                    active: true,
                });
            }
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    insertJiraIssueLink(issue: JiraIssue) {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView) || this.lastActiveView;
        if (activeView) {
            const { editor } = activeView;
            const cursor = editor.getCursor();
            const insertText = `[${issue.key}: ${issue.fields.summary}](${this.settings.jiraUrl}/browse/${issue.key})`;
            editor.replaceRange(insertText, cursor);
            editor.setCursor({ line: cursor.line, ch: cursor.ch + insertText.length });
            activeView.leaf.setEphemeralState({ focus: true });
        }
    }

    async fetchJiraIssues(query: string): Promise<JiraIssue[]> {
        return fetchJiraIssues(this.settings, query);
    }
}

class FindJiraIssueSettingTab extends PluginSettingTab {
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

class JiraIssueView extends ItemView {
    private plugin: FindJiraIssuePlugin;
    private searchInput: HTMLInputElement;
    private issueList: HTMLElement;

    constructor(leaf: WorkspaceLeaf, plugin: FindJiraIssuePlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return 'jira-issue-view';
    }

    getDisplayText() {
        return 'Jira Issues';
    }

    async onOpen() {
        const { containerEl } = this;
        containerEl.empty();

        this.searchInput = this.createSearchInput();
        this.issueList = containerEl.createEl('div', { cls: 'jira-issue-list' });

        await this.fetchIssues();
    }

    private createSearchInput(): HTMLInputElement {
        const input = this.containerEl.createEl('input', {
            type: 'text',
            placeholder: 'Search Jira issues...',
        });
        input.addEventListener('input', this.onSearchInput.bind(this));
        return input;
    }

    private async onSearchInput() {
        await this.fetchIssues();
    }

    private async fetchIssues() {
        try {
            const issues = await this.plugin.fetchJssues(this.searchInput.value.trim());
            this.renderIssues(issues);
        } catch (error) {
            console.error('Error fetching Jira issues:', error);
            this.renderError();
        }
    }

    private renderIssues(issues: JiraIssue[]) {
        this.issueList.empty();
        issues.forEach(this.renderIssue.bind(this));
    }

    private renderIssue(issue: JiraIssue) {
        const issueEl = this.issueList.createEl('div', { cls: 'jira-issue-item' });
        issueEl.createEl('div', { text: `${issue.key}: ${issue.fields.summary}`, cls: 'jira-issue-title' });
        issueEl.createEl('div', { text: `Status: ${issue.fields.status.name}`, cls: 'jira-issue-status' });
        issueEl.addEventListener('click', (event) => {
            event.preventDefault();
            this.plugin.insertJiraIssueLink(issue);
        });
    }

    private renderError() {
        this.issueList.empty();
        this.issueList.createEl('div', { text: 'Error fetching Jira issues' });
    }
}

async function fetchJiraIssues(settings: FindJiraIssueSettings, query: string): Promise<JiraIssue[]> {
    const jql = buildJql(settings.project, query);
    const authToken = btoa(`${settings.username}:${settings.apiToken}`);
    
    try {
        const response = await requestUrl({
            url: `${settings.jiraUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=20`,
            method: 'GET',
            headers: {
                'Authorization': `Basic ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        return response.json.issues;
    } catch (error) {
        console.error('Error fetching Jira issues:', error);
        throw error;
    }
}

function buildJql(project: string, query: string): string {
    const baseJql = `project = "${project}"`;
    const searchJql = query ? `AND (summary ~ "${query}*" OR description ~ "${query}*")` : '';
    return `${baseJql} ${searchJql} ORDER BY updated DESC`;
}
