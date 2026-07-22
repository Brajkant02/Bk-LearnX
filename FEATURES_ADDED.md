# New portal features

- Admin dashboard: `pages/admin/login.html`
- Student profile: `pages/student/profile/index.html`
- Login/session/activity/progress API in `backend/server.js`
- Responsive unit sidebar toggle injected into study-unit HTML files
- Mobile: unit sidebars automatically hidden
- Logged-in home page filters courses by selected branch

## Local run
```bash
cd backend
npm install
npm start
```
Admin default (change with environment variables): `admin@bklearnx.local` / `Admin@123`.

GitHub Pages only hosts the frontend. For real tracking, deploy `backend/` on Render/Railway and set `localStorage.bk_api_base` to that backend URL.
