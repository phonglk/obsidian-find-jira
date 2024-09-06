import { requestUrl } from 'obsidian';
import { FindJiraIssueSettings, JiraIssue } from './types';

export async function fetchJiraIssues(settings: FindJiraIssueSettings, query: string): Promise<JiraIssue[]> {
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