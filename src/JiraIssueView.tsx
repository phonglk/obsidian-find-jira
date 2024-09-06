import React, { useState, useEffect, useCallback } from 'react';
import { Menu } from 'obsidian';
import { FindJiraIssueSettings, JiraIssue } from './main';
import ToolbarIcon from './ToolbarIcon';
import SearchComponentWrapper from './SearchComponentWrapper';

interface JiraIssueViewProps {
    settings: FindJiraIssueSettings;
    fetchJiraIssues: (settings: FindJiraIssueSettings, query: string) => Promise<JiraIssue[]>;
    insertJiraIssueLink: (issue: JiraIssue) => void;
}

export const JiraIssueView: React.FC<JiraIssueViewProps> = ({ settings, fetchJiraIssues, insertJiraIssueLink }) => {
    const [issues, setIssues] = useState<JiraIssue[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchIssues = useCallback(async (query: string) => {
        setLoading(true);
        setError(null);
        try {
            const fetchedIssues = await fetchJiraIssues(settings, query);
            setIssues(fetchedIssues);
        } catch (err) {
            setError('Error fetching Jira issues');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [settings, fetchJiraIssues]);

    useEffect(() => {
        fetchIssues('');
    }, [fetchIssues]);

    const filterByOwnIssues = () => {
        console.log('Filtering by own issues');
        // Implement filter logic
    };

    const applyStatusFilter = (status: string) => {
        console.log(`Filtering by status: ${status}`);
        // Implement status filter logic
    };

    const applyEpicFilter = (epic: string) => {
        console.log(`Filtering by epic: ${epic}`);
        // Implement epic filter logic
    };

    const statusMenu = [
        { title: 'To Do', onClick: () => applyStatusFilter('To Do') },
        { title: 'In Progress', onClick: () => applyStatusFilter('In Progress') },
        { title: 'Done', onClick: () => applyStatusFilter('Done') },
    ];

    const epicMenu = [
        { title: 'Epic 1', onClick: () => applyEpicFilter('Epic 1') },
        { title: 'Epic 2', onClick: () => applyEpicFilter('Epic 2') },
    ];

    return (
        <div className="jira-issue-view">
            <div className="nav-buttons-container">
                <ToolbarIcon icon="user" tooltip="Filter by my own issues" onClick={filterByOwnIssues} />
                <ToolbarIcon icon="list-checks" tooltip="Filter by issue statuses" menu={statusMenu} />
                <ToolbarIcon icon="layout-grid" tooltip="Filter by epic" menu={epicMenu} />
            </div>
            <SearchComponentWrapper
                onSearch={fetchIssues}
                placeholder="Search Jira issues..."
            />
            {loading && <div className="loading">Loading...</div>}
            {error && <div className="error">{error}</div>}
            <ul className="jira-issue-list">
                {issues.map((issue) => (
                    <li key={issue.key} onClick={() => insertJiraIssueLink(issue)} className="jira-issue-item">
                        <span className="jira-issue-key">{issue.key}:</span> {issue.fields.summary} - <span className="jira-issue-status">{issue.fields.status.name}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default JiraIssueView;