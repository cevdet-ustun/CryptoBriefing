import { createClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet, Text,
  TouchableOpacity,
  View
} from 'react-native';

const SUPABASE_URL = 'https://togyusfrvapccoqcqtor.supabase.co';
const SUPABASE_KEY = 'sb_publishable_LtgN8mg8cBM8ByqD92sk8w_V9Ah1Pxk';
const USER_ID = 'cevdet';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const symbolToId = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  BNB: 'binancecoin',
  ADA: 'cardano',
  SOL: 'solana',
  DOT: 'polkadot',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  ALGO: 'algorand',
  VET: 'vechain',
  ICP: 'internet-computer',
  FIL: 'filecoin',
  TRX: 'tron',
  ETC: 'ethereum-classic',
  XLM: 'stellar',
  THETA: 'theta-token',
  HBAR: 'hedera-hashgraph',
  NEAR: 'near',
  FLOW: 'flow',
  MANA: 'decentraland',
  SAND: 'the-sandbox',
  AXS: 'axie-infinity',
  CHZ: 'chiliz',
  ENJ: 'enjincoin',
  GALA: 'gala',
  // Add more as needed
};

const COLORS = {
  bg: '#0F1117', card: '#1A1D27', border: '#2A2D3A',
  text: '#FFFFFF', muted: '#8B8FA8', green: '#22C55E',
  red: '#EF4444', amber: '#F59E0B', blue: '#3B82F6',
  greenBg: '#052e16', redBg: '#450a0a',
};

