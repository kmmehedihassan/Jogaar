"use strict";
/**
 * Starts the Jogaar server: the REST API under /api and, when `npm run build`
 * has been run, the website itself.
 *
 *   PORT       port to listen on (default 4000)
 *   JOGAAR_DB  SQLite file (default server/data/jogaar.db)
 */
const fs = require("fs");
const path = require("path");
const express = require("express");
const { openDb } = require("./db");
const { createApp } = require("./app");

const db = openDb();
const app = createApp(db);

const buildDir = path.join(__dirname, "..", "build");
if (fs.existsSync(path.join(buildDir, "index.html"))) {
  app.use(express.static(buildDir, { index: false, maxAge: "1h" }));
  // Single-page app: let the React router handle every other path.
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(buildDir, "index.html"));
  });
}

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Jogaar server running at http://localhost:${port}`);
});
