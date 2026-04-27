<?php

namespace App\Helpers;

use App\Models\SystemSetting;

class CurrencyHelper
{
    /**
     * Currency symbols mapping.
     * Supports 40+ currencies commonly used by payment gateways.
     */
    protected static array $symbols = [
        'USD' => '$',
        'EUR' => '€',
        'GBP' => '£',
        'NGN' => '₦',
        'GHS' => 'GH₵',
        'ZAR' => 'R',
        'KES' => 'KSh',
        'INR' => '₹',
        'JPY' => '¥',
        'KRW' => '₩',
        'CNY' => '¥',
        'CAD' => 'CA$',
        'AUD' => 'A$',
        'BRL' => 'R$',
        'MXN' => 'MX$',
        'CHF' => 'CHF',
        'SEK' => 'kr',
        'NOK' => 'kr',
        'DKK' => 'kr',
        'PLN' => 'zł',
        'THB' => '฿',
        'SGD' => 'S$',
        'HKD' => 'HK$',
        'MYR' => 'RM',
        'PHP' => '₱',
        'IDR' => 'Rp',
        'VND' => '₫',
        'AED' => 'د.إ',
        'SAR' => '﷼',
        'TRY' => '₺',
        'RUB' => '₽',
        'NZD' => 'NZ$',
        'TWD' => 'NT$',
        'ILS' => '₪',
        'CZK' => 'Kč',
        'HUF' => 'Ft',
        'RON' => 'lei',
        'BGN' => 'лв',
        'CLP' => 'CLP$',
        'COP' => 'COL$',
        'PEN' => 'S/',
        'ARS' => 'ARS$',
    ];

    /**
     * Zero decimal currencies.
     * These currencies don't use decimal places (e.g., JPY 1000 = ¥1,000).
     * Used by Stripe, Razorpay, and other payment gateways.
     */
    protected static array $zeroDecimalCurrencies = [
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
     * Get the system currency code.
     */
    public static function getCode(): string
    {
        return SystemSetting::get('default_currency', 'USD');
    }

    /**
     * Get the symbol for a currency code.
     *
     * @param  string|null  $code  Currency code (e.g., 'USD'). If null, uses system currency.
     * @return string Currency symbol (e.g., '$') or the code itself if not found.
     */
    public static function getSymbol(?string $code = null): string
    {
        $code = $code ?? self::getCode();

        return self::$symbols[$code] ?? $code;
    }

    /**
     * Format an amount with the currency symbol.
     *
     * @param  float  $amount  The amount to format.
     * @param  string|null  $code  Currency code. If null, uses system currency.
     * @param  bool  $showCode  Whether to append the currency code (e.g., "$29.99 USD").
     * @return string Formatted amount (e.g., "$29.99" or "¥1,000").
     */
    public static function format(float $amount, ?string $code = null, bool $showCode = false): string
    {
        $code = $code ?? self::getCode();
        $symbol = self::getSymbol($code);
        $decimals = self::getDecimalPlaces($code);
        $formatted = $symbol.number_format($amount, $decimals);

        if ($showCode) {
            $formatted .= ' '.$code;
        }

        return $formatted;
    }

    /**
     * Get the number of decimal places for a currency.
     *
     * @param  string  $code  Currency code.
     * @return int Number of decimal places (0 for zero-decimal currencies, 2 for others).
     */
    public static function getDecimalPlaces(string $code): int
    {
        return in_array($code, self::$zeroDecimalCurrencies) ? 0 : 2;
    }

    /**
     * Get list of supported currency codes.
     *
     * @return array<string> Array of currency codes.
     */
    public static function getSupportedCurrencies(): array
    {
        return array_keys(self::$symbols);
    }

    /**
     * Get currency options for select inputs.
     *
     * @return array<string, string> Associative array of code => "symbol - code".
     */
    public static function getCurrencyOptions(): array
    {
        $options = [];
        foreach (self::$symbols as $code => $symbol) {
            $options[$code] = "{$symbol} - {$code}";
        }

        return $options;
    }

    /**
     * Check if a currency is a zero-decimal currency.
     *
     * @param  string  $code  Currency code.
     * @return bool True if zero-decimal currency.
     */
    public static function isZeroDecimal(string $code): bool
    {
        return in_array($code, self::$zeroDecimalCurrencies);
    }

    /**
     * Convert amount to smallest unit (cents/pence/etc) for payment gateway APIs.
     * Most gateways require amounts in smallest unit (e.g., 1000 cents = $10.00).
     *
     * @param  float  $amount  Amount in standard format.
     * @param  string  $code  Currency code.
     * @return int Amount in smallest unit.
     */
    public static function toSmallestUnit(float $amount, string $code): int
    {
        if (self::isZeroDecimal($code)) {
            return (int) $amount;
        }

        return (int) round($amount * 100);
    }

    /**
     * Convert amount from smallest unit back to standard format.
     *
     * @param  int  $amount  Amount in smallest unit.
     * @param  string  $code  Currency code.
     * @return float Amount in standard format.
     */
    public static function fromSmallestUnit(int $amount, string $code): float
    {
        if (self::isZeroDecimal($code)) {
            return (float) $amount;
        }

        return $amount / 100;
    }

    /**
     * Check gateway compatibility with a currency.
     * Only checks ACTIVE and INSTALLED gateways.
     *
     * @param  string  $currency  Currency code to check
     * @return array{compatible: array, incompatible: array}
     */
    public static function checkGatewayCompatibility(string $currency): array
    {
        $compatible = [];
        $incompatible = [];

        // Get only active payment gateway plugins
        $plugins = \App\Models\Plugin::active()
            ->byType('payment_gateway')
            ->get();

        foreach ($plugins as $plugin) {
            $gateway = $plugin->getInstance();
            $supported = $gateway->getSupportedCurrencies();

            $gatewayInfo = [
                'slug' => $plugin->slug,
                'name' => $gateway->getName(),
            ];

            // Empty array means all currencies supported
            if (empty($supported) || in_array($currency, $supported)) {
                $compatible[] = $gatewayInfo;
            } else {
                $incompatible[] = array_merge($gatewayInfo, [
                    'supported' => $supported,
                ]);
            }
        }

        return compact('compatible', 'incompatible');
    }
}
