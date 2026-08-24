# BuyMesho Gemini Configuration

## Source of truth

Gemini is accessed only from the server-side `server/lib/gemini.ts` service. The browser must never receive `GEMINI_API_KEY`.

## Default model

`GEMINI_MODEL` defaults to `gemini-3.6-flash`.

Google currently lists Gemini 3.7 Flash, 3.6 Flash, 3.5 Flash, 3.5 Flash-Lite, and 3.1 Flash-Lite as stable Gemini 3 API models. BuyMesho keeps a small explicit allowlist of stable model IDs rather than accepting moving aliases.

## Configuration

- `GEMINI_API_KEY`: server-only Gemini API key.
- `GEMINI_MODEL`: primary model ID.
- `GEMINI_FALLBACK_MODELS`: optional comma-separated ordered fallback model IDs.

Example:

```env
GEMINI_MODEL=gemini-3.6-flash
GEMINI_FALLBACK_MODELS=gemini-3.5-flash-lite,gemini-3.1-flash-lite
```

A production deployment should set fallback models only after confirming that the Gemini project/key used by BuyMesho can access those model IDs.
