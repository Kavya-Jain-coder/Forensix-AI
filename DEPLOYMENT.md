# Deployment

The Vercel app is the React frontend only. Evidence upload requires the FastAPI backend to be deployed at a public HTTPS URL, then that URL must be added to Vercel as `VITE_API_URL`.

## Backend

Deploy the `backend` folder to a Python web host such as Render, Railway, or Fly.io.

Use:

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Set these backend environment variables:

```bash
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_GEMINI_MODEL=gemini-2.5-flash
```

After deployment, verify:

```bash
curl https://your-backend-url.example.com/docs
```

## Frontend

In Vercel, add this environment variable for the frontend project:

```bash
VITE_API_URL=https://your-backend-url.example.com
```

Then redeploy the Vercel frontend. Vite embeds `VITE_API_URL` at build time, so changing the variable requires a new deployment.
