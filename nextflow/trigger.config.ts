import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID ?? "nextflow",
  maxDuration: 300,
  dirs: ["./src/trigger"],
});
