const crypto = require('crypto');

function createSignature(queryString, secret) {
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

module.exports = async (req, res) => {
  // Proxy server for Binance API - bypasses location restrictions
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({
      error: 'API keys not configured',
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret
    });
  }

  try {
    // Get server time for accurate timestamp
    const timeResponse = await fetch('https://api.binance.com/api/v3/time');
    if (!timeResponse.ok) {
      throw new Error('Failed to get server time');
    }
    const timeData = await timeResponse.json();
    const timestamp = timeData.serverTime;

    // Get account information
    const query = `timestamp=${timestamp}`;
    const signature = createSignature(query, apiSecret);

    const accountResponse = await fetch(
      `https://api.binance.com/api/v3/account?${query}&signature=${signature}`,
      {
        headers: {
          'X-MBX-APIKEY': apiKey
        }
      }
    );

    if (!accountResponse.ok) {
      const errorText = await accountResponse.text();
      return res.status(500).json({
        error: `Binance API error: ${accountResponse.status}`,
        details: errorText
      });
    }

    const accountData = await accountResponse.json();

    // Process balances
    const portfolio = [];
    for (const balance of accountData.balances) {
      const free = parseFloat(balance.free);
      const locked = parseFloat(balance.locked);
      const total = free + locked;

      if (total > 0) {
        const symbol = balance.asset;
        let buyPrice = 0;

        // Try to get trade history for average buy price
        try {
          const tradesQuery = `symbol=${symbol}USDT&timestamp=${timestamp}`;
          const tradesSignature = createSignature(tradesQuery, apiSecret);

          const tradesResponse = await fetch(
            `https://api.binance.com/api/v3/myTrades?${tradesQuery}&signature=${tradesSignature}`,
            {
              headers: { 'X-MBX-APIKEY': apiKey }
            }
          );

          if (tradesResponse.ok) {
            const trades = await tradesResponse.json();
            const buyTrades = trades.filter(t => t.isBuyer);

            if (buyTrades.length > 0) {
              const totalCost = buyTrades.reduce((sum, t) => sum + parseFloat(t.price) * parseFloat(t.qty), 0);
              const totalQty = buyTrades.reduce((sum, t) => sum + parseFloat(t.qty), 0);
              buyPrice = totalCost / totalQty;
            }
          }
        } catch (e) {
          console.log(`Could not get trade history for ${symbol}:`, e.message);
        }

        // Fallback to current price if no trade history
        if (buyPrice === 0) {
          try {
            const priceResponse = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`);
            if (priceResponse.ok) {
              const priceData = await priceResponse.json();
              buyPrice = parseFloat(priceData.price);
            }
          } catch (e) {
            console.log(`Could not get price for ${symbol}:`, e.message);
          }
        }

        portfolio.push({
          symbol: symbol,
          amount: total,
          buyPrice: buyPrice
        });
      }
    }

    res.status(200).json({
      portfolio,
      debug: {
        totalBalances: accountData.balances.length,
        nonZeroBalances: portfolio.length,
        timestamp: timestamp
      }
    });

  } catch (error) {
    console.error('Proxy server error:', error);
    res.status(500).json({ error: error.message });
  }
};