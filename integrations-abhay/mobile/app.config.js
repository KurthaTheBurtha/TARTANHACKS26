/**
 * Expo app config — loads repo root .env via dotenv so EXPO_PUBLIC_* are available.
 * Only EXPO_PUBLIC_* (client-safe) are passed to extra; never log or expose secrets.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const appJson = require("./app.json");

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
      functionsBaseUrl: process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_BASE_URL ?? "",
    },
  },
};
