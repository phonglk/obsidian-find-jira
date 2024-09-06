import { ItemView, WorkspaceLeaf } from 'obsidian';
import FindJiraIssuePlugin from './FindJiraIssuePlugin';
import { JiraIssue } from './types';

export default class JiraIssueView extends ItemView {
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
            const issues = await this.plugin.fetchJiraIssues(this.searchInput.value.trim());
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