import './styles.css';
import { Plugin, WorkspaceLeaf, ItemView, MarkdownView, Notice } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import * as React from 'react';
import JiraIssueView from './JiraIssueView';
import { fetchJiraIssues, fetchJiraStatuses } from './jiraApi';
import FindJiraIssueSettingTab from './FindJiraIssueSettingTab';

export interface FindJiraIssueSettings {
    jiraUrl: string;
    username: string;
    apiToken: string;
    project: string;
    insertFormat: string;
}

const DEFAULT_SETTINGS: FindJiraIssueSettings = {
    jiraUrl: '',
    username: '',
    apiToken: '',
    project: '',
    insertFormat: '{key}:{summary}'
}

export interface JiraIssue {
    key: string;
    fields: {
        summary: string;
        description?: string;
        status: {
            name: string;
        };
        parent?: {
            fields: {
                summary: string;
            }
        };
        assignee?: {
            displayName: string;
            avatarUrls: {
                '16x16': string;
            };
        };
    };
}

export default class FindJiraIssuePlugin extends Plugin {
    settings: FindJiraIssueSettings;
    private lastActiveMarkdownView: MarkdownView | null = null;

    async onload() {
        await this.loadSettings();
        this.addCommand({
            id: 'toggle-jira-issue-view',
            name: 'Toggle Jira Issue View',
            callback: this.toggleJiraView.bind(this)
        });
        this.addSettingTab(new FindJiraIssueSettingTab(this.app, this));

        this.registerView('jira-issue-view', (leaf) => new JiraIssueItemView(leaf, this));

        this.registerEvent(
            this.app.workspace.on('active-leaf-change', (leaf) => {
                if (leaf?.view instanceof MarkdownView) {
                    this.lastActiveMarkdownView = leaf.view;
                }
            })
        );
    }

    async toggleJiraView() {
        const existing = this.app.workspace.getLeavesOfType('jira-issue-view');
        if (existing.length) {
            this.app.workspace.revealLeaf(existing[0]);
        } else {
            const leaf = this.app.workspace.getRightLeaf(false);
            if (leaf) await leaf.setViewState({ type: 'jira-issue-view', active: true });
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    insertJiraIssueLink(issue: JiraIssue) {
        const activeView = this.lastActiveMarkdownView || this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.editor) {
            const editor = activeView.editor;
            const cursor = editor.getCursor();
            const insertText = this.formatInsertText(issue);
            const linkText = `[${insertText}](${this.settings.jiraUrl}/browse/${issue.key})`;
            editor.replaceRange(linkText, cursor);
            editor.setCursor({ line: cursor.line, ch: cursor.ch + linkText.length });
        } else {
            console.error('No active markdown view found');
            new Notice('Please open a markdown file to insert the Jira issue link');
        }
    }

    private formatInsertText(issue: JiraIssue): string {
        return this.settings.insertFormat.replace(/{(\w+)}/g, (match, field) => {
            switch (field) {
                case 'key':
                    return issue.key;
                case 'summary':
                    return issue.fields.summary;
                case 'author':
                    return issue.fields.assignee?.displayName || 'Unassigned';
                case 'status':
                    return issue.fields.status.name;
                case 'parent':
                    return issue.fields.parent?.fields.summary || 'No Parent';
                default:
                    return match;
            }
        });
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
        return 'Find Jira Issues';
    }

    async onOpen() {
        const { containerEl } = this;
        containerEl.empty();
        this.root = createRoot(containerEl);
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
                        insertJiraIssueLink: this.plugin.insertJiraIssueLink.bind(this.plugin),
                        fetchJiraStatuses: fetchJiraStatuses
                    })
                )
            );
        }
    }

    getIcon(): string {
        return 'search';
    }
}