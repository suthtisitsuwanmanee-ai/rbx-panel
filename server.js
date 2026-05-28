const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.disable("x-powered-by");
app.use(express.json());

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
// WEB UI
// =========================
app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>HWID PANEL</title>
<style>
body { background:#111; color:#00ffcc; font-family:Arial; text-align:center; }
input, button { padding:10px; margin:5px; }
.box { margin-top:50px; }
</style>
</head>
<body>

<h1>HWID SYSTEM</h1>

<div class="box">

<h2>สร้างคีย์</h2>

<input id="keyInput" placeholder="ใส่คีย์"/>
<br>
<button onclick="createKey()">Create Key</button>

<p id="out"></p>

<hr>

<h2>Reset HWID</h2>
<input id="rkey" placeholder="ใส่คีย์"/>
<br>
<button onclick="resetKey()">Reset</button>

<p id="out2"></p>

</div>

<script>

async function createKey(){
    const key = document.getElementById("keyInput").value;

    const r = await fetch("/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key })
    });

    const d = await r.json();

    document.getElementById("out").innerText =
        d.status + (d.key ? " : " + d.key : "");
}

async function resetKey(){
    const key = document.getElementById("rkey").value;

    const r = await fetch("/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key })
    });

    const d = await r.json();
    document.getElementById("out2").innerText = d.status;
}

</script>

</body>
</html>
    `);
});

// =========================
// CREATE KEY (safe)
// =========================
app.post("/create", (req, res) => {
    const key = req.body.key;

    if (!key) return res.json({ status: "no_key" });

    db.get("SELECT key FROM licenses WHERE key=?", [key], (err, row) => {
        if (err) return res.json({ status: "error" });

        if (row) {
            return res.json({ status: "already_exists" });
        }

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
// RESET HWID (safe)
// =========================
app.post("/reset", (req, res) => {
    const key = req.body.key;

    if (!key) return res.json({ status: "no_key" });

    db.get("SELECT key FROM licenses WHERE key=?", [key], (err, row) => {
        if (err) return res.json({ status: "error" });

        if (!row) return res.json({ status: "not_found" });

        db.run(
            "UPDATE licenses SET hwid=NULL WHERE key=?",
            [key],
            (err2) => {
                if (err2) return res.json({ status: "error" });

                res.json({ status: "reset_done" });
            }
        );
    });
});

// =========================
// CHECK KEY
// =========================
app.post("/check", (req, res) => {
    const { key, hwid } = req.body;

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
// START
// =========================
app.listen(PORT, () => {
    console.log("RUNNING http://localhost:" + PORT);
});