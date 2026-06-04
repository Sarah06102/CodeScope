# CodeScope

CodeScope is a codebase knowledge graph tool that scans a repository, maps function relationships, and lets users ask questions like what calls a function or what a function depends on.

## Features

- Parse JavaScript, JSX, TypeScript, and TSX files across a repo
- Extract imports, functions, call relationships, and line numbers
- Build a combined graph of function dependencies
- Query the graph with prompts like `what calls parseFile`
- View graph results in a lightweight frontend dashboard
- Display function callers, callees, file paths, and locations

## Tech Stack

### Frontend

- React
- TypeScript
- CSS

### Backend

- Node.js
- Express
- Babel Parser
- Babel Traverse

### Build & Tooling

- Vite
- ESLint
