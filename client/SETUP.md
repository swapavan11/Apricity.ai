# QuizHive Frontend Setup (Vite + React)

## Environment Configuration

This application uses **Vite** with a built-in proxy for local development.

### Setup Steps

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Configure the `.env` file:**
   
   - **For Local Development (Recommended):**
     ```
     VITE_API_BASE_URL=
     ```
     Leave it **empty** to use the Vite proxy (configured in `vite.config.js`). The proxy automatically forwards `/api` requests to `http://localhost:5000`.
   
   - **For Production:**
     ```
     VITE_API_BASE_URL=https://your-backend-domain.com
     ```
     Replace `https://your-backend-domain.com` with your actual deployed backend URL.

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The app will run on `http://localhost:5173` (Vite default port).

## Environment Variables

| Variable | Description | Default | Production Example |
|----------|-------------|---------|-------------------|
| `VITE_API_BASE_URL` | Backend API URL | Empty (uses proxy) | `https://api.yourdomain.com` |

## How It Works

### Local Development
- Vite proxy forwards all `/api/*` requests to `http://localhost:5000`
- No CORS issues since the proxy handles cross-origin requests
- Keep `VITE_API_BASE_URL` empty in your `.env` file

### Production Deployment
- Set `VITE_API_BASE_URL` to your deployed backend URL
- Example: `VITE_API_BASE_URL=https://api.quizhive.com`
- The app will make direct API calls to the backend

## Important Notes

- ⚠️ The `.env` file is gitignored for security reasons
- ✅ Always use `.env.example` as a template
- 🔒 Never commit your `.env` file to version control
- 🔄 **Must restart the dev server** after changing environment variables
- 📝 Vite uses `VITE_` prefix for env variables (not `REACT_APP_`)
- 🔍 Access env variables using `import.meta.env.VITE_*` (not `process.env`)

## Vite Proxy Configuration

The proxy is configured in `vite.config.js`:
```javascript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true
    }
  }
}
```

## Deployment

### Vercel / Netlify / Other Platforms

1. **Set environment variable:**
   - Variable name: `VITE_API_BASE_URL`
   - Value: `https://your-backend-url.com`

2. **Build command:**
   ```bash
   npm run build
   ```

3. **Output directory:** `dist`

4. **Important:** Ensure CORS is properly configured on the backend to accept requests from your frontend domain
