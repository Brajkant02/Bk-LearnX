// npm install express better-sqlite3
const express = require("express");
const Database = require("better-sqlite3");

const app = express();
app.use(express.json());
app.use(express.static(".")); // rating-popup.js serve karne ke liye

const db = new Database("ratings.db");
db.exec(`CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,      -- UNIQUE = ek email se sirf ek rating
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

const norm = (e) =>
  String(e || "")
    .trim()
    .toLowerCase();

// Is email ne rating di hai ya nahi
app.get("/api/rating/status", (req, res) => {
  const row = db
    .prepare("SELECT 1 FROM ratings WHERE email = ?")
    .get(norm(req.query.email));
  res.json({ rated: !!row });
});

// Rating save karo
app.post("/api/rating", (req, res) => {
  const email = norm(req.body.email);
  const rating = Number(req.body.rating);
  if (!/^\S+@\S+\.\S+$/.test(email) || !(rating >= 1 && rating <= 5))
    return res.status(400).json({ error: "invalid" });
  try {
    db.prepare(
      "INSERT INTO ratings (email, rating, comment) VALUES (?, ?, ?)",
    ).run(email, rating, String(req.body.comment || "").slice(0, 500));
    res.json({ ok: true });
  } catch (e) {
    if (String(e.message).includes("UNIQUE"))
      return res.status(409).json({ error: "already rated" });
    res.status(500).json({ error: "server" });
  }
});

app.listen(3000, () => console.log("http://localhost:3000"));
