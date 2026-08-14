var http = require("http");
var fs = require("fs");
var path = require("path");

var ADMIN_EMAIL = "shivam.dungahu@datafortune.com";

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

var dataDir = process.env.HOME ? path.join(process.env.HOME, "data") : path.join(__dirname, "data");
var uploadDir = path.join(dataDir, "uploads");
var metadataFile = path.join(dataDir, "uploads.json");

try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) {}

function readMetadata() {
  try {
    var raw = fs.readFileSync(metadataFile, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function writeMetadata(entries) {
  fs.writeFileSync(metadataFile, JSON.stringify(entries, null, 2));
}

function getUserEmail(req) {
  return req.headers["x-ms-client-principal-name"] || null;
}

function isAdmin(req) {
  var email = getUserEmail(req);
  return email && email.toLowerCase() === ADMIN_EMAIL;
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
    if (body.length > 20 * 1024 * 1024) {
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

function guessExt(dataUrl) {
  var m = dataUrl.match(/^data:image\/(\w+);base64,/);
  if (m) {
    return "." + m[1].replace("jpeg", "jpg");
  }
  return ".png";
}

var server = http.createServer(function (req, res) {
  var urlPath = (req.url || "/").split("?")[0];

  // List uploads
  if (urlPath === "/api/uploads" && req.method === "GET") {
    sendJson(res, 200, readMetadata());
    return;
  }

  // Upload
  if (urlPath === "/api/upload" && req.method === "POST") {
    if (!isAdmin(req)) {
      sendJson(res, 403, { error: "Not authorized" });
      return;
    }
    readBody(req, function (err, body) {
      if (err) { sendJson(res, 400, { error: "Bad request" }); return; }
      try {
        var payload = JSON.parse(body);
        var id = "upload-" + Date.now();
        var ext = guessExt(payload.image || "");
        var filename = id + ext;
        var imageBuffer = Buffer.from((payload.image || "").replace(/^data:image\/\w+;base64,/, ""), "base64");
        fs.writeFileSync(path.join(uploadDir, filename), imageBuffer);

        var entries = readMetadata();
        var entry = {
          id: id,
          category: payload.category,
          title: payload.title,
          badge: payload.badge,
          severity: payload.severity,
          tags: payload.tags || [],
          image: "/uploads/" + filename,
          description: payload.description,
          flags: payload.flags || [],
          date: new Date().toISOString()
        };
        entries.push(entry);
        writeMetadata(entries);
        sendJson(res, 200, entry);
      } catch (e) {
        sendJson(res, 400, { error: "Invalid payload" });
      }
    });
    return;
  }

  // Delete upload
  if (urlPath.indexOf("/api/uploads/") === 0 && req.method === "DELETE") {
    if (!isAdmin(req)) {
      sendJson(res, 403, { error: "Not authorized" });
      return;
    }
    var id = decodeURIComponent(urlPath.split("/").pop());
    var entries = readMetadata();
    var found = null;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].id === id) { found = entries[i]; break; }
    }
    if (!found) { sendJson(res, 404, { error: "Not found" }); return; }
    try { fs.unlinkSync(path.join(uploadDir, path.basename(found.image))); } catch (e) {}
    entries = entries.filter(function (e) { return e.id !== id; });
    writeMetadata(entries);
    sendJson(res, 200, { ok: true });
    return;
  }

  // Serve uploaded images
  if (urlPath.indexOf("/uploads/") === 0) {
    serveFile(res, path.join(uploadDir, path.basename(urlPath)));
    return;
  }

  // Static files
  if (urlPath === "/" || urlPath === "") {
    urlPath = "/index.html";
  }
  serveFile(res, path.join(__dirname, urlPath));
});

var port = process.env.PORT || 3000;
server.listen(port, function () {
  console.log("Static server running on port " + port);
});
