export interface FindJiraIssueSettings {
    jiraUrl: string;
    username: string;
    apiToken: string;
    project: string;
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