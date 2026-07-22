# Structured BK LearnX

## Main folders

- `pages/home` — landing page
- `pages/auth` — login and registration
- `pages/contact` — contact page
- `pages/programs/<program>/semester` — semester selection
- `pages/programs/<program>/content` — learning content
- `assets/images` — image files
- `assets/shared` — shared theme CSS/JS
- `backend` — Node.js server and package files
- `tools` — maintenance scripts

`.venv`, `node_modules`, and `.vscode` were excluded. Recreate dependencies with `npm install` inside `backend`.

Some lesson HTML files contain demonstration links such as `photo.jpg`, `chapter.html`, or `myvideo.mp4` whose source files were already absent in the uploaded project. These are listed in `LINK_CHECK_REPORT.txt`; they are not caused by the restructuring.
