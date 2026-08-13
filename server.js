var http = require("http");
var fs = require("fs");
var path = require("path");

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

var server = http.createServer(function (req, res) {
  var urlPath = req.url.split("?")[0];
  if (urlPath === "/" || urlPath === "") {
    urlPath = "/index.html";
  }
  var filePath = path.join(__dirname, urlPath);
  var ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
    res.end(data);
  });
});

var port = process.env.PORT || 3000;
server.listen(port, function () {
  console.log("Static server running on port " + port);
});
