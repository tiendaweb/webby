<?php

namespace App\Services;

use App\Models\Language;
use App\Models\SystemSetting;
use App\Models\Transaction;
use ArPHP\I18N\Arabic;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class InvoiceService
{
    /**
     * Theme colors matching the admin color theme settings.
     */
    protected static array $themeColors = [
        'neutral' => ['primary' => '#171717', 'primary_foreground' => '#fafafa'],
        'blue' => ['primary' => '#3b82f6', 'primary_foreground' => '#f8fafc'],
        'green' => ['primary' => '#16a34a', 'primary_foreground' => '#f0fdf4'],
        'orange' => ['primary' => '#f97316', 'primary_foreground' => '#fff7ed'],
        'red' => ['primary' => '#dc2626', 'primary_foreground' => '#fef2f2'],
        'rose' => ['primary' => '#e11d48', 'primary_foreground' => '#fff1f2'],
        'violet' => ['primary' => '#8b5cf6', 'primary_foreground' => '#f5f3ff'],
        'yellow' => ['primary' => '#eab308', 'primary_foreground' => '#422006'],
    ];

    /**
     * Generate and stream PDF invoice.
     * Opens in browser tab for view/print/save.
     */
    public function streamPdf(Transaction $transaction): Response
    {
        $transaction->load(['user', 'subscription.plan']);

        $data = $this->getInvoiceData($transaction);

        // Set locale for translation during PDF rendering
        $originalLocale = App::getLocale();
        App::setLocale($data['locale']);

        try {
            $html = view('invoices.invoice', $data)->render();

            if ($data['isRtl']) {
                $html = $this->shapeArabicText($html);
            }

            $pdf = Pdf::loadHTML($html);

            return $pdf->stream("invoice-{$transaction->invoice_number}.pdf");
        } finally {
            App::setLocale($originalLocale);
        }
    }

    /**
     * Generate and download PDF invoice.
     */
    public function downloadPdf(Transaction $transaction): Response
    {
        $transaction->load(['user', 'subscription.plan']);

        $data = $this->getInvoiceData($transaction);

        // Set locale for translation during PDF rendering
        $originalLocale = App::getLocale();
        App::setLocale($data['locale']);

        try {
            $html = view('invoices.invoice', $data)->render();

            if ($data['isRtl']) {
                $html = $this->shapeArabicText($html);
            }

            $pdf = Pdf::loadHTML($html);

            return $pdf->download("invoice-{$transaction->invoice_number}.pdf");
        } finally {
            App::setLocale($originalLocale);
        }
    }

    /**
     * Apply Arabic text shaping to HTML for proper RTL rendering in dompdf.
     *
     * Dompdf lacks HarfBuzz integration, so Arabic characters render disconnected.
     * This processes text nodes through ar-php's utf8Glyphs to convert Arabic text
     * into presentation form glyphs that render correctly without a shaping engine.
     */
    protected function shapeArabicText(string $html): string
    {
        $arabic = new Arabic;

        // Process text between HTML tags — shape Arabic characters into presentation forms
        return preg_replace_callback(
            '/(?<=>)([^<]+)(?=<)/',
            function ($matches) use ($arabic) {
                $text = $matches[1];

                // Only process if the text contains Arabic characters
                if (preg_match('/[\x{0600}-\x{06FF}]/u', $text)) {
                    // Strip optional diacritics that dompdf/DejaVu Sans can't render
                    $text = preg_replace('/[\x{064B}-\x{065F}\x{0670}]/u', '', $text);

                    $shaped = $arabic->utf8Glyphs($text);

                    // Convert Arabic-Indic digits back to Western digits for consistent rendering
                    $shaped = str_replace(
                        ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'],
                        ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
                        $shaped
                    );

                    return $shaped;
                }

                return $text;
            },
            $html
        );
    }

    /**
     * Get invoice data for the template.
     */
    public function getInvoiceData(Transaction $transaction): array
    {
        $dateFormat = SystemSetting::get('date_format', 'F j, Y');
        $timezone = SystemSetting::get('timezone', 'UTC');

        // Get user's preferred locale or fall back to system default
        $locale = $transaction->user?->locale
            ?? SystemSetting::get('default_locale', config('app.locale', 'en'));

        // Get language RTL setting from database
        $language = Language::where('code', $locale)->first();
        $isRtl = $language?->is_rtl ?? false;

        // Get theme colors
        $theme = SystemSetting::get('color_theme', 'neutral');
        $colors = self::$themeColors[$theme] ?? self::$themeColors['neutral'];

        // Get logo URL (absolute path for PDF)
        $logoPath = SystemSetting::get('site_logo');
        $logoUrl = $logoPath ? public_path('storage/'.$logoPath) : null;

        // Check if logo file exists
        if ($logoUrl && ! file_exists($logoUrl)) {
            $logoUrl = null;
        }

        return [
            'transaction' => $transaction,
            'user' => $transaction->user,
            'subscription' => $transaction->subscription,
            'plan' => $transaction->subscription?->plan,
            'date' => now()->timezone($timezone)->format($dateFormat),
            'date_format' => $dateFormat,
            'locale' => $locale,
            'isRtl' => $isRtl,
            'company' => [
                'name' => SystemSetting::get('site_name', config('app.name')),
                'description' => SystemSetting::get('site_description'),
                'tagline' => SystemSetting::get('site_tagline'),
                'email' => SystemSetting::get('support_email', config('mail.from.address')),
            ],
            'theme' => [
                'primary' => $colors['primary'],
                'primary_foreground' => $colors['primary_foreground'],
            ],
            'logoUrl' => $logoUrl,
        ];
    }

    /**
     * Format currency amount.
     */
    public static function formatCurrency(float $amount, string $currency = 'USD'): string
    {
        $symbols = [
            'USD' => '$',
            'EUR' => "\u{20AC}",
            'GBP' => "\u{00A3}",
            'JPY' => "\u{00A5}",
            'AUD' => 'A$',
            'CAD' => 'C$',
        ];

        $symbol = $symbols[$currency] ?? $currency.' ';

        // Handle zero-decimal currencies
        $decimals = in_array($currency, ['JPY', 'KRW', 'VND']) ? 0 : 2;

        return $symbol.number_format($amount, $decimals);
    }
}
