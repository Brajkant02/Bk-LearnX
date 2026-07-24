# BK LearnX v1.2

Integrated update:
- Common API configuration (`assets/shared/config.js`)
- Student login and registration use the same backend URL
- Admin login and dashboard use the same backend URL
- Forgot Password and Reset Password pages
- Working 15-minute reset token APIs
- Admin access linked from Student Login
- Local and deployed environment support

## Local run
1. `cd backend`
2. `npm install`
3. `npm start`
4. Open frontend with VS Code Live Server.

## Production
Set Render environment variable `FRONTEND_URL` to your exact Vercel URL.
Change the deployed API URL in `assets/shared/config.js` only when required.
