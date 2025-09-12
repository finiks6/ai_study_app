# AI Study Helper Website

The project now includes a Node.js backend with a SQLite database. Upload a PDF, the server will generate a basic summary and store it for later viewing. Previously saved summaries can be browsed and clicking a summary shows its full text and generated output.

Users can also fetch their account details via `GET /me` and manage saved summaries with `DELETE /api/summaries/:id`.

Summaries support follow-up study tools:

- `POST /api/ask` answers questions about a saved summary and shows a short ad before responding.
- `POST /api/flashcards` creates simple flashcards from a summary for quick review after displaying an ad.
- `POST /api/ads/impression` records an ad view for the current user and feature.
- `GET /api/ads/impressions` returns how many ads the user has seen. Optionally,
  pass `?feature=name` to filter counts for a specific feature.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in `.env`:
   ```bash
   PORT=3000
   DB_FILE=data.sqlite
   SESSION_SECRET=supersecret
   # Optional: provide a Hugging Face key for higher quality summaries
   # HF_API_KEY=your_key_here
   ```
3. Start the development server:
   ```bash
   npm start
   ```
4. Visit `http://localhost:${PORT}` in your browser.

## Environment Variables

The following variables are required:

- `PORT` – Port number for the HTTP server.
- `DB_FILE` – Path to the SQLite database file.
- `SESSION_SECRET` – Secret used to sign the session ID cookie.
- `HF_API_KEY` – (optional) Hugging Face Inference API key. If omitted, the server
  falls back to a free Jina AI summarization API and, if external requests fail,
  uses a simple built‑in algorithm to generate summaries.

## Testing

Run the test suite with:
```bash
npm test
```
