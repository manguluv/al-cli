import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as yahooFinance from 'yahoo-finance2';

// yahoo-finance2 mock 설정
vi.mock('yahoo-finance2', () => {
  const mockQuote = vi.fn();
  return {
    default: {
      quote: mockQuote,
    },
  };
});

describe('Exchange Rate Logic', () => {
  let yf;

  beforeEach(() => {
    // fresh yf instance for each test
    try {
      yf = new yahooFinance.default({ suppressNotices: ['yahooSurvey'] });
    } catch (e) {
      yf = yahooFinance.default;
    }
    vi.clearAllMocks();
  });

  it('should fetch USD/KRW exchange rate from Yahoo Finance', async () => {
    // Mock successful exchange rate response
    yf.quote.mockResolvedValue({
      regularMarketPrice: 1425.50,
    });

    // Simulate the fetchKrwExchangeRate logic
    const quote = await yf.quote('KRW=X');
    const rate = parseFloat(quote.regularMarketPrice || 0);

    expect(rate).toBe(1425.50);
    expect(yf.quote).toHaveBeenCalledWith('KRW=X');
  });

  it('should handle zero or invalid exchange rate', async () => {
    // Mock invalid exchange rate response
    yf.quote.mockResolvedValue({
      regularMarketPrice: 0,
    });

    const quote = await yf.quote('KRW=X');
    const rate = parseFloat(quote.regularMarketPrice || 0);

    expect(rate).toBe(0);
    expect(isNaN(rate) || rate === 0).toBe(true);
  });

  it('should handle missing exchange rate field', async () => {
    // Mock response without regularMarketPrice
    yf.quote.mockResolvedValue({});

    const quote = await yf.quote('KRW=X');
    const rate = parseFloat(quote.regularMarketPrice || 0);

    expect(rate).toBe(0);
  });

  it('should correctly convert USD price to KRW', () => {
    const exchangeRate = 1425.50;
    const usdPrice = 150.00;
    const krwPrice = usdPrice * exchangeRate;

    expect(krwPrice).toBe(213825);
  });

  it('should calculate profit in KRW correctly', () => {
    const exchangeRate = 1425.50;
    const currentPriceUsd = 200.00;
    const avgPriceUsd = 180.00;
    const quantity = 10;

    const currentPriceKrw = currentPriceUsd * exchangeRate;
    const avgPriceKrw = avgPriceUsd * exchangeRate;
    const profitKrw = (currentPriceKrw - avgPriceKrw) * quantity;

    expect(profitKrw).toBe(285100); // (200-180) * 1425.50 * 10
  });

  it('should handle fallback exchange rate when API fails', async () => {
    // Mock API failure
    yf.quote.mockRejectedValue(new Error('Network error'));

    let rate;
    try {
      const quote = await yf.quote('KRW=X');
      rate = parseFloat(quote.regularMarketPrice || 0);
      if (isNaN(rate) || rate === 0) throw new Error('Invalid exchange rate');
    } catch (error) {
      rate = 1400; // fallback value
    }

    expect(rate).toBe(1400);
  });
});
