require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "3mb" }));

/* =========================================================
   MYSQL CONNECTION
========================================================= */

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "bklearnx",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/* =========================================================
   DATABASE SETUP
========================================================= */

async function setupDatabase() {

  const connection = await db.getConnection();

  try {

    await connection.query(`
            CREATE TABLE IF NOT EXISTS activity (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                page VARCHAR(1000),
                action VARCHAR(100),
                subject VARCHAR(200),
                unit VARCHAR(200),
                chapter VARCHAR(300),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX(user_id),
                INDEX(created_at)
            )
        `);

    await connection.query(`
            CREATE TABLE IF NOT EXISTS progress (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                type VARCHAR(50) DEFAULT 'learning',
                page VARCHAR(1000),
                title VARCHAR(300),
                subject_id VARCHAR(120),
                unit_id VARCHAR(200),
                chapter_id VARCHAR(300),
                max_scroll_percent DECIMAL(5,2) DEFAULT 0,
                sections_viewed INT DEFAULT 0,
                total_sections INT DEFAULT 0,
                current_section_id VARCHAR(200),
                last_position DECIMAL(12,4) DEFAULT 0,
                quiz_available BOOLEAN DEFAULT FALSE,
                quiz_started BOOLEAN DEFAULT FALSE,
                quiz_completed BOOLEAN DEFAULT FALSE,
                quiz_score DECIMAL(5,2) DEFAULT NULL,
                attempts INT DEFAULT 0,
                manual_confirmed BOOLEAN DEFAULT FALSE,
                active_time_seconds INT DEFAULT 0,
                last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                started_at DATETIME DEFAULT NULL,
                status VARCHAR(30) DEFAULT 'IN_PROGRESS',
                completed_at DATETIME DEFAULT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_page (user_id, page(255)),
                INDEX(user_id),
                INDEX(subject_id)
            )
        `);

    await connection.query(`
            CREATE TABLE IF NOT EXISTS subjects (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                branch VARCHAR(100) NOT NULL,
                semester VARCHAR(50) NOT NULL,
                subject_code VARCHAR(50) NOT NULL,
                subject_name VARCHAR(200) NOT NULL,
                description TEXT,
                content_url VARCHAR(1000),
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_branch_semester_subject
                    (branch, semester, subject_code),
                INDEX idx_subject_branch_semester
                    (branch, semester, is_active)
            )
        `);

    await connection.query(`
            CREATE TABLE IF NOT EXISTS student_custom_subjects (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                subject_name VARCHAR(100)
                    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_student_custom_subject
                    (student_id, subject_name),
                INDEX idx_custom_subject_student (student_id)
            )
        `);

    const [profileImageColumns] = await connection.query(
      `SELECT DATA_TYPE, IS_NULLABLE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'profile_image'`
    );

    if (
      profileImageColumns.length &&
      !["text", "mediumtext", "longtext"].includes(
        String(profileImageColumns[0].DATA_TYPE).toLowerCase()
      )
    ) {
      const nullable =
        profileImageColumns[0].IS_NULLABLE === "YES"
          ? "NULL"
          : "NOT NULL";

      await connection.query(
        `ALTER TABLE users MODIFY COLUMN profile_image MEDIUMTEXT ${nullable}`
      );
    }

    console.log("Database tables checked successfully.");

    const officialSubjects = [
      [
        "PGDCA",
        "1st Semester",
        "BCIT",
        "BCIT",
        "Basic Computer and Information Technology",
        "/pages/programs/pgdca/content/semester-1/bcit-hindi/unit-1/index.html"
      ],
      [
        "PGDCA",
        "1st Semester",
        "PYTHON",
        "Python",
        "Python programming fundamentals and topics",
        "/pages/programs/pgdca/content/semester-1/python-hindi/unit-1/index.html"
      ],
      [
        "PGDCA",
        "1st Semester",
        "DCC",
        "DCC",
        "Data Communication and Computer Networks",
        "/pages/programs/pgdca/content/semester-1/dccn-hindi/unit-1/index.html"
      ],
      [
        "PGDCA",
        "1st Semester",
        "IWT",
        "I&WT",
        "Internet and Web Technology",
        "/pages/programs/pgdca/content/semester-1/i-wt-hindi/unit-1/index.html"
      ],
      [
        "PGDCA",
        "1st Semester",
        "OAT",
        "OAT",
        "Office Automation Tools",
        "/pages/programs/pgdca/content/semester-1/oat/unit-1/index.html"
      ],
      [
        "PGDCA",
        "2nd Semester",
        "DBMS",
        "DBMS",
        null,
        "/pages/programs/pgdca/content/semester-2/DBMS/unit-1/index.html"
      ],
      [
        "PGDCA",
        "2nd Semester",
        "WDT",
        "WDT",
        null,
        "/pages/programs/pgdca/content/semester-2/WDT/Unit-1/index.html"
      ],
      [
        "DSML",
        "1st Semester",
        "FDSML",
        "Fundamentals of Data Science and Machine Learning",
        null,
        "/pages/programs/dsml/content/semester-1/fdsml/unit-1/index.html"
      ],
      [
        "DSML",
        "1st Semester",
        "PYTHON",
        "Python",
        null,
        "/pages/programs/pgdca/content/semester-1/python-hindi/unit-1/index.html"
      ],
      [
        "DSML",
        "1st Semester",
        "EMDSML",
        "Essential Mathematics for Data Science and Machine Learning",
        null,
        "/pages/programs/dsml/content/semester-1/EMDSL/unit-1/index.html"
      ],
      [
        "DSML",
        "1st Semester",
        "DSTT",
        "Data Science - Tools & Techniques",
        null,
        "/pages/programs/dsml/content/semester-1/DSTT/Basic_Collaboration_Tools.html"
      ],
      [
        "Cyber Security",
        "1st Semester",
        "FCS",
        "Fundamentals of Cyber Security",
        null,
        "/pages/programs/cyber-security/content/semester-1/Fundamental of Cyber Security/unit-1/unit-1.html"
      ],
      [
        "Cyber Security",
        "1st Semester",
        "NCS",
        "Networking Concepts & Security",
        null,
        null
      ],
      [
        "Cyber Security",
        "1st Semester",
        "OSSF",
        "Operating System Security & Forensics",
        null,
        null
      ],
      [
        "Cyber Security",
        "1st Semester",
        "FWAS",
        "Fundamentals of Web Application Security",
        null,
        null
      ]
    ];

    await connection.query(
      `INSERT IGNORE INTO subjects
        (branch, semester, subject_code, subject_name, description, content_url)
       VALUES ?`,
      [officialSubjects]
    );

  } finally {
    connection.release();
  }
}

