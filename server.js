import express from "express";
import fetch from "node-fetch";
import getRawBody from "raw-body";
import cors from "cors";
import { Readable } from "stream";

const app = express();
const PORT = 8000;

// EC2 API URL
const EC2_BASE_URL = "http://56.228.24.109:8080/api";

app.use(cors());

app.use("/api", async (req, res) => {
  const targetUrl = `${EC2_BASE_URL}${req.url}`;
  console.log(`Proxying: ${req.method} ${targetUrl}`);

  try {
    // Read body if not GET/HEAD
    const body =
      req.method !== "GET" && req.method !== "HEAD"
        ? await getRawBody(req)
        : undefined;

    // Copy headers but force uncompressed response
    const headers = { ...req.headers };
    delete headers.host;
    headers["accept-encoding"] = "identity";

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    // Set status and headers
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    // Stream back response correctly
    if (typeof response.body.pipe === "function") {
      response.body.pipe(res); // Node stream
    } else {
      Readable.fromWeb(response.body).pipe(res); // Web stream
    }
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy error", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy running at http://localhost:${PORT}`);
});
