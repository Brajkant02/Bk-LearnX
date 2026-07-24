BK LearnX v1.2.1 — Login/Home/Profile + Email OTP Password Reset patch

Changed files:
- pages/auth/login/index.html
- pages/home/index.html
- pages/auth/forgot-password/index.html
- pages/auth/reset-password/index.html
- backend/server.js
- backend/package.json

New file:
- backend/.env.example

Install:
1. Extract this ZIP.
2. Copy its folders into your existing BK LearnX project root.
3. Choose "Replace files in destination".
4. In backend terminal run: npm install
5. Create backend/.env from .env.example and enter EMAIL_USER + EMAIL_APP_PASSWORD.
6. Restart backend: npm start

New behavior:
- Student login redirects to Home.
- Logged-in Home navbar shows "My Profile" instead of "Register / Login".
- Forgot Password sends a 6-digit email code.
- Reset Password page opens only after successful code verification.
