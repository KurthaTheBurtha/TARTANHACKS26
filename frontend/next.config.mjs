import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load single root .env so backend URL and API keys are available
dotenv.config({ path: path.join(__dirname, "..", ".env") });

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
