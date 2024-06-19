# GitHub Repository Fetcher API Documentation

The GitHub Repository Fetcher API allows you to fetch and unzip files from a specified GitHub repository. It provides a simple interface to retrieve the contents of a repository branch, with options to include or exclude specific file extensions and directories.

## Fetch and Unzip Files from a GitHub Repository

Format: https://github.actionschema.com/{owner}/{repo}/{branch}

Example: https://github.actionschema.com/CodeFromAnywhere/github-contents-vercel/main

More details: https://github.actionschema.com/openapi.json

Notes

- you can replace `github.com` with `github.actionschema.com` to get the main contents)
- Ensure the `accept` header is set to "application/json" if you prefer the response in JSON format.