/* =========================================================
   SESSIONS
========================================================= */

const sessions = new Map();
const adminSessions = new Map();
const oauthStates = new Map();

const SESSION_TTL = 30 * 24 * 60 * 60 * 1000;

function token() {
  return crypto.randomBytes(32).toString("hex");
}

/* =========================================================
   RATE LIMITER
========================================================= */

function rateLimit({ windowMs, max, keyPrefix }) {

  const hits = new Map();

  setInterval(() => {

    const now = Date.now();

    for (const [key, value] of hits) {

      if (now - value.start > windowMs) {
        hits.delete(key);
      }

    }

  }, windowMs).unref();

  return (req, res, next) => {

    const key =
      `${keyPrefix}:${req.ip || req.connection?.remoteAddress || "unknown"}`;

    const now = Date.now();

    const entry =
      hits.get(key) || {
        count: 0,
        start: now
      };

    if (now - entry.start > windowMs) {

      entry.count = 0;
      entry.start = now;

    }

    entry.count++;

    hits.set(key, entry);

    if (entry.count > max) {

      return res.status(429).json({
        message: "Too many attempts. Please wait and try again."
      });

    }

    next();

  };

}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  keyPrefix: "login"
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  keyPrefix: "register"
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyPrefix: "forgot"
});

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyPrefix: "admin-login"
});

/* =========================================================
   HELPERS
========================================================= */

const ah = fn =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

function safe(user) {

  if (!user) return null;

  const {
    password,
    passwordHash,
    passwordResetOtpHash,
    passwordResetOtpExpiresAt,
    passwordResetOtpAttempts,
    resetToken,
    resetExpiresAt,
    ...safeUser
  } = user;

  return safeUser;
}

function otpHash(value) {

  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");

}

