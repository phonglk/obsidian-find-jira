import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FindJiraIssueSettings, JiraIssue } from './main';
import ToolbarIcon from './ToolbarIcon';
import SearchComponentWrapper from './SearchComponentWrapper';
import { fetchJiraStatuses, JiraStatus } from './jiraApi';
import { UserIcon, ListBulletIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { ArrowPathIcon } from '@heroicons/react/24/solid'; // Add this import for the spinner icon

interface JiraIssueViewProps {
    settings: FindJiraIssueSettings;
    fetchJiraIssues: (settings: FindJiraIssueSettings, jql: string, signal?: AbortSignal) => Promise<JiraIssue[]>;
    insertJiraIssueLink: (issue: JiraIssue) => void;
    fetchJiraStatuses: (settings: FindJiraIssueSettings) => Promise<JiraStatus[]>;
}

export const JiraIssueView: React.FC<JiraIssueViewProps> = ({ 
    settings, 
    fetchJiraIssues, 
    insertJiraIssueLink,
    fetchJiraStatuses
}: JiraIssueViewProps) => {
    const [issues, setIssues] = useState<JiraIssue[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
    const [isOwnIssuesFilter, setIsOwnIssuesFilter] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchIssues = useCallback(async (query: string) => {
        setLoading(true);
        setError(null);

        // Cancel the previous request if it exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create a new AbortController
        abortControllerRef.current = new AbortController();

        try {
            let jql = `project = "${settings.project}"`;
            if (isOwnIssuesFilter) {
                jql += ` AND assignee = currentUser()`;
            }
            if (statusFilters.size > 0) {
                jql += ` AND status IN (${Array.from(statusFilters).map(s => `"${s}"`).join(', ')})`;
            }
            if (query) {
                const projectPrefix = settings.project.toUpperCase();
                jql += ` AND (summary ~ "${query}*" OR key = "${projectPrefix}-${query.toUpperCase()}")`;
            }
            jql += ` ORDER BY updated DESC`;

            const fetchedIssues = await fetchJiraIssues(settings, jql, abortControllerRef.current.signal);
            setIssues(fetchedIssues);
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Fetch aborted');
                // Don't set error for aborted requests
            } else {
                setError('Error fetching Jira issues');
                console.error(err);
            }
        } finally {
            // Only set loading to false if this is the most recent request
            if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
                setLoading(false);
            }
        }
    }, [settings, fetchJiraIssues, isOwnIssuesFilter, statusFilters]);

    const debouncedFetchIssues = useCallback((query: string) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        setLoading(true); // Set loading to true when starting a new debounced fetch

        debounceTimerRef.current = setTimeout(() => {
            fetchIssues(query);
        }, 300); // 300ms debounce time
    }, [fetchIssues]);

    useEffect(() => {
        debouncedFetchIssues('');
        return () => {
            // Cancel any ongoing request when the component unmounts
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [debouncedFetchIssues]);

    const filterByOwnIssues = () => {
        setIsOwnIssuesFilter(prev => !prev);
        debouncedFetchIssues('');
    };

    const applyStatusFilter = useCallback((status: string, checked: boolean) => {
        setStatusFilters(prev => {
            const newFilters = new Set(prev);
            if (checked) {
                newFilters.add(status);
            } else {
                newFilters.delete(status);
            }
            return newFilters;
        });
        setStatusMenu(prevMenu => 
            prevMenu.map(item => 
                item.title === status ? { ...item, checked } : item
            )
        );
        debouncedFetchIssues('');
    }, [debouncedFetchIssues]);

    const [statusMenu, setStatusMenu] = useState<{ title: string; onClick: (checked: boolean) => void; checked: boolean }[]>([]);

    useEffect(() => {
        const fetchStatuses = async () => {
            try {
                const statuses = await fetchJiraStatuses(settings);
                const menuItems = statuses.map(status => ({
                    title: status.name,
                    onClick: (checked: boolean) => applyStatusFilter(status.name, checked),
                    checked: statusFilters.has(status.name)
                }));
                setStatusMenu(menuItems);
            } catch (error) {
                console.error('Error fetching Jira statuses:', error);
                setError('Error fetching Jira statuses');
            }
        };

        fetchStatuses();
    }, [settings, applyStatusFilter, statusFilters]);

    return (
        <div className="jira-issue-view flex flex-col h-full p-2">
            <div className="toolbar flex items-center justify-between mb-2">
                <div className="flex space-x-1">
                    <ToolbarIcon 
                        icon={<UserIcon className="w-4 h-4" />}
                        tooltip="Filter by my own issues" 
                        onClick={filterByOwnIssues}
                        isSelected={isOwnIssuesFilter}
                    />
                    <ToolbarIcon 
                        icon={<ListBulletIcon className="w-4 h-4" />}
                        tooltip="Filter by issue statuses" 
                        menu={statusMenu}
                    />
                </div>
                {loading && (
                    <div className="animate-spin">
                        <ArrowPathIcon className="w-4 h-4 text-gray-500" />
                    </div>
                )}
            </div>
            <div className="search-wrapper mb-2">
                <SearchComponentWrapper
                    onSearch={debouncedFetchIssues}
                    placeholder="Search Jira issues..."
                />
            </div>
            {error && <div className="jira-error text-sm mb-2">{error}</div>}
            <div className="jira-issue-list-container flex-grow overflow-y-auto">
                <ul className="jira-issue-list">
                    {issues.map((issue) => (
                        <li 
                            key={issue.key} 
                            onClick={() => insertJiraIssueLink(issue)} 
                            className="jira-issue-item p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                        >
                            <div className="jira-issue-header flex justify-between text-sm">
                                <span className="jira-issue-key font-medium">{issue.key}</span>
                                <span className="jira-issue-status text-xs bg-gray-200 px-1 rounded">{issue.fields.status.name}</span>
                            </div>
                            <div className="jira-issue-summary text-sm mt-1">{issue.fields.summary}</div>
                            <div className="jira-issue-details flex justify-between text-xs mt-1 text-gray-500">
                                <div className="jira-issue-epic">
                                    {issue.fields.parent ? issue.fields.parent.fields.summary : 'No Epic'}
                                </div>
                                <div className="jira-issue-assignee flex items-center">
                                    {issue.fields.assignee ? (
                                        <>
                                            <img 
                                                src={issue.fields.assignee.avatarUrls['16x16']} 
                                                alt={issue.fields.assignee.displayName}
                                                className="w-4 h-4 rounded-full mr-1"
                                            />
                                            <span>{issue.fields.assignee.displayName}</span>
                                        </>
                                    ) : (
                                        'Unassigned'
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default JiraIssueView;