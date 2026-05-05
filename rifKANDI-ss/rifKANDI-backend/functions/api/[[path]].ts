// functions/api/[[path]].ts
// Using require for CommonJS modules to avoid TypeScript issues
const app = require("../../src/app");
const serverless = require("serverless-http");
const db = require("../../src/config/database");

let handler: any = null;

export async function onRequest(context: any) {
  // In production, inject the D1 binding into our database adapter
  if (process.env.NODE_ENV === "production") {
    if (db.setD1) {
      db.setD1(context.env.DB);
    }
  }
  if (!handler) {
    handler = serverless(app);
  }
  return handler(context.request, context);
}