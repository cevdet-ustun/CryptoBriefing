# Crypto Briefing Proxy Server

This proxy server bypasses Binance API location restrictions by running in a US region.

## Deployment Options

### Option 1: Vercel (Recommended)
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Install Vercel CLI: `npm install -g vercel`
3. In the `proxy-server` directory, run:
   ```bash
   vercel --prod
   ```
4. Set environment variables in Vercel dashboard:
   - `BINANCE_API_KEY`: Your Binance API key
   - `BINANCE_API_SECRET`: Your Binance API secret
5. Update the URL in `app/(tabs)/index.tsx` with your Vercel deployment URL

### Option 2: Railway
1. Go to [railway.app](https://railway.app) and create account
2. Create new project and connect GitHub repo
3. Set environment variables:
   - `BINANCE_API_KEY`
   - `BINANCE_API_SECRET`
4. Deploy and get the URL

### Option 3: Render
1. Go to [render.com](https://render.com) and create account
2. Create new Web Service
3. Connect GitHub repo pointing to `proxy-server` folder
4. Set environment variables
5. Deploy

## Environment Variables Required

```
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret
```

## API Endpoint

Once deployed, the proxy will be available at:
`https://your-deployment-url.vercel.app/api/binance-portfolio`

Update this URL in your main app's `loadPortfolio` function.