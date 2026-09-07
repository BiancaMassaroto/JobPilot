// Server-only Gemini client — a plain Google AI Studio key (GEMINI_API_KEY),
// not Vertex AI. Feature 07 (AI Profile Extraction) only; every other AI
// feature in this project still uses GPT-4o (see architecture.md's Feature
// 07 decision, item 1). No client/server split like InsForge — Gemini has
// no browser-side usage here.
import { GoogleGenAI } from "@google/genai";

export const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