function infer(page = "") {

  const pathname = String(page).split(/[?#]/, 1)[0];
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map(segment => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });

  const contentIndex = segments.findIndex(
    segment => segment.toLowerCase() === "content"
  );

  if (contentIndex >= 0) {
    const semesterIndex = segments.findIndex(
      (segment, index) =>
        index > contentIndex && /^semester[-_ ]?\d+$/i.test(segment)
    );
    const subjectFolder =
      semesterIndex >= 0
        ? segments[semesterIndex + 1]
        : "";

    if (subjectFolder) {
      const subjectKey = subjectFolder
        .replace(/-hindi$/i, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const aliases = {
        dccn: "DCC",
        dcc: "DCC",
        iwt: "IWT",
        wit: "IWT",
        fundamentalofcybersecurity: "FCS",
        networkingconceptssecurity: "NCS",
        operatingsystemsecurityforensics: "OSSF",
        fundamentalsofwebapplicationsecurity: "FWAS"
      };

      return aliases[subjectKey] || subjectKey.toUpperCase();
    }
  }

  return "Course";

}

/* =========================================================
   AUTH MIDDLEWARE
========================================================= */

async function auth(req, res, next) {

  const header = req.headers.authorization || "";

  const sessionToken =
    header.startsWith("Bearer ")
      ? header.substring(7)
      : "";

  const session = sessions.get(sessionToken);

  if (!session) {

    return res.status(401).json({
      message: "Please login again."
    });

  }

  if (Date.now() - session.loginAt > SESSION_TTL) {

    sessions.delete(sessionToken);

    return res.status(401).json({
      message: "Session expired. Please login again."
    });

  }

  session.lastSeen = Date.now();

  req.userId = session.userId;
  req.sessionToken = sessionToken;

  next();

}

function admin(req, res, next) {

  const adminToken = req.header("x-admin-token");

  if (!adminToken || !adminSessions.has(adminToken)) {

    return res.status(401).json({
      message: "Unauthorized"
    });

  }

  next();

}

/* =========================================================
   HEALTH
========================================================= */

app.get("/api/health", async (req, res) => {

  try {

    await db.query("SELECT 1");

    res.json({
      status: "ok",
      database: "connected"
    });

  } catch (error) {

    res.status(500).json({
      status: "error",
      database: "disconnected"
    });

  }

});

/* =========================================================
   REGISTER
========================================================= */

app.post(
  "/api/register",
  registerLimiter,
  ah(async (req, res) => {

    const {
      name,
      email,
      branch,
      semester,
      password,
      confirmPassword,
      phone,
      college
    } = req.body;

    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanBranch = String(branch || "").trim();
    const cleanSemester = String(semester || "").trim();
    const cleanPhone = String(phone || "").trim();
    const cleanCollege = String(college || "").trim();

    if (
      !cleanName ||
      !cleanEmail ||
      !cleanBranch ||
      !cleanSemester ||
      typeof password !== "string" ||
      !password
    ) {

      return res.status(400).json({
        message: "All fields required."
      });

    }

    if (password !== confirmPassword) {

      return res.status(400).json({
        message: "Passwords do not match."
      });

    }

    if (
      cleanName.length > 100 ||
      cleanEmail.length > 150 ||
      cleanPhone.length > 30 ||
      cleanCollege.length > 150
    ) {

      return res.status(400).json({
        message: "One or more fields exceed the allowed length."
      });

    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {

      return res.status(400).json({
        message: "Please enter a valid email address."
      });

    }

    const branches = [
      "PGDCA",
      "DSML",
      "Cyber Security",
      "Web Designing",
      "PGDA",
      "IOT",
      "CHN",
      "Drone Technology"
    ];
    const selectedSemester = semesterNumber(cleanSemester);
    const maxSemester = cleanBranch === "PGDCA" ? 4 : 2;

    if (
      !branches.includes(cleanBranch) ||
      selectedSemester < 1 ||
      selectedSemester > maxSemester
    ) {

      return res.status(400).json({
        message: "Please select a valid branch and semester."
      });

    }

    if (password.length < 8) {

      return res.status(400).json({
        message: "Password kam se kam 8 characters ka hona chahiye."
      });

    }

    const [existing] =
      await db.query(
        "SELECT id FROM users WHERE email = ? LIMIT 1",
        [cleanEmail]
      );

    if (existing.length > 0) {

      return res.status(409).json({
        message: "Email already registered."
      });

    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    await db.query(
      `
            INSERT INTO users
            (
                name,
                email,
                password,
                phone,
                college,
                branch,
                semester,
                role,
                status,
                provider
            )
              VALUES (?, ?, ?, ?, ?, ?, ?, 'student', 'active', 'password')
            `,
      [
        cleanName,
        cleanEmail,
        hashedPassword,
        cleanPhone || null,
        cleanCollege || null,
        cleanBranch,
        cleanSemester
      ]
    );

    res.status(201).json({
      message: "Registration successful."
    });

  })
);

/* =========================================================
   LOGIN
========================================================= */

app.post(
  "/api/login",
  loginLimiter,
  ah(async (req, res) => {

    const email =
      String(req.body.email || "")
        .trim()
        .toLowerCase();

    const password =
      String(req.body.password || "");

    if (!email || !password) {

      return res.status(400).json({
        message: "Email and password are required."
      });

    }

    const [rows] =
      await db.query(
        "SELECT * FROM users WHERE email = ? LIMIT 1",
        [email]
      );

    if (rows.length === 0) {

      return res.status(401).json({
        message: "Invalid email or password."
      });

    }

    const user = rows[0];

    if (String(user.status || "").toLowerCase() === "blocked") {

      return res.status(403).json({
        message: "Your account has been blocked by admin."
      });

    }

    const validPassword =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!validPassword) {

      return res.status(401).json({
        message: "Invalid email or password."
      });

    }

    await db.query(
      `
            UPDATE users
            SET lastLoginAt = NOW()
            WHERE id = ?
            `,
      [user.id]
    );

    const sessionToken = token();

    sessions.set(sessionToken, {
      userId: user.id,
      loginAt: Date.now(),
      lastSeen: Date.now(),
      currentPage: ""
    });

    res.json({
      token: sessionToken,
      user: safe({
        ...user,
        lastLoginAt: new Date()
      })
    });

  })
);

/* =========================================================
   LOGOUT
========================================================= */

app.post(
  "/api/logout",
  auth,
  ah(async (req, res) => {

    await db.query(
      `
            UPDATE users
            SET lastLogoutAt = NOW()
            WHERE id = ?
            `,
      [req.userId]
    );

    sessions.delete(req.sessionToken);

    res.json({
      message: "Logged out"
    });

  })
);

/* =========================================================
   CURRENT USER
========================================================= */

app.get(
  "/api/me",
  auth,
  ah(async (req, res) => {

    const [rows] =
      await db.query(
        "SELECT * FROM users WHERE id = ? LIMIT 1",
        [req.userId]
      );

    if (rows.length === 0) {

      return res.status(404).json({
        message: "Student profile not found."
      });

    }

    res.json({
      user: safe(rows[0])
    });

  })
);

/* =========================================================
   UPDATE PROFILE
========================================================= */

app.put(
  "/api/me",
  auth,
  ah(async (req, res) => {

    const allowedFields = {
      name: "name",
      phone: "phone",
      college: "college",
      photo: "profile_image"
    };

    const updates = [];
    const values = [];

    for (const [field, column] of Object.entries(allowedFields)) {

      if (req.body[field] !== undefined) {

        const value = String(req.body[field] || "").trim();

        if (field === "photo" && value.length > 2_700_000) {
          return res.status(413).json({
            message: "Profile image is too large."
          });
        }

        updates.push(`${column} = ?`);
        values.push(value || null);

      }

    }

    if (updates.length === 0) {

      return res.status(400).json({
        message: "Nothing to update."
      });

    }

    values.push(req.userId);

    await db.query(
      `
            UPDATE users
            SET ${updates.join(", ")}
            WHERE id = ?
            `,
      values
    );

    const [rows] =
      await db.query(
        "SELECT * FROM users WHERE id = ?",
        [req.userId]
      );

    res.json({
      user: safe(rows[0])
    });

  })
);

/* =========================================================
   STUDENT SUBJECTS
========================================================= */

function semesterNumber(value) {

  const text = String(value || "").toLowerCase();
  const match =
    text.match(/(?:semester\s*[-:]?\s*)([1-6])/) ||
    text.match(/([1-6])(?:st|nd|rd|th)?\s*semester/);

  return match ? Number(match[1]) : 0;

}

app.get(
  "/api/student/subjects",
  auth,
  ah(async (req, res) => {

    const [users] = await db.query(
      "SELECT branch, semester FROM users WHERE id = ? LIMIT 1",
      [req.userId]
    );

    if (!users.length) {
      return res.status(404).json({ message: "Student profile not found." });
    }

    const [branchSubjects] = await db.query(
      `SELECT id, branch, semester, subject_code AS subjectCode,
              subject_name AS subjectName, description,
              content_url AS contentUrl
       FROM subjects
       WHERE branch = ? AND is_active = TRUE
       ORDER BY id`,
      [users[0].branch]
    );

    const targetSemester = semesterNumber(users[0].semester);
    const officialSubjects = branchSubjects.filter(subject =>
      semesterNumber(subject.semester) === targetSemester
    );

    const [customSubjects] = await db.query(
      `SELECT id, subject_name AS subjectName, created_at AS createdAt
       FROM student_custom_subjects
       WHERE student_id = ?
       ORDER BY created_at, id`,
      [req.userId]
    );

    res.json({ officialSubjects, customSubjects });

  })
);

app.post(
  "/api/student/subjects",
  auth,
  ah(async (req, res) => {

    const subjectName = String(
      req.body.subjectName || req.body.subject_name || ""
    ).trim();

    if (!subjectName || subjectName.length > 100) {
      return res.status(400).json({
        message: "Subject name must be between 1 and 100 characters."
      });
    }

    try {
      const [result] = await db.query(
        `INSERT INTO student_custom_subjects (student_id, subject_name)
         VALUES (?, ?)`,
        [req.userId, subjectName]
      );

      const [rows] = await db.query(
        `SELECT id, subject_name AS subjectName, created_at AS createdAt
         FROM student_custom_subjects
         WHERE id = ? AND student_id = ?`,
        [result.insertId, req.userId]
      );

      return res.status(201).json({ subject: rows[0] });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          message: "You have already added this subject."
        });
      }

      throw error;
    }

  })
);

