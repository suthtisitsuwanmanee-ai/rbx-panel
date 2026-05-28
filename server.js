const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();

app.disable("x-powered-by");
app.use(cors());
app.use(express.json());

// =========================
// RENDER PORT FIX
// =========================
const PORT = process.env.PORT || 3000;

// =========================
// DATABASE
// =========================
const db = new sqlite3.Database("./db.sqlite");

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS licenses (
            key TEXT PRIMARY KEY,
            hwid TEXT
        )
    `);
});

// =========================
// WEB PANEL
// =========================
app.get("/", (req, res) => {
    res.send("HWID SERVER RUNNING");
});

// =========================
// CREATE KEY
// =========================
app.post("/create", (req, res) => {
    const key = (req.body.key || "").trim();

    if (!key) return res.json({ status: "no_key" });

    db.get("SELECT key FROM licenses WHERE key=?", [key], (err, row) => {
        if (err) return res.json({ status: "error" });

        if (row) return res.json({ status: "already_exists" });

        db.run(
            "INSERT INTO licenses (key, hwid) VALUES (?, NULL)",
            [key],
            (err2) => {
                if (err2) return res.json({ status: "error" });
                res.json({ status: "created", key });
            }
        );
    });
});

// =========================
// RESET HWID
// =========================
app.post("/reset", (req, res) => {
    const key = (req.body.key || "").trim();

    if (!key) return res.json({ status: "no_key" });

    db.run(
        "UPDATE licenses SET hwid=NULL WHERE key=?",
        [key],
        (err) => {
            if (err) return res.json({ status: "error" });

            res.json({ status: "reset_done" });
        }
    );
});

// =========================
// CHECK KEY
// =========================
app.post("/check", (req, res) => {
    const key = (req.body.key || "").trim();
    const hwid = (req.body.hwid || "").trim();

    if (!key || !hwid) {
        return res.json({ status: "invalid_request" });
    }

    db.get("SELECT * FROM licenses WHERE key=?", [key], (err, row) => {
        if (err) return res.json({ status: "error" });

        if (!row) return res.json({ status: "invalid" });

        if (!row.hwid) {
            db.run("UPDATE licenses SET hwid=? WHERE key=?", [hwid, key]);
            return res.json({ status: "ok" });
        }

        if (row.hwid === hwid) {
            return res.json({ status: "ok" });
        }

        return res.json({ status: "used" });
    });
});

// =========================
// START SERVER (RENDER SAFE)
// =========================
app.listen(PORT, "0.0.0.0", () => {
    console.log("RUNNING ON PORT " + PORT);
});
