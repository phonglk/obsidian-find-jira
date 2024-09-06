import './styles.css';
import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, ItemView } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import React from 'react';
import JiraIssueView from './JiraIssueView';
import { fetchJiraIssues } from './jiraApi';
import FindJiraIssueSettingTab from './FindJiraIssueSettingTab';

export interface FindJiraIssueSettings {
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

export interface JiraIssue {
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
    private root: Root | null = null;

    async onload() {
        await this.loadSettings();
        this.addRibbonIcon('search', 'Toggle Jira Issue View', this.toggleJiraView.bind(this));
        this.addCommand({
            id: 'toggle-jira-issue-view',
            name: 'Toggle Jira Issue View',
            callback: this.toggleJiraView.bind(this)
        });
        this.addSettingTab(new FindJiraIssueSettingTab(this.app, this));

        this.registerView('jira-issue-view', (leaf) => new JiraIssueItemView(leaf, this));
    }

    async toggleJiraView() {
        const existing = this.app.workspace.getLeavesOfType('jira-issue-view');
        if (existing.length) {
            this.app.workspace.revealLeaf(existing[0]);
        } else {
            const leaf = this.app.workspace.getRightLeaf(false);
            await leaf.setViewState({ type: 'jira-issue-view', active: true });
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    insertJiraIssueLink(issue: JiraIssue) {
        const activeView = this.app.workspace.getActiveViewOfType('markdown');
        if (activeView) {
            const editor = activeView.editor;
            const cursor = editor.getCursor();
            const insertText = `[${issue.key}: ${issue.fields.summary}](${this.settings.jiraUrl}/browse/${issue.key})`;
            editor.replaceRange(insertText, cursor);
            editor.setCursor({ line: cursor.line, ch: cursor.ch + insertText.length });
        }
    }
}

class JiraIssueItemView extends ItemView {
    private plugin: FindJiraIssuePlugin;
    private root: Root | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: FindJiraIssuePlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return 'jira-issue-view';
    }

    getDisplayText(): string {
        return 'Jira Issues';
    }

    async onOpen() {
        const { containerEl } = this;
        containerEl.empty();
        const rootEl = containerEl.createDiv();
        this.root = createRoot(rootEl);
        this.renderView();
    }

    async onClose() {
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
    }

    private renderView() {
        if (this.root) {
            this.root.render(
                React.createElement(React.StrictMode, null,
                    React.createElement(JiraIssueView, {
                        settings: this.plugin.settings,
                        fetchJiraIssues: fetchJiraIssues,
                        insertJiraIssueLink: this.plugin.insertJiraIssueLink.bind(this.plugin)
                    })
                )
            );
        }
    }
}