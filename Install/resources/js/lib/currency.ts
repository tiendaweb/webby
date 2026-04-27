/**
 * Zero-decimal currencies that don't use decimal places.
 * Used by payment gateways like Stripe, Razorpay, etc.
 */
const ZERO_DECIMAL_CURRENCIES = [
    'BIF', // Burundian Franc
    'CLP', // Chilean Peso
    'DJF', // Djiboutian Franc
    'GNF', // Guinean Franc
    'JPY', // Japanese Yen
    'KMF', // Comorian Franc
    'KRW', // South Korean Won
    'MGA', // Malagasy Ariary
    'PYG', // Paraguayan Guarani
    'RWF', // Rwandan Franc
    'UGX', // Ugandan Shilling
    'VND', // Vietnamese Dong
    'VUV', // Vanuatu Vatu
    'XAF', // CFA Franc BEAC
    'XOF', // CFA Franc BCEAO
    'XPF', // CFP Franc
];

/**
 * Currency options with symbols for select inputs.
 */
export const CURRENCIES = [
    { value: 'USD', label: '$ - USD', symbol: '$' },
    { value: 'EUR', label: '€ - EUR', symbol: '€' },
    { value: 'GBP', label: '£ - GBP', symbol: '£' },
    { value: 'NGN', label: '₦ - NGN', symbol: '₦' },
    { value: 'GHS', label: 'GH₵ - GHS', symbol: 'GH₵' },
    { value: 'ZAR', label: 'R - ZAR', symbol: 'R' },
    { value: 'KES', label: 'KSh - KES', symbol: 'KSh' },
    { value: 'INR', label: '₹ - INR', symbol: '₹' },
    { value: 'JPY', label: '¥ - JPY', symbol: '¥' },
    { value: 'KRW', label: '₩ - KRW', symbol: '₩' },
    { value: 'CNY', label: '¥ - CNY', symbol: '¥' },
    { value: 'CAD', label: 'CA$ - CAD', symbol: 'CA$' },
    { value: 'AUD', label: 'A$ - AUD', symbol: 'A$' },
    { value: 'BRL', label: 'R$ - BRL', symbol: 'R$' },
    { value: 'MXN', label: 'MX$ - MXN', symbol: 'MX$' },
    { value: 'CHF', label: 'CHF - CHF', symbol: 'CHF' },
    { value: 'SEK', label: 'kr - SEK', symbol: 'kr' },
    { value: 'NOK', label: 'kr - NOK', symbol: 'kr' },
    { value: 'DKK', label: 'kr - DKK', symbol: 'kr' },
    { value: 'PLN', label: 'zł - PLN', symbol: 'zł' },
    { value: 'THB', label: '฿ - THB', symbol: '฿' },
    { value: 'SGD', label: 'S$ - SGD', symbol: 'S$' },
    { value: 'HKD', label: 'HK$ - HKD', symbol: 'HK$' },
    { value: 'MYR', label: 'RM - MYR', symbol: 'RM' },
    { value: 'PHP', label: '₱ - PHP', symbol: '₱' },
    { value: 'IDR', label: 'Rp - IDR', symbol: 'Rp' },
    { value: 'VND', label: '₫ - VND', symbol: '₫' },
    { value: 'AED', label: 'د.إ - AED', symbol: 'د.إ' },
    { value: 'SAR', label: '﷼ - SAR', symbol: '﷼' },
    { value: 'TRY', label: '₺ - TRY', symbol: '₺' },
    { value: 'RUB', label: '₽ - RUB', symbol: '₽' },
    { value: 'NZD', label: 'NZ$ - NZD', symbol: 'NZ$' },
    { value: 'TWD', label: 'NT$ - TWD', symbol: 'NT$' },
    { value: 'ILS', label: '₪ - ILS', symbol: '₪' },
    { value: 'CZK', label: 'Kč - CZK', symbol: 'Kč' },
    { value: 'HUF', label: 'Ft - HUF', symbol: 'Ft' },
    { value: 'RON', label: 'lei - RON', symbol: 'lei' },
    { value: 'BGN', label: 'лв - BGN', symbol: 'лв' },
    { value: 'CLP', label: 'CLP$ - CLP', symbol: 'CLP$' },
    { value: 'COP', label: 'COL$ - COP', symbol: 'COL$' },
    { value: 'PEN', label: 'S/ - PEN', symbol: 'S/' },
    { value: 'ARS', label: 'ARS$ - ARS', symbol: 'ARS$' },
];

/**
 * Check if a currency is a zero-decimal currency.
 */
export function isZeroDecimalCurrency(currency: string): boolean {
    return ZERO_DECIMAL_CURRENCIES.includes(currency);
}

/**
 * Get the number of decimal places for a currency.
 */
export function getDecimalPlaces(currency: string): number {
    return isZeroDecimalCurrency(currency) ? 0 : 2;
}

/**
 * Format an amount with the currency using Intl.NumberFormat.
 */
export function formatCurrency(amount: number, currency: string = 'USD', locale: string = 'en-US'): string {
    const decimals = getDecimalPlaces(currency);
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(amount);
}

/**
 * Get the currency symbol using Intl.NumberFormat.
 */
export function getCurrencySymbol(currency: string): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency })
        .format(0)
        .replace(/[\d.,\s]/g, '')
        .trim();
}

/**
 * Get currency info from the CURRENCIES array.
 */
export function getCurrencyInfo(code: string): (typeof CURRENCIES)[0] | undefined {
    return CURRENCIES.find((c) => c.value === code);
}

/**
 * Convert amount to smallest unit (cents/pence/etc) for payment gateway APIs.
 */
export function toSmallestUnit(amount: number, currency: string): number {
    if (isZeroDecimalCurrency(currency)) {
        return Math.round(amount);
    }
    return Math.round(amount * 100);
}

/**
 * Convert amount from smallest unit back to standard format.
 */
export function fromSmallestUnit(amount: number, currency: string): number {
    if (isZeroDecimalCurrency(currency)) {
        return amount;
    }
    return amount / 100;
}
