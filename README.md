# Obsidian Jira Issue Search Plugin

This plugin allows you to search for Jira issues within Obsidian (https://obsidian.md) and easily add them to your documents.

## Features

- Search for Jira issues using basic filters
- Click to insert issue details into your current document
- [Any additional features specific to your implementation]

## Installation

1. Clone this repo to your `.obsidian/plugins/` folder.
2. Run `npm i` to install dependencies.
3. Run `npm run dev` to compile the plugin.
4. Enable the plugin in Obsidian settings.

## Usage

1. Open the command palette and search for "Jira Issue Search".
2. Enter your search query with basic filters (e.g., project, status).
3. Click on an issue from the results to insert it into your document.

## Configuration

1. Go to Settings > Community Plugins > Find Jira Issue > Settings.
2. Enter your Jira instance URL (e.g., https://your-company.atlassian.net).
3. Provide your Jira API token:
   - Go to https://id.atlassian.com/manage-profile/security/api-tokens
   - Create a new API token
   - Copy the token and paste it in the plugin settings
4. Enter your Jira email address associated with the API token.
5. Set default project(s) for quicker searching.
6. (Optional) Customize the issue insert format:
   - Use placeholders like {key}, {summary}, {status}, {assignee}
   - Default: "[{key}] {summary} ({status})"
7. Save the settings.

Note: Your Jira credentials are stored locally and are never sent to any third-party servers.

## Development

- Main component: `src/SearchComponentWrapper.tsx`
- Run `npm run dev` to watch for changes and recompile.
- Reload Obsidian to see updates.

## Contributing

[Add guidelines for contributing to your plugin]

## License

[Specify the license for your plugin]
