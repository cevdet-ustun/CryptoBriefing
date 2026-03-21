/**
 * Portfolio performance calculation utilities
 */

export interface CoinPerformance {
  symbol: string;
  amount: number;
  buyPrice: number;
  currentPrice: number;
  costBasis: number;
  currentValue: number;
  gainLoss: number;
  returnPercentage: number;
}

export interface PortfolioPerformance {
  totalCostBasis: number;
  totalCurrentValue: number;
  totalGainLoss: number;
  totalReturnPercentage: number;
  coinPerformance: CoinPerformance[];
  bestPerformer: CoinPerformance | null;
  worstPerformer: CoinPerformance | null;
  averageReturn: number;
  numCoins: number;
}

/**
 * Calculate comprehensive portfolio performance metrics
 * @param portfolio - Array of coin holdings with symbol, amount, buyPrice
 * @param portfolioPrices - Object with current prices keyed by lowercase coin symbol
 * @returns PortfolioPerformance object with overall and per-coin metrics
 */
export function calculatePortfolioPerformance(
  portfolio: Array<{ symbol: string; amount: number; buyPrice: number }>,
  portfolioPrices: Record<string, { usd: number }>
): PortfolioPerformance {
  if (!portfolio || portfolio.length === 0) {
    return {
      totalCostBasis: 0,
      totalCurrentValue: 0,
      totalGainLoss: 0,
      totalReturnPercentage: 0,
      coinPerformance: [],
      bestPerformer: null,
      worstPerformer: null,
      averageReturn: 0,
      numCoins: 0,
    };
  }

  // Calculate performance for each coin
  const coinPerformance: CoinPerformance[] = portfolio.map(coin => {
    const currentPrice = portfolioPrices[coin.symbol.toLowerCase()]?.usd || coin.buyPrice;
    const costBasis = coin.buyPrice * coin.amount;
    const currentValue = currentPrice * coin.amount;
    const gainLoss = currentValue - costBasis;
    const returnPercentage = ((currentPrice - coin.buyPrice) / coin.buyPrice) * 100;

    return {
      symbol: coin.symbol,
      amount: coin.amount,
      buyPrice: coin.buyPrice,
      currentPrice,
      costBasis,
      currentValue,
      gainLoss,
      returnPercentage,
    };
  });

  // Calculate totals
  const totalCostBasis = coinPerformance.reduce((sum, c) => sum + c.costBasis, 0);
  const totalCurrentValue = coinPerformance.reduce((sum, c) => sum + c.currentValue, 0);
  const totalGainLoss = totalCurrentValue - totalCostBasis;
  const totalReturnPercentage = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

  // Find best and worst performers
  let bestPerformer = coinPerformance[0];
  let worstPerformer = coinPerformance[0];

  for (let i = 1; i < coinPerformance.length; i++) {
    if (coinPerformance[i].returnPercentage > bestPerformer.returnPercentage) {
      bestPerformer = coinPerformance[i];
    }
    if (coinPerformance[i].returnPercentage < worstPerformer.returnPercentage) {
      worstPerformer = coinPerformance[i];
    }
  }

  // Calculate average return
  const averageReturn = coinPerformance.reduce((sum, c) => sum + c.returnPercentage, 0) / coinPerformance.length;

  return {
    totalCostBasis,
    totalCurrentValue,
    totalGainLoss,
    totalReturnPercentage,
    coinPerformance,
    bestPerformer,
    worstPerformer,
    averageReturn,
    numCoins: coinPerformance.length,
  };
}

/**
 * Format portfolio performance for display
 */
export function formatPerformanceMetric(value: number, type: 'currency' | 'percentage' = 'currency'): string {
  if (type === 'percentage') {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }
  return `$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