export default function App() {
  const [tab, setTab] = useState('briefing');
  const [portfolio, setPortfolio] = useState([]);
  const [movers, setMovers] = useState([]);
  const [globalData, setGlobalData] = useState(null);
  const [analysis, setAnalysis] = useState('');
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [portfolioPrices, setPortfolioPrices] = useState({});

  useEffect(() => { loadPortfolio(); }, []);
  useEffect(() => { if (tab === 'briefing') loadAll(); }, [tab]);

  async function loadPortfolio() {
    try {
      const response = await fetch('/api/binance-portfolio');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
      }
      const coins = await response.json();
      setPortfolio(coins);
      fetchPortfolioPrices(coins);
    } catch (e) {
      Alert.alert('Error', 'Failed to load portfolio: ' + String(e));
    }
  }

  async function addCoin() {
    if (!newCoin.symbol || !newCoin.amount || !newCoin.buyPrice) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    const coin = {
      id: Date.now().toString(),
      user_id: USER_ID,
      symbol: newCoin.symbol.toUpperCase().trim(),
      amount: parseFloat(newCoin.amount),
      buy_price: parseFloat(newCoin.buyPrice),
    };
    try {
      const { error } = await supabase.from('portfolio').insert(coin);
      if (error) throw error;
      setModalVisible(false);
      setNewCoin({ symbol: '', amount: '', buyPrice: '' });
      loadPortfolio();
    } catch (e) { Alert.alert('Error', String(e)); }
  }

  async function updateCoin() {
    if (!editingCoin.symbol || !editingCoin.amount || !editingCoin.buyPrice) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    try {
      const { error } = await supabase.from('portfolio')
        .update({ symbol: editingCoin.symbol.toUpperCase().trim(), amount: parseFloat(editingCoin.amount), buy_price: parseFloat(editingCoin.buyPrice) })
        .eq('id', editingCoin.id);
      if (error) throw error;
      setModalVisible(false);
      setEditingCoin(null);
      loadPortfolio();
    } catch (e) { Alert.alert('Error', String(e)); }
  }

  function openEditModal(coin) {
    setEditingCoin({ ...coin });
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setNewCoin({ symbol: '', amount: '', buyPrice: '' });
    setEditingCoin(null);
  }

  function getCoinToRemove() {
    return portfolio.find(c => c.id === removingCoinId);
  }

  function removeCoin(id) {
    setRemovingCoinId(id);
    setRemoveConfirmVisible(true);
  }

  async function confirmRemove() {
    if (!removingCoinId) return;
    try {
      const { error } = await supabase.from('portfolio').delete().eq('id', removingCoinId);
      if (error) throw error;
      setRemoveConfirmVisible(false);
      setRemovingCoinId(null);
      loadPortfolio();
    } catch (e) { Alert.alert('Error', 'Failed to remove coin: ' + String(e)); }
  }

  function cancelRemove() {
    setRemoveConfirmVisible(false);
    setRemovingCoinId(null);
  }

  async function fetchPortfolioPrices(coins) {
    if (!coins.length) return;
    try {
      const ids = coins.map(c => symbolToId[c.symbol] || c.symbol.toLowerCase()).join(',');
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + ids + '&vs_currencies=usd&include_24hr_change=true');
      const data = await res.json();
      setPortfolioPrices(data);
    } catch (e) {}
  }

  async function fetchMarketData() {
    const [movRes, glbRes] = await Promise.all([
      fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=percent_change_24h_desc&per_page=8&page=1&sparkline=false&price_change_percentage=24h'),
      fetch('https://api.coingecko.com/api/v3/global'),
    ]);
    const movData = await movRes.json();
    const glbData = await glbRes.json();
    return { movers: movData, global: glbData.data };
  }

  async function callClaude(prompt) {
    // Always use Netlify function for secure API access
    const url = '/api/claude';
    const headers = { 'Content-Type': 'application/json' };
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] })
    });
    const data = await res.json();
    return data.content?.map(b => b.text || '').join('') || '';
  }

  async function loadAll() {
    setLoading(true);
    try {
      const data = await fetchMarketData();
      setMovers(data.movers);
      setGlobalData(data.global);
      await fetchPortfolioPrices(portfolio);
      const coinSummary = data.movers.slice(0, 5).map(c =>
        c.symbol.toUpperCase() + ' ' + (c.price_change_percentage_24h || 0).toFixed(1) + '% vol$' + (c.total_volume / 1e6).toFixed(0) + 'M'
      ).join(', ');
      const btcDom = data.global.market_cap_percentage.btc.toFixed(1);
      const mktChg = (data.global.market_cap_change_percentage_24h_usd || 0).toFixed(2);
      const portfolioSummary = portfolio.length
        ? portfolio.map(c => c.symbol + ' (bought at $' + c.buyPrice + ', holding ' + c.amount + ')').join(', ')
        : 'No portfolio yet';
      const analysisPrompt = 'You are a concise crypto market analyst. Write a 3-sentence market summary for a swing trader. Be direct.\nData: BTC dominance ' + btcDom + '%, market change 24h: ' + mktChg + '%, top movers: ' + coinSummary + '.\nFocus on market direction, altcoin season status, and key risks. Max 60 words.';
      const actionsPrompt = 'You are a crypto trading coach. Give exactly 4 specific action items for today.\nMarket: BTC dominance ' + btcDom + '%, 24h change: ' + mktChg + '%, top movers: ' + coinSummary + '.\nPortfolio: ' + portfolioSummary + '.\nRules: numbered 1-4, max 15 words each, specific to portfolio holdings. No generic advice.';
      const [analysisText, actionsText] = await Promise.all([callClaude(analysisPrompt), callClaude(actionsPrompt)]);
      setAnalysis(analysisText.trim());
      const lines = actionsText.trim().split('\n')
        .map(l => l.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*]\s*/, '').trim())
        .filter(l => l.length > 0).slice(0, 4);
      setActions(lines);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (e) { Alert.alert('Error', String(e)); }
    setLoading(false);
  }

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadAll(); setRefreshing(false); }, [portfolio]);

  function getPortfolioValue() {
    return portfolio.reduce((sum, coin) => {
      const id = symbolToId[coin.symbol] || coin.symbol.toLowerCase();
      const price = portfolioPrices[id]?.usd || coin.buyPrice;
      return sum + price * coin.amount;
    }, 0);
  }

  const totalValue = getPortfolioValue();
  const totalCost = portfolio.reduce((sum, c) => sum + c.buyPrice * c.amount, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, tab === 'briefing' && styles.tabActive]} onPress={() => setTab('briefing')}>
          <Text style={[styles.tabText, tab === 'briefing' && styles.tabTextActive]}>Briefing</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'portfolio' && styles.tabActive]} onPress={() => { setTab('portfolio'); fetchPortfolioPrices(portfolio); }}>
          <Text style={[styles.tabText, tab === 'portfolio' && styles.tabTextActive]}>Portfolio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'movers' && styles.tabActive]} onPress={() => setTab('movers')}>
          <Text style={[styles.tabText, tab === 'movers' && styles.tabTextActive]}>Movers</Text>
        </TouchableOpacity>
      </View>

      {tab === 'briefing' && (
        <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.muted} />}>
          <View style={styles.pageHeader}>
            <View>
              <Text style={styles.pageTitle}>Daily briefing</Text>
              {lastUpdated ? <Text style={styles.pageSub}>Updated {lastUpdated}</Text> : null}
            </View>
            <TouchableOpacity style={styles.refreshBtn} onPress={loadAll} disabled={loading}>
              <Text style={styles.refreshBtnText}>{loading ? '...' : 'Refresh'}</Text>
            </TouchableOpacity>
          </View>
          {globalData && (
            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>BTC dominance</Text>
                <Text style={styles.metricVal}>{globalData.market_cap_percentage.btc.toFixed(1)}%</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Market 24h</Text>
                <Text style={[styles.metricVal, { color: globalData.market_cap_change_percentage_24h_usd >= 0 ? COLORS.green : COLORS.red }]}>
                  {globalData.market_cap_change_percentage_24h_usd >= 0 ? '+' : ''}{(globalData.market_cap_change_percentage_24h_usd || 0).toFixed(2)}%
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Top mover</Text>
                <Text style={[styles.metricVal, { color: COLORS.green }]}>
                  {movers[0] ? movers[0].symbol.toUpperCase() + ' +' + (movers[0].price_change_percentage_24h || 0).toFixed(1) + '%' : '—'}
                </Text>
              </View>
            </View>
          )}
          <Text style={styles.sectionLabel}>Market analysis</Text>
          <View style={styles.card}>
            {loading ? <ActivityIndicator color={COLORS.muted} /> : <Text style={styles.analysisText}>{analysis || 'Tap Refresh to load analysis.'}</Text>}
          </View>
          <Text style={styles.sectionLabel}>Your actions today</Text>
          <View style={styles.card}>
            {loading ? <ActivityIndicator color={COLORS.muted} /> : actions.length > 0 ? actions.map((a, i) => (
              <View key={i} style={[styles.actionRow, i < actions.length - 1 && styles.actionBorder]}>
                <View style={styles.actionNum}><Text style={styles.actionNumText}>{i + 1}</Text></View>
                <Text style={styles.actionText}>{a}</Text>
              </View>
            )) : <Text style={styles.muted}>Tap Refresh to load actions.</Text>}
          </View>
        </ScrollView>
      )}

      {tab === 'portfolio' && (
        <ScrollView style={styles.scroll}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>My portfolio</Text>
          </View>
          {portfolio.length > 0 && (
            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Total value</Text>
                <Text style={styles.metricVal}>${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Cost basis</Text>
                <Text style={styles.metricVal}>${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Total P&L</Text>
                <Text style={[styles.metricVal, { color: totalPnl >= 0 ? COLORS.green : COLORS.red }]}>
                  {totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(1)}%
                </Text>
              </View>
            </View>
          )}
          {portfolio.length > 0 && (
            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Avg return</Text>
                <Text style={[styles.metricVal, { color: performance.averageReturn >= 0 ? COLORS.green : COLORS.red }]}>
                  {performance.averageReturn >= 0 ? '+' : ''}{performance.averageReturn.toFixed(1)}%
                </Text>
              </View>
              {performance.bestPerformer && (
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Best</Text>
                  <Text style={[styles.metricVal, { color: COLORS.green, fontSize: 14 }]}>
                    {performance.bestPerformer.symbol}
                  </Text>
                </View>
              )}
              {performance.worstPerformer && (
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Worst</Text>
                  <Text style={[styles.metricVal, { color: COLORS.red, fontSize: 14 }]}>
                    {performance.worstPerformer.symbol}
                  </Text>
                </View>
              )}
            </View>
          )}
          {portfolio.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No coins in your Binance account</Text>
              <Text style={styles.emptyText}>Your portfolio will load automatically from Binance.</Text>
            </View>
          ) : portfolio.map(coin => {
            const livePrice = portfolioPrices[coin.symbol.toLowerCase()]?.usd;
            const change24h = portfolioPrices[coin.symbol.toLowerCase()]?.usd_24h_change;
            const currentPrice = livePrice || coin.buyPrice;
            const value = currentPrice * coin.amount;
            const pnl = (currentPrice - coin.buyPrice) * coin.amount;
            const pnlPct = ((currentPrice - coin.buyPrice) / coin.buyPrice) * 100;
            return (
              <View key={coin.symbol} style={styles.card}>
                <View style={styles.coinHeader}>
                  <View>
                    <Text style={styles.coinSymbol}>{coin.symbol}</Text>
                    <Text style={styles.coinSub}>{coin.amount} coins · bought @ ${coin.buyPrice}</Text>
                  </View>
                </View>
                <View style={styles.coinStats}>
                  <View>
                    <Text style={styles.statLabel}>Price</Text>
                    <Text style={styles.statVal}>${currentPrice < 1 ? currentPrice.toFixed(4) : currentPrice.toLocaleString()}</Text>
                  </View>
                  <View>
                    <Text style={styles.statLabel}>Value</Text>
                    <Text style={styles.statVal}>${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                  </View>
                  <View>
                    <Text style={styles.statLabel}>P&L</Text>
                    <Text style={[styles.statVal, { color: pnl >= 0 ? COLORS.green : COLORS.red }]}>
                      {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                    </Text>
                  </View>
                  {change24h !== undefined && (
                    <View>
                      <Text style={styles.statLabel}>24h</Text>
                      <Text style={[styles.statVal, { color: change24h >= 0 ? COLORS.green : COLORS.red }]}>
                        {change24h >= 0 ? '+' : ''}{change24h.toFixed(1)}%
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {tab === 'movers' && (
        <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.muted} />}>
          <Text style={[styles.pageTitle, { padding: 16, paddingBottom: 8 }]}>Top movers today</Text>
          {movers.length === 0 ? (
            <View style={styles.emptyState}><ActivityIndicator color={COLORS.muted} /></View>
          ) : movers.map(coin => {
            const chg = coin.price_change_percentage_24h || 0;
            return (
              <View key={coin.id} style={styles.moverRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.coinSymbol}>{coin.symbol.toUpperCase()} <Text style={styles.coinSub}>{coin.name}</Text></Text>
                  <Text style={styles.coinSub}>Vol: ${(coin.total_volume / 1e6).toFixed(0)}M · MCap: ${(coin.market_cap / 1e9).toFixed(1)}B</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.coinSymbol}>${coin.current_price < 1 ? coin.current_price.toFixed(4) : coin.current_price.toLocaleString()}</Text>
                  <Text style={[styles.changeBadge, { backgroundColor: chg >= 0 ? COLORS.greenBg : COLORS.redBg, color: chg >= 0 ? COLORS.green : COLORS.red }]}>
                    {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.bg },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.blue },
  tabText: { fontSize: 14, color: COLORS.muted },
  tabTextActive: { color: COLORS.text, fontWeight: '500' },
  scroll: { flex: 1, backgroundColor: COLORS.bg },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  pageTitle: { fontSize: 20, fontWeight: '600', color: COLORS.text },
  pageSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  refreshBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 0.5, borderColor: COLORS.border },
  refreshBtnText: { fontSize: 13, color: COLORS.text },
  addBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: COLORS.blue },
  addBtnText: { fontSize: 13, color: '#fff', fontWeight: '500' },
  metricsRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  metric: { flex: 1, backgroundColor: COLORS.card, borderRadius: 10, padding: 12 },
  metricLabel: { fontSize: 11, color: COLORS.muted, marginBottom: 4 },
  metricVal: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 16, marginTop: 12, marginBottom: 6 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, marginHorizontal: 12, marginBottom: 12, padding: 14, borderWidth: 0.5, borderColor: COLORS.border },
  analysisText: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: 12 },
  actionBorder: { borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  actionNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center' },
  actionNumText: { fontSize: 12, fontWeight: '600', color: COLORS.blue },
  actionText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },
  muted: { color: COLORS.muted, fontSize: 14 },
  coinHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  coinSymbol: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  coinSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  coinActions: { flexDirection: 'row', gap: 8 },
  editBtnArea: { padding: 4 },
  editBtn: { fontSize: 14, color: COLORS.blue, fontWeight: '500' },
  removeBtn: { fontSize: 14, color: COLORS.red, padding: 4 },
  coinStats: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { fontSize: 11, color: COLORS.muted, marginBottom: 2 },
  statVal: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  moverRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  changeBadge: { fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4, overflow: 'hidden' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '500', color: COLORS.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: COLORS.muted, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 16 },
  inputLabel: { fontSize: 12, color: COLORS.muted, marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: COLORS.bg, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 8, padding: 12, fontSize: 15, color: COLORS.text },
  confirmBtn: { backgroundColor: COLORS.blue, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 20 },
  confirmBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  cancelBtn: { padding: 14, alignItems: 'center' },
  cancelBtnText: { color: COLORS.muted, fontSize: 14 },
  staticText: { backgroundColor: COLORS.bg, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 8, padding: 12, fontSize: 15, color: COLORS.text, marginBottom: 10 },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  confirmCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, borderWidth: 0.5, borderColor: COLORS.border },
  confirmTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  confirmText: { fontSize: 14, color: COLORS.muted, marginBottom: 20, lineHeight: 20 },
  confirmActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  confirmCancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 0.5, borderColor: COLORS.border },
  confirmCancelText: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  confirmDeleteBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.red },
  confirmDeleteText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
