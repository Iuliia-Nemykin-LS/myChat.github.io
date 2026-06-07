# QA Automation Assistant

AI chatbot powered by **Google Gemini**, with conversation history stored in **SQLite**.

Built with HTML, CSS, Alpine.js (frontend) and Node.js (backend).

## Features

- High-level QA automation guidance (strategy, frameworks, CI/CD, Playwright, Cypress)
- Chat history persisted in SQLite
- Gemini 2.5 Flash with automatic fallback to Flash Lite
- Dark-themed responsive UI

## Quick start

1. **Install dependencies** (from project root):
   ```bash
   npm install @google/genai
   ```

2. **Configure environment**:
   ```bash
   copy .env.example .env
   ```
   Add your Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

3. **Run the server**:
   ```bash
   npm run chatbot
   ```
   Or from this folder on Windows: `run.bat`

4. Open **http://localhost:3000**

## GitHub Pages (live chat)

**Live chat:** **https://iuliia-nemykin-ls.github.io/myChat.github.io/**

Repository: **https://github.com/Iuliia-Nemykin-LS/myChat.github.io**

On GitHub Pages the chat runs in your browser:
- Click **API Key** and paste your [Gemini API key](https://aistudio.google.com/apikey)
- History is saved in **localStorage** (browser only)

For SQLite history + server-side API key, run locally with `npm start`.

### Pages settings

Use **Deploy from a branch** → `main` → folder **`/docs`**

Or enable **GitHub Actions** as the Pages source and re-run the workflow.

## Project structure

```
gemini-chatbot/
├── server.js       # API + Gemini integration
├── db.js           # SQLite storage
├── public/         # Alpine.js UI
├── docs/           # GitHub Pages site
└── .env            # Your API key (not committed)
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/history` | Load chat history |
| POST | `/api/chat` | Send message, get Gemini reply |
| DELETE | `/api/history` | Clear history |

## License

ISC