app.delete(
  "/api/student/subjects/:id",
  auth,
  ah(async (req, res) => {

    const subjectId = Number(req.params.id);

    if (!Number.isSafeInteger(subjectId) || subjectId < 1) {
      return res.status(400).json({ message: "Invalid subject id." });
    }

    const [result] = await db.query(
      `DELETE FROM student_custom_subjects
       WHERE id = ? AND student_id = ?`,
      [subjectId, req.userId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Custom subject not found."
      });
    }

    res.json({ message: "Custom subject deleted." });

  })
);

/* =========================================================
   ACTIVITY
========================================================= */

app.post(
  "/api/activity",
  auth,
  ah(async (req, res) => {

    const page =
      String(req.body.page || "");

    const action =
      String(req.body.action || req.body.type || "visit");

    await db.query(
      `
            INSERT INTO activity
            (
                user_id,
                page,
                action,
                subject,
                unit,
                chapter
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
      [
        req.userId,
        page,
        action,
        req.body.subject || "",
        req.body.unit || "",
        req.body.chapter || ""
      ]
    );

    const session =
      sessions.get(req.sessionToken);

    if (session) {

      session.lastSeen = Date.now();
      session.currentPage = page;

    }

    res.json({
      ok: true
    });

  })
);

/* =========================================================
   BASIC PROGRESS
========================================================= */

app.get(
  "/api/progress",
  auth,
  ah(async (req, res) => {

    const [rows] =
      await db.query(
        `
                SELECT *
                FROM progress
                WHERE user_id = ?
                ORDER BY updated_at DESC
                `,
        [req.userId]
      );

    res.json({
      progress: rows
    });

  })
);

app.post(
  "/api/progress",
  auth,
  ah(async (req, res) => {

    const page =
      String(req.body.page || "");

    if (!page) {

      return res.status(400).json({
        message: "Page is required."
      });

    }

    const [existing] =
      await db.query(
        `
                SELECT id
                FROM progress
                WHERE user_id = ?
                AND page = ?
                LIMIT 1
                `,
        [req.userId, page]
      );

    if (existing.length === 0) {

      await db.query(
        `
                INSERT INTO progress
                (
                    user_id,
                    type,
                    page,
                    title,
                    subject_id,
                    status
                )
                VALUES (?, 'basic', ?, ?, ?, ?)
                `,
        [
          req.userId,
          page,
          req.body.title || "",
          req.body.subject || infer(page),
          req.body.completed
            ? "COMPLETED"
            : "IN_PROGRESS"
        ]
      );

    } else {

      await db.query(
        `
                UPDATE progress
                SET
                    title = ?,
                    subject_id = ?,
                    status = ?,
                    updated_at = NOW()
                WHERE id = ?
                `,
        [
          req.body.title || "",
          req.body.subject || infer(page),
          req.body.completed
            ? "COMPLETED"
            : "IN_PROGRESS",
          existing[0].id
        ]
      );

    }

    res.json({
      ok: true
    });

  })
);

/* =========================================================
   LEARNING CONFIG
========================================================= */

const LEARNING_CONFIG = Object.freeze({

  inactivityTimeoutSeconds:
    Number(process.env.LEARNING_INACTIVITY_TIMEOUT || 45),

  heartbeatIntervalSeconds:
    Number(process.env.LEARNING_HEARTBEAT_INTERVAL || 30),

  minimumActiveTimeSeconds:
    Number(process.env.LEARNING_MIN_ACTIVE_SECONDS || 300),

  minimumReadProgress:
    Number(process.env.LEARNING_MIN_READ_PROGRESS || 90),

  minimumSectionsViewed:
    Number(process.env.LEARNING_MIN_SECTIONS_VIEWED || 90),

  requireQuizIfAvailable:
    String(
      process.env.LEARNING_REQUIRE_QUIZ || "true"
    ) !== "false"

});

function meetsCompletionCriteria(record) {

  const readOk =
    Number(record.maxScrollPercent || 0) >=
    LEARNING_CONFIG.minimumReadProgress;

  const sectionPercent =
    record.totalSections
      ? Number(record.sectionsViewed || 0) /
      Number(record.totalSections) *
      100
      : 0;

  const sectionsOk =
    sectionPercent >=
    LEARNING_CONFIG.minimumSectionsViewed;

  const timeOk =
    Number(record.activeTimeSeconds || 0) >=
    LEARNING_CONFIG.minimumActiveTimeSeconds;

  const quizOk =
    !record.quizAvailable ||
    !LEARNING_CONFIG.requireQuizIfAvailable ||
    !!record.quizCompleted;

  return (
    readOk &&
    timeOk &&
    sectionsOk &&
    quizOk
  );

}

function learningStatus(record) {

  if (
    record.status === "COMPLETED" ||
    record.manualConfirmed
  ) {
    return "COMPLETED";
  }

  return record.startedAt
    ? "IN_PROGRESS"
    : "NOT_STARTED";

}

/* =========================================================
   LEARNING CONFIG API
========================================================= */

app.get(
  "/api/learning/config",
  auth,
  (req, res) => {

    res.json({
      config: LEARNING_CONFIG
    });

  }
);

/* =========================================================
   LEARNING PROGRESS
========================================================= */

app.get(
  "/api/learning/progress",
  auth,
  ah(async (req, res) => {

    const [rows] =
      await db.query(
        `
                SELECT *
                FROM progress
                WHERE user_id = ?
                AND type = 'learning'
                ORDER BY updated_at DESC
                `,
        [req.userId]
      );

    res.json({
      progress: rows,
      config: LEARNING_CONFIG
    });

  })
);

app.post(
  "/api/learning/progress",
  auth,
  ah(async (req, res) => {

    if (!req.body.page) {

      return res.status(400).json({
        message: "Chapter page is required."
      });

    }

    const page =
      String(req.body.page);

    const [existing] =
      await db.query(
        `
                SELECT *
                FROM progress
                WHERE user_id = ?
                AND type = 'learning'
                AND page = ?
                LIMIT 1
                `,
        [req.userId, page]
      );

    const previous =
      existing.length
        ? existing[0]
        : {};

    const maxScrollPercent =
      Math.max(
        Number(previous.max_scroll_percent || 0),
        Math.min(
          100,
          Math.max(
            0,
            Number(req.body.maxScrollPercent || 0)
          )
        )
      );

    const sectionsViewed =
      Math.max(
        Number(previous.sections_viewed || 0),
        Number(req.body.sectionsViewed || 0)
      );

    const totalSections =
      Math.max(
        Number(previous.total_sections || 0),
        Number(req.body.totalSections || 0)
      );

    const activeTimeSeconds =
      Math.min(
        31536000,
        Math.max(
          0,
          Number(
            req.body.activeTimeSeconds ??
            previous.active_time_seconds ??
            0
          )
        )
      );

    const lastPosition =
      Math.max(
        0,
        Number(
          req.body.lastPosition ??
          previous.last_position ??
          0
        )
      );

    const quizAvailable =
      Boolean(
        req.body.quizAvailable ??
        previous.quiz_available
      );

    const quizCompleted =
      Boolean(
        req.body.quizCompleted ||
        previous.quiz_completed
      );

    const manualConfirmed =
      Boolean(
        req.body.manualConfirmed ||
        previous.manual_confirmed
      );

    const recordForCheck = {

      maxScrollPercent,
      sectionsViewed,
      totalSections,
      activeTimeSeconds,
      quizAvailable,
      quizCompleted,
      manualConfirmed,
      startedAt:
        previous.started_at ||
        new Date().toISOString()

    };

    const completed =
      meetsCompletionCriteria(recordForCheck) ||
      manualConfirmed;

    const status =
      completed
        ? "COMPLETED"
        : "IN_PROGRESS";

    if (existing.length === 0) {

      await db.query(
        `
                INSERT INTO progress
                (
                    user_id,
                    type,
                    page,
                    title,
                    subject_id,
                    unit_id,
                    chapter_id,
                    max_scroll_percent,
                    sections_viewed,
                    total_sections,
                    current_section_id,
                    last_position,
                    quiz_available,
                    quiz_started,
                    quiz_completed,
                    quiz_score,
                    attempts,
                    manual_confirmed,
                    active_time_seconds,
                    last_active_at,
                    started_at,
                    status,
                    completed_at
                )
                VALUES
                (
                    ?, 'learning', ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, NOW(), NOW(), ?, ?
                )
                `,
        [
          req.userId,
          page,
          req.body.title || "",
          req.body.subjectId || infer(page),
          req.body.unitId || "",
          req.body.chapterId || page,

          maxScrollPercent,
          sectionsViewed,
          totalSections,
          req.body.currentSectionId || "",
          lastPosition,

          quizAvailable,
          Boolean(req.body.quizStarted),
          quizCompleted,
          req.body.quizScore ?? null,
          Number(req.body.attempts || 0),

          manualConfirmed,
          activeTimeSeconds,

          status,
          completed ? new Date() : null
        ]
      );

    } else {

      await db.query(
        `
                UPDATE progress
                SET
                    title = ?,
                    subject_id = ?,
                    unit_id = ?,
                    chapter_id = ?,
                    max_scroll_percent = ?,
                    sections_viewed = ?,
                    total_sections = ?,
                    current_section_id = ?,
                    last_position = ?,
                    quiz_available = ?,
                    quiz_started = ?,
                    quiz_completed = ?,
                    quiz_score = ?,
                    attempts = ?,
                    manual_confirmed = ?,
                    active_time_seconds = ?,
                    last_active_at = NOW(),
                    status = ?,
                    completed_at = ?,
                    updated_at = NOW()
                WHERE id = ?
                `,
        [
          req.body.title || previous.title || "",
          req.body.subjectId ||
          previous.subject_id ||
          infer(page),

          req.body.unitId ||
          previous.unit_id ||
          "",

          req.body.chapterId ||
          previous.chapter_id ||
          page,

          maxScrollPercent,
          sectionsViewed,
          totalSections,

          req.body.currentSectionId ||
          previous.current_section_id ||
          "",

          lastPosition,

          quizAvailable,

          Boolean(
            req.body.quizStarted ||
            previous.quiz_started
          ),

          quizCompleted,

          req.body.quizScore ??
          previous.quiz_score ??
          null,

          Math.max(
            Number(previous.attempts || 0),
            Number(req.body.attempts || 0)
          ),

          manualConfirmed,
          activeTimeSeconds,

          status,
          completed ? new Date() : null,

          previous.id
        ]
      );

    }

    const session =
      sessions.get(req.sessionToken);

    if (session) {

      session.lastSeen = Date.now();
      session.currentPage = page;

    }

    const [rows] =
      await db.query(
        `
                SELECT *
                FROM progress
                WHERE user_id = ?
                AND type = 'learning'
                AND page = ?
                LIMIT 1
                `,
        [req.userId, page]
      );

    res.json({

      progress: {
        ...rows[0],
        status
      },

      config: LEARNING_CONFIG

    });

  })
);

/* =========================================================
   LEARNING HEARTBEAT
========================================================= */

app.post(
  "/api/learning/heartbeat",
  auth,
  ah(async (req, res) => {

    const session =
      sessions.get(req.sessionToken);

    if (session) {

      session.lastSeen = Date.now();

      session.currentPage =
        String(
          req.body.page ||
          session.currentPage ||
          ""
        );

    }

    res.json({
      ok: true,
      lastActiveAt:
        new Date().toISOString()
    });

  })
);

/* =========================================================
   FORGOT PASSWORD - MAIL
========================================================= */

function mailTransport() {

  return nodemailer.createTransport({

    service: "gmail",

    auth: {

      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD

    }

  });

}

/* =========================================================
   FORGOT PASSWORD
========================================================= */

app.post(
  "/api/forgot-password",
  forgotPasswordLimiter,
  ah(async (req, res) => {

    const email =
      String(req.body.email || "")
        .trim()
        .toLowerCase();

    if (!email) {

      return res.status(400).json({
        message: "Email is required."
      });

    }

    if (
      !process.env.EMAIL_USER ||
      !process.env.EMAIL_APP_PASSWORD
    ) {

      return res.status(500).json({
        message:
          "Email service configure nahi hai."
      });

    }

    const [rows] =
      await db.query(
        "SELECT * FROM users WHERE email = ? LIMIT 1",
        [email]
      );

    if (rows.length === 0) {

      return res.status(404).json({
        message:
          "Ye email BK LearnX par registered nahi hai."
      });

    }

    const user = rows[0];

    const code =
      String(
        crypto.randomInt(100000, 1000000)
      );

    await db.query(
      `
            UPDATE users
            SET
                passwordResetOtpHash = ?,
                passwordResetOtpExpiresAt =
                    DATE_ADD(NOW(), INTERVAL 10 MINUTE),
                passwordResetOtpAttempts = 0,
                resetToken = NULL,
                resetExpiresAt = NULL
            WHERE id = ?
            `,
      [
        otpHash(code),
        user.id
      ]
    );

    try {

      await mailTransport().sendMail({

        from:
          `BK LearnX <${process.env.EMAIL_USER}>`,

        to: user.email,

        subject:
          "BK LearnX password reset code",

        text:
          `Your BK LearnX password reset code is ${code}. It expires in 10 minutes.`

      });

      res.json({

        message:
          "6-digit verification code aapke email par bhej diya gaya hai.",

        email: user.email

      });

    } catch (error) {

      await db.query(
        `
                UPDATE users
                SET
                    passwordResetOtpHash = NULL,
                    passwordResetOtpExpiresAt = NULL,
                    passwordResetOtpAttempts = 0
                WHERE id = ?
                `,
        [user.id]
      );

      console.error(
        "Password reset email error:",
        error.message
      );

      res.status(500).json({

        message:
          "Verification code email par nahi bheja ja saka."

      });

    }

  })
);

/* =========================================================
   VERIFY OTP
========================================================= */

app.post(
  "/api/verify-reset-code",
  forgotPasswordLimiter,
  ah(async (req, res) => {

    const email =
      String(req.body.email || "")
        .trim()
        .toLowerCase();

    const code =
      String(req.body.code || "")
        .trim();

    if (
      !email ||
      !/^\d{6}$/.test(code)
    ) {

      return res.status(400).json({
        message:
          "Valid email aur 6-digit code enter karein."
      });

    }

    const [rows] =
      await db.query(
        "SELECT * FROM users WHERE email = ? LIMIT 1",
        [email]
      );

    if (
      rows.length === 0 ||
      !rows[0].passwordResetOtpHash
    ) {

      return res.status(400).json({
        message:
          "Pehle naya verification code request karein."
      });

    }

    const user = rows[0];

    if (
      !user.passwordResetOtpExpiresAt ||
      Date.now() >
      new Date(
        user.passwordResetOtpExpiresAt
      ).getTime()
    ) {

      return res.status(400).json({
        message:
          "Verification code expire ho gaya."
      });

    }

    const attempts =
      Number(
        user.passwordResetOtpAttempts || 0
      ) + 1;

    if (attempts > 5) {

      await db.query(
        `
                UPDATE users
                SET
                    passwordResetOtpHash = NULL,
                    passwordResetOtpExpiresAt = NULL,
                    passwordResetOtpAttempts = 0
                WHERE id = ?
                `,
        [user.id]
      );

      return res.status(429).json({
        message:
          "Bahut zyada galat attempts. Naya code request karein."
      });

    }

    if (
      otpHash(code) !==
      user.passwordResetOtpHash
    ) {

      await db.query(
        `
                UPDATE users
                SET passwordResetOtpAttempts = ?
                WHERE id = ?
                `,
        [attempts, user.id]
      );

      return res.status(400).json({
        message:
          "Verification code galat hai."
      });

    }

    const resetToken =
      token();

    await db.query(
      `
            UPDATE users
            SET
                resetToken = ?,
                resetExpiresAt =
                    DATE_ADD(NOW(), INTERVAL 15 MINUTE),
                passwordResetOtpHash = NULL,
                passwordResetOtpExpiresAt = NULL,
                passwordResetOtpAttempts = 0
            WHERE id = ?
            `,
      [
        resetToken,
        user.id
      ]
    );

    res.json({

      message:
        "Email verified. Ab naya password set karein.",

      resetToken

    });

  })
);

/* =========================================================
   RESET PASSWORD
========================================================= */

app.post(
  "/api/reset-password",
  ah(async (req, res) => {

    const {
      token: resetToken,
      password
    } = req.body;

    if (!resetToken || !password) {

      return res.status(400).json({
        message:
          "Verification required."
      });

    }

    if (password.length < 8) {

      return res.status(400).json({
        message:
          "Password kam se kam 8 characters ka hona chahiye."
      });

    }

    const [rows] =
      await db.query(
        `
                SELECT *
                FROM users
                WHERE resetToken = ?
                LIMIT 1
                `,
        [resetToken]
      );

    if (rows.length === 0) {

      return res.status(400).json({
        message:
          "Invalid reset session."
      });

    }

    const user = rows[0];

    if (
      !user.resetExpiresAt ||
      Date.now() >
      new Date(
        user.resetExpiresAt
      ).getTime()
    ) {

      return res.status(400).json({
        message:
          "Reset session expire ho gaya."
      });

    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    await db.query(
      `
            UPDATE users
            SET
                password = ?,
                resetToken = NULL,
                resetExpiresAt = NULL
            WHERE id = ?
            `,
      [
        hashedPassword,
        user.id
      ]
    );

    for (
      const [sessionToken, session]
      of sessions
    ) {

      if (
        session.userId === user.id
      ) {

        sessions.delete(sessionToken);

      }

    }

    res.json({

      message:
        "Password successfully update ho gaya."

    });

  })
);

/* =========================================================
   ADMIN LOGIN
========================================================= */

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL;

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD;

app.post(
  "/api/admin/login",
  adminLoginLimiter,
  ah(async (req, res) => {

    if (
      !ADMIN_EMAIL ||
      !ADMIN_PASSWORD
    ) {

      return res.status(503).json({
        message:
          "Admin login is not configured."
      });

    }

    if (
      String(req.body.email || "")
        .toLowerCase() !==
      ADMIN_EMAIL.toLowerCase() ||
      req.body.password !==
      ADMIN_PASSWORD
    ) {

      return res.status(401).json({
        message:
          "Invalid admin credentials."
      });

    }

    const adminToken =
      token();

    adminSessions.set(
      adminToken,
      {
        at: Date.now()
      }
    );

    res.json({
      token: adminToken
    });

  })
);

/* =========================================================
   ADMIN LOGOUT
========================================================= */

app.post(
  "/api/admin/logout",
  admin,
  (req, res) => {

    adminSessions.delete(
      req.header("x-admin-token")
    );

    res.json({
      message:
        "Admin logged out."
    });

  }
);

/* =========================================================
   ADMIN DASHBOARD
========================================================= */

app.get(
  "/api/admin/dashboard",
  admin,
  ah(async (req, res) => {

    const [users] =
      await db.query(
        `
                SELECT
                    id,
                    name,
                    email,
                    branch,
                    semester,
                    role,
                    status,
                    profile_image,
                    phone,
                    college,
                    provider,
                    registeredAt,
                    lastLoginAt,
                    lastLogoutAt
                FROM users
                WHERE role = 'student'
                ORDER BY id DESC
                `
      );

    const [activity] =
      await db.query(
        `
                SELECT *
                FROM activity
                ORDER BY created_at DESC
                LIMIT 100
                `
      );

    const [progress] =
      await db.query(
        `
                SELECT *
                FROM progress
                ORDER BY updated_at DESC
                `
      );

    const now =
      Date.now();

    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    const students =
      users.map(user => {

        const session =
          [...sessions.values()]
            .find(
              s =>
                s.userId ===
                user.id
            );

        const userProgress =
          progress.filter(
            p =>
              p.user_id ===
              user.id &&
              p.type ===
              "learning"
          );

        const latest =
          userProgress[0];

        const age =
          session
            ? Math.floor(
              (
                now -
                session.lastSeen
              ) / 1000
            )
            : Infinity;

        const presence =
          age < 60
            ? "ONLINE"
            : age < 120
              ? "AWAY"
              : "OFFLINE";

        return {

          ...user,

          online:
            presence ===
            "ONLINE",

          presence,

          currentPage:
            latest?.page ||
            session?.currentPage ||
            "",

          currentSubject:
            latest?.subject_id ||
            "",

          currentUnit:
            latest?.unit_id ||
            "",

          currentChapter:
            latest?.chapter_id ||
            "",

          currentSection:
            latest?.current_section_id ||
            "",

          readingProgress:
            Number(
              latest?.max_scroll_percent ||
              0
            ),

          activeTimeSeconds:
            Number(
              latest?.active_time_seconds ||
              0
            )

        };

      });

    const totalStudents =
      users.filter(
        u =>
          u.role !== "admin"
      ).length;

    const onlineStudents =
      students.filter(
        s =>
          s.role !== "admin" &&
          s.presence === "ONLINE"
      ).length;

    const loginsToday =
      users.filter(
        u =>
          u.role !== "admin" &&
          u.lastLoginAt &&
          String(
            u.lastLoginAt
          ).startsWith(today)
      ).length;

    res.json({

      stats: {

        totalStudents,

        onlineStudents,

        loginsToday

      },

      students,

      recentActivity:
        activity.map(a => {

          const user =
            users.find(
              u =>
                u.id ===
                a.user_id
            );

          return {

            ...a,

            studentName:
              user?.name ||
              "Unknown"

          };

        })

    });

  })
);

/* =========================================================
   ADMIN BLOCK USER
========================================================= */

app.put(
  "/api/admin/students/:id/block",
  admin,
  ah(async (req, res) => {

    const id =
      Number(req.params.id);

    const [students] = await db.query(
      "SELECT id FROM users WHERE id = ? AND role = 'student' LIMIT 1",
      [id]
    );

    if (!students.length) {
      return res.status(404).json({ message: "Student not found." });
    }

    await db.query(
      `
            UPDATE users
            SET status = 'blocked'
            WHERE id = ? AND role = 'student'
            `,
      [id]
    );

    for (
      const [sessionToken, session]
      of sessions
    ) {

      if (
        session.userId === id
      ) {

        sessions.delete(
          sessionToken
        );

      }

    }

    res.json({
      message:
        "Student blocked successfully."
    });

  })
);

/* =========================================================
   ADMIN UNBLOCK USER
========================================================= */

app.put(
  "/api/admin/students/:id/unblock",
  admin,
  ah(async (req, res) => {

    const id =
      Number(req.params.id);

    const [students] = await db.query(
      "SELECT id FROM users WHERE id = ? AND role = 'student' LIMIT 1",
      [id]
    );

    if (!students.length) {
      return res.status(404).json({ message: "Student not found." });
    }

    await db.query(
      `
            UPDATE users
            SET status = 'active'
            WHERE id = ? AND role = 'student'
            `,
      [id]
    );

    res.json({
      message:
        "Student unblocked successfully."
    });

  })
);

/* =========================================================
   ADMIN DELETE USER
========================================================= */

app.delete(
  "/api/admin/students/:id",
  admin,
  ah(async (req, res) => {

    const id =
      Number(req.params.id);

    const [students] = await db.query(
      "SELECT id FROM users WHERE id = ? AND role = 'student' LIMIT 1",
      [id]
    );

    if (!students.length) {
      return res.status(404).json({ message: "Student not found." });
    }

    await db.query(
      "DELETE FROM student_custom_subjects WHERE student_id = ?",
      [id]
    );

    await db.query(
      "DELETE FROM progress WHERE user_id = ?",
      [id]
    );

    await db.query(
      "DELETE FROM activity WHERE user_id = ?",
      [id]
    );

    const [result] =
      await db.query(
        `
                DELETE FROM users
                WHERE id = ? AND role = 'student'
                `,
        [id]
      );

    for (
      const [sessionToken, session]
      of sessions
    ) {

      if (
        session.userId === id
      ) {

        sessions.delete(
          sessionToken
        );

      }

    }

    if (result.affectedRows === 0) {

      return res.status(404).json({
        message:
          "Student not found."
      });

    }

    res.json({
      message:
        "Student deleted successfully."
    });

  })
);

/* =========================================================
   TOP VISITED PAGES
========================================================= */

app.get(
  "/api/admin/top-pages",
  admin,
  ah(async (req, res) => {

    const [rows] =
      await db.query(
        `
                SELECT
                    page,
                    COUNT(*) AS visits
                FROM activity
                WHERE page IS NOT NULL
                AND page <> ''
                AND action IN ('page_view', 'visit')
                GROUP BY page
                ORDER BY visits DESC
                LIMIT 20
                `
      );

    res.json({
      pages: rows
    });

  })
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (err, req, res, next) => {

    console.error(
      "Unhandled route error:",
      err
    );

    if (res.headersSent) {
      return next(err);
    }

    res.status(
      err.status ||
      err.statusCode ||
      500
    ).json({

      message:
        err.status >= 500 ||
          err.statusCode >= 500
          ? "Something went wrong on server."
          : (
            err.message ||
            "Request failed."
          )

    });

  }
);

/* =========================================================
   SERVER START
========================================================= */

async function startServer() {

  try {

    await db.query("SELECT 1");

    console.log(
      "MySQL connected successfully."
    );

    await setupDatabase();

    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `BK LearnX backend running at http://localhost:${PORT}`
        );

      }
    );

  } catch (error) {

    console.error(
      "Server startup failed:"
    );

    console.error(
      error.message
    );

    process.exit(1);

  }

}

startServer();