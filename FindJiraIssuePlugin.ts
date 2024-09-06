import { App, Plugin, PluginManifest, MarkdownView, WorkspaceLeaf } from 'obsidian';
import { FindJiraIssueSettings, JiraIssue } from './types';
import { DEFAULT_SETTINGS } from './constants';
import JiraIssueView from './JiraIssueView';
import FindJiraIssueSettingTab from './FindJiraIssueSettingTab';
import { fetchJiraIssues } from './jiraApi';

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
            await this.app.workspace.getRightLeaf(false).setViewState({
                type: 'jira-issue-view',
                active: true,
            });
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