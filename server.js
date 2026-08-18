var http = require("http");
var fs = require("fs");
var path = require("path");
var DatabaseSync = null;
try {
  DatabaseSync = require("node:sqlite").DatabaseSync;
} catch (e) {
  DatabaseSync = null;
}

var ADMIN_EMAIL = "shivam.dungahu@datafortune.com";
var TENANT_DOMAIN = "@datafortune.com";

var contentTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

// These files are served without authentication (login page + its styling only).
var PUBLIC_PATHS = ["/login", "/login.html", "/style.css", "/theme.js", "/close.html"];

var dataDir = process.env.HOME ? path.join(process.env.HOME, "data") : path.join(__dirname, "data");
try { fs.mkdirSync(dataDir, { recursive: true }); } catch (e) {}

var db = null;
var stmts = {};

if (DatabaseSync) {
  db = new DatabaseSync(path.join(dataDir, "phishaware.db"));
  db.exec("CREATE TABLE IF NOT EXISTS uploads (id TEXT PRIMARY KEY, category TEXT, title TEXT, badge TEXT, severity TEXT, tags TEXT, image BLOB, image_type TEXT, description TEXT, flags TEXT, date TEXT)");
  stmts.list = db.prepare("SELECT id, category, title, badge, severity, tags, description, flags, date, image_type FROM uploads ORDER BY date DESC");
  stmts.insert = db.prepare("INSERT INTO uploads (id, category, title, badge, severity, tags, image, image_type, description, flags, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  stmts.getImage = db.prepare("SELECT image, image_type FROM uploads WHERE id = ?");
  stmts.getMeta = db.prepare("SELECT id, category, title, badge, severity, tags, description, flags, date, image_type FROM uploads WHERE id = ?");
  stmts.del = db.prepare("DELETE FROM uploads WHERE id = ?");
}

function getUserEmail(req) {
  return req.headers["x-ms-client-principal-name"] || null;
}

function isAdmin(req) {
  var email = getUserEmail(req);
  return !!email && email.toLowerCase() === ADMIN_EMAIL;
}

function isTenantUser(email) {
  return !!email && email.toLowerCase().indexOf(TENANT_DOMAIN) !== -1;
}

function sendJson(res, statusCode, obj) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

function serveFile(res, filePath) {
  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }
    var ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
    res.end(data);
  });
}

function readBody(req, callback) {
  var body = "";
  req.on("data", function (chunk) {
    body += chunk;
    if (body.length > 30 * 1024 * 1024) {
      req.destroy();
      callback(new Error("Payload too large"));
    }
  });
  req.on("end", function () {
    callback(null, body);
  });
  req.on("error", function (err) {
    callback(err);
  });
}

function safeParse(str, fallback) {
  try { return JSON.parse(str); } catch (e) { return fallback; }
}

function guessImageType(dataUrl) {
  var m = (dataUrl || "").match(/^data:(image\/[a-z0-9.+-]+);base64,/);
  return m ? m[1] : "image/png";
}

function rowToEntry(row) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    badge: row.badge,
    severity: row.severity,
    tags: safeParse(row.tags, []),
    image: "/uploads/" + encodeURIComponent(row.id),
    description: row.description,
    flags: safeParse(row.flags, []),
    date: row.date
  };
}

var server = http.createServer(function (req, res) {
  var urlPath = (req.url || "/").split("?")[0];
  var email = getUserEmail(req);
  var isAuth = !!email;
  var isTenant = isTenantUser(email);

  // Public paths (login page and its styling) — always served.
  if (PUBLIC_PATHS.indexOf(urlPath) !== -1) {
    if (urlPath === "/login") {
      urlPath = "/login.html";
    }
    serveFile(res, path.join(__dirname, urlPath));
    return;
  }

  // API endpoints — require authenticated tenant user.
  if (urlPath.indexOf("/api/") === 0 || urlPath.indexOf("/uploads/") === 0) {
    if (!isTenant) {
      sendJson(res, isAuth ? 403 : 401, { error: isAuth ? "Access denied" : "Unauthorized" });
      return;
    }

    if (urlPath === "/api/uploads" && req.method === "GET") {
      if (!db) { sendJson(res, 200, []); return; }
      sendJson(res, 200, stmts.list.all().map(rowToEntry));
      return;
    }

    if (urlPath === "/api/upload" && req.method === "POST") {
      if (!isAdmin(req)) { sendJson(res, 403, { error: "Not authorized" }); return; }
      if (!db) { sendJson(res, 500, { error: "Storage unavailable" }); return; }
      readBody(req, function (err, body) {
        if (err) { sendJson(res, 400, { error: "Bad request" }); return; }
        try {
          var payload = JSON.parse(body);
          var id = "upload-" + Date.now();
          var imageType = guessImageType(payload.image);
          var imageBuffer = Buffer.from((payload.image || "").replace(/^data:image\/[a-z0-9.+-]+;base64,/, ""), "base64");
          stmts.insert.run(
            id,
            payload.category || "",
            payload.title || "",
            payload.badge || "",
            payload.severity || "medium",
            JSON.stringify(payload.tags || []),
            imageBuffer,
            imageType,
            payload.description || "",
            JSON.stringify(payload.flags || []),
            new Date().toISOString()
          );
          sendJson(res, 200, rowToEntry(stmts.getMeta.get(id)));
        } catch (e) {
          sendJson(res, 400, { error: "Invalid payload" });
        }
      });
      return;
    }

    if (urlPath.indexOf("/api/uploads/") === 0 && req.method === "DELETE") {
      if (!isAdmin(req)) { sendJson(res, 403, { error: "Not authorized" }); return; }
      if (!db) { sendJson(res, 500, { error: "Storage unavailable" }); return; }
      var id = decodeURIComponent(urlPath.split("/").pop());
      if (!stmts.getMeta.get(id)) { sendJson(res, 404, { error: "Not found" }); return; }
      stmts.del.run(id);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (urlPath.indexOf("/uploads/") === 0) {
      if (!db) { res.writeHead(404); res.end("Not Found"); return; }
      var imgId = decodeURIComponent(urlPath.split("/").pop());
      var row = stmts.getImage.get(imgId);
      if (!row) { res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Not Found"); return; }
      res.writeHead(200, { "Content-Type": row.image_type || "image/png", "Cache-Control": "public, max-age=31536000, immutable" });
      res.end(Buffer.from(row.image));
      return;
    }

    sendJson(res, 404, { error: "Not found" });
    return;
  }

  // Static pages — require authenticated tenant user.
  if (!isTenant) {
    var redirect = isAuth ? "/login?denied=1" : "/login";
    res.writeHead(302, { "Location": redirect });
    res.end();
    return;
  }

  if (urlPath === "/" || urlPath === "") {
    urlPath = "/index.html";
  }
  serveFile(res, path.join(__dirname, urlPath));
});

var port = process.env.PORT || 3000;
server.listen(port, function () {
  console.log("Static server running on port " + port + (db ? " (SQLite ready)" : " (SQLite unavailable)"));
});
