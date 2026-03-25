const crypto = require('crypto');

function createSignature(queryString, secret) {
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;

  if (!apiKey || !apiSecret) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API keys not configured', hasApiKey: !!apiKey, hasApiSecret: !!apiSecret }) };
  }

  try {
    // First, get server time to sync timestamp
    const timeResponse = await fetch('https://api.binance.com/api/v3/time');
    if (!timeResponse.ok) {
      throw new Error('Failed to get Binance server time');
    }
    const timeData = await timeResponse.json();
    const serverTime = timeData.serverTime;
    const timestamp = serverTime;

    console.log(`Server time: ${serverTime}, using timestamp: ${timestamp}`);

    const query = `timestamp=${timestamp}`;
    const signature = createSignature(query, apiSecret);

    const accountUrl = `https://api.binance.com/api/v3/account?${query}&signature=${signature}`;

    const accountResponse = await fetch(accountUrl, {
      headers: {
        'X-MBX-APIKEY': apiKey
      }
    });

    if (!accountResponse.ok) {
      const errorText = await accountResponse.text();
      return { statusCode: 500, body: JSON.stringify({ error: `Binance API error: ${accountResponse.status}`, details: errorText }) };
    }

    const accountData = await accountResponse.json();

    // Debug: log number of balances
    console.log(`Found ${accountData.balances.length} balance entries`);

    const portfolio = [];
    let totalBalances = 0;

    for (const balance of accountData.balances) {
      const free = parseFloat(balance.free);
      const locked = parseFloat(balance.locked);
      const total = free + locked;

      console.log(`${balance.asset}: free=${balance.free}, locked=${balance.locked}, total=${total}`);

      if (total > 0) {
        totalBalances++;
        const symbol = balance.asset;
        const symbol = balance.asset;

        let buyPrice = 0;
        if (symbol !== 'USDT') {
          try {
            const tradesQuery = `symbol=${symbol}USDT&timestamp=${timestamp}`;
            const tradesSignature = createSignature(tradesQuery, apiSecret);
            const tradesUrl = `https://api.binance.com/api/v3/myTrades?${tradesQuery}&signature=${tradesSignature}`;

            const tradesResponse = await fetch(tradesUrl, {
              headers: { 'X-MBX-APIKEY': apiKey }
            });

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
            // If trades fail, set to current price
          }
        }

        if (buyPrice === 0) {
          // Fallback to current price
          try {
            const priceResponse = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`);
            if (priceResponse.ok) {
              const priceData = await priceResponse.json();
              buyPrice = parseFloat(priceData.price);
            }
          } catch (e) {}
        }

        portfolio.push({
          symbol: symbol,
          amount: total,
          buyPrice: buyPrice
        });
      }
    }

    console.log(`Portfolio built with ${portfolio.length} coins, total balances processed: ${totalBalances}`);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        portfolio,
        debug: {
          totalBalances: accountData.balances.length,
          nonZeroBalances: totalBalances,
          serverTime: serverTime,
          timestampUsed: timestamp
        }
      })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};