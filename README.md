# BK LearnX

BK LearnX learning-platform source code, organized for GitHub collaboration and GitHub Pages deployment.

## Project structure

- `index.html` — GitHub Pages entry point
- `pages/home/` — main landing page
- `pages/auth/` — login and registration pages
- `pages/contact/` — contact page
- `pages/programs/` — course/semester and course-content pages
- `pages/semesters/` — shared semester pages
- `assets/images/` — images and social icons
- `assets/shared/` — shared theme CSS and JavaScript
- `data/` — JSON data used by the project
- `backend/` — Node.js/Express backend files
- `tools/` — maintenance scripts

## Run the frontend locally

Open the project with VS Code Live Server from the root `index.html`.

## Backend

```bash
cd backend
npm install
npm start
```

Do not commit `node_modules`, `.venv`, `.env`, or editor-specific folders.
