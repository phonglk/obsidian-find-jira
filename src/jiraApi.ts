import { requestUrl, RequestUrlParam } from 'obsidian';
import { FindJiraIssueSettings, JiraIssue } from './main';

// Updated JiraStatus interface
export interface JiraStatus {
    id: string;
    name: string;
    statusCategory: {
        id: number;
        key: string;
        colorName: string;
        name: string;
    };
}

export async function fetchJiraIssues(settings: FindJiraIssueSettings, jql: string, signal?: AbortSignal): Promise<JiraIssue[]> {
    const authToken = btoa(`${settings.username}:${settings.apiToken}`);
    
    try {
        const requestParams: RequestUrlParam = {
            url: `${settings.jiraUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=20`,
            method: 'GET',
            headers: {
                'Authorization': `Basic ${authToken}`,
                'Content-Type': 'application/json'
            }
        };

        let aborted = false;
        if (signal) {
            signal.addEventListener('abort', () => {
                aborted = true;
            });
        }

        const response = await Promise.race([
            requestUrl(requestParams),
            new Promise<never>((_, reject) => {
                if (signal) {
                    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
                }
            })
        ]);

        if (aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        return response.json.issues;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Fetch aborted');
            return [];
        }
        console.error('Error fetching Jira issues:', error);
        console.error('JQL query:', jql);
        throw error;
    }
}

interface StatusCache {
    statuses: JiraStatus[];
    timestamp: number;
}

let statusCache: StatusCache | null = null;
const CACHE_EXPIRATION_TIME = 1000 * 60 * 60; // 1 hour in milliseconds

export async function fetchJiraStatuses(settings: FindJiraIssueSettings): Promise<JiraStatus[]> {
    const currentTime = Date.now();

    // Check if cache is valid
    if (statusCache && (currentTime - statusCache.timestamp) < CACHE_EXPIRATION_TIME) {
        return statusCache.statuses;
    }

    const url = `${settings.jiraUrl}/rest/api/3/project/${settings.project}/statuses`;
    const response = await requestUrl({
        url: url,
        method: 'GET',
        headers: {
            'Authorization': `Basic ${btoa(`${settings.username}:${settings.apiToken}`)}`,
            'Content-Type': 'application/json',
        },
    });

    if (response.status !== 200) {
        throw new Error(`Failed to fetch Jira statuses: ${response.status}`);
    }

    const projectStatuses = response.json[0]?.statuses || [];

    if (!projectStatuses.length) {
        throw new Error('No statuses found for the project');
    }

    // Update cache
    statusCache = {
        statuses: projectStatuses,
        timestamp: currentTime
    };

    return projectStatuses;
}