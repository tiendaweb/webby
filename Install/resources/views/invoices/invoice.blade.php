<!DOCTYPE html>
<html lang="{{ $locale ?? 'en' }}" dir="{{ $isRtl ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ __('Invoice') }} {{ $transaction->invoice_number }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 12px;
            line-height: 1.5;
            color: #1f2937;
            padding: 40px;
            direction: {{ $isRtl ? 'rtl' : 'ltr' }};
        }

        .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            border-bottom: 2px solid {{ $theme['primary'] ?? '#3b82f6' }};
            padding-bottom: 20px;
        }

        .company-info h1 {
            font-size: 24px;
            color: {{ $theme['primary'] ?? '#3b82f6' }};
            margin-bottom: 4px;
        }

        .company-info p {
            color: #6b7280;
            font-size: 11px;
        }

        .invoice-title {
            text-align: {{ $isRtl ? 'left' : 'right' }};
        }

        .invoice-title h2 {
            font-size: 28px;
            color: #1f2937;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .invoice-meta {
            margin-top: 30px;
            margin-bottom: 30px;
        }

        .invoice-meta table {
            width: 100%;
        }

        .invoice-meta td {
            vertical-align: top;
            width: 50%;
        }

        .bill-to h3,
        .invoice-details h3 {
            font-size: 11px;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 8px;
            letter-spacing: 1px;
        }

        .bill-to p {
            margin-bottom: 4px;
        }

        .invoice-details {
            text-align: {{ $isRtl ? 'left' : 'right' }};
        }

        .invoice-details table {
            margin-{{ $isRtl ? 'right' : 'left' }}: auto;
        }

        .invoice-details td {
            padding: 4px 0;
        }

        .invoice-details td:first-child {
            color: #6b7280;
            padding-{{ $isRtl ? 'left' : 'right' }}: 20px;
        }

        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .status-completed {
            background-color: #d1fae5;
            color: #065f46;
        }

        .status-pending {
            background-color: #fef3c7;
            color: #92400e;
        }

        .status-failed {
            background-color: #fee2e2;
            color: #991b1b;
        }

        .status-refunded {
            background-color: #e5e7eb;
            color: #374151;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }

        .items-table th {
            background-color: {{ $theme['primary'] ?? '#3b82f6' }}15;
            padding: 12px;
            text-align: {{ $isRtl ? 'right' : 'left' }};
            font-size: 11px;
            text-transform: uppercase;
            color: #6b7280;
            letter-spacing: 0.5px;
            border-bottom: 2px solid {{ $theme['primary'] ?? '#3b82f6' }}30;
        }

        .items-table th:first-child {
            text-align: {{ $isRtl ? 'left' : 'left' }};
        }

        .items-table th:last-child {
            text-align: {{ $isRtl ? 'right' : 'right' }};
        }

        .items-table td {
            padding: 16px 12px;
            border-bottom: 1px solid #e5e7eb;
        }

        .items-table td:first-child {
            text-align: {{ $isRtl ? 'left' : 'left' }};
        }

        .items-table td:last-child {
            text-align: {{ $isRtl ? 'right' : 'right' }};
        }

        .item-description {
            color: #6b7280;
            font-size: 11px;
            margin-top: 4px;
        }

        .totals {
            width: 300px;
            margin-{{ $isRtl ? 'right' : 'left' }}: auto;
            margin-bottom: 40px;
        }

        .totals table {
            width: 100%;
        }

        .totals td {
            padding: 8px 0;
        }

        .totals td:first-child {
            text-align: {{ $isRtl ? 'left' : 'left' }};
        }

        .totals td:last-child {
            text-align: {{ $isRtl ? 'right' : 'right' }};
        }

        .totals .total-row {
            border-top: 2px solid {{ $theme['primary'] ?? '#3b82f6' }};
            font-weight: bold;
            font-size: 14px;
        }

        .totals .total-row td {
            padding-top: 12px;
            color: {{ $theme['primary'] ?? '#3b82f6' }};
        }

        .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 10px;
        }

        .footer p {
            margin-bottom: 4px;
        }

        .thank-you {
            text-align: center;
            margin-bottom: 40px;
            padding: 20px;
            background-color: {{ $theme['primary'] ?? '#3b82f6' }}10;
            border-radius: 8px;
            border: 1px solid {{ $theme['primary'] ?? '#3b82f6' }}20;
        }

        .thank-you p {
            color: {{ $theme['primary'] ?? '#3b82f6' }};
            font-size: 14px;
            font-weight: bold;
        }

        .logo-img {
            max-height: 48px;
            width: auto;
        }

        .accent-bar {
            border-bottom: 2px solid {{ $theme['primary'] ?? '#3b82f6' }};
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <table width="100%">
        <tr>
            @if($isRtl)
            <td style="text-align: left; vertical-align: top;">
                <div class="invoice-title">
                    <h2>{{ __('Invoice') }}</h2>
                </div>
            </td>
            <td style="vertical-align: top; text-align: right;">
                <div class="company-info">
                    @if($logoUrl)
                        <img src="{{ $logoUrl }}" alt="{{ $company['name'] }}" class="logo-img" style="margin-bottom: 8px;">
                    @else
                        <h1>{{ $company['name'] }}</h1>
                    @endif
                    @if($company['tagline'])
                        <p>{{ $company['tagline'] }}</p>
                    @elseif($company['description'])
                        <p>{{ $company['description'] }}</p>
                    @endif
                    @if($company['email'])
                        <p>{{ $company['email'] }}</p>
                    @endif
                </div>
            </td>
            @else
            <td style="vertical-align: top;">
                <div class="company-info">
                    @if($logoUrl)
                        <img src="{{ $logoUrl }}" alt="{{ $company['name'] }}" class="logo-img" style="margin-bottom: 8px;">
                    @else
                        <h1>{{ $company['name'] }}</h1>
                    @endif
                    @if($company['tagline'])
                        <p>{{ $company['tagline'] }}</p>
                    @elseif($company['description'])
                        <p>{{ $company['description'] }}</p>
                    @endif
                    @if($company['email'])
                        <p>{{ $company['email'] }}</p>
                    @endif
                </div>
            </td>
            <td style="text-align: right; vertical-align: top;">
                <div class="invoice-title">
                    <h2>{{ __('Invoice') }}</h2>
                </div>
            </td>
            @endif
        </tr>
    </table>

    <div class="accent-bar"></div>

    <table width="100%" style="margin-bottom: 30px;">
        <tr>
            @if($isRtl)
            <td style="vertical-align: top; width: 50%; text-align: left;">
                <div class="invoice-details">
                    <table>
                        <tr>
                            <td><strong>{{ $transaction->invoice_number }}#</strong></td>
                            <td>:{{ __('Invoice Number') }}</td>
                        </tr>
                        <tr>
                            <td>{{ $transaction->transaction_date?->format($date_format) ?? $date }}</td>
                            <td>:{{ __('Date') }}</td>
                        </tr>
                        <tr>
                            <td>{{ $transaction->payment_method_label }}</td>
                            <td>:{{ __('Payment Method') }}</td>
                        </tr>
                        <tr>
                            <td>
                                @php
                                    $statusLabels = [
                                        'completed' => __('Paid'),
                                        'pending' => __('Pending'),
                                        'failed' => __('Failed'),
                                        'refunded' => __('Refunded'),
                                    ];
                                @endphp
                                <span class="status-badge status-{{ $transaction->status }}">
                                    {{ $statusLabels[$transaction->status] ?? ucfirst($transaction->status) }}
                                </span>
                            </td>
                            <td>:{{ __('Status') }}</td>
                        </tr>
                    </table>
                </div>
            </td>
            <td style="vertical-align: top; width: 50%; text-align: right;">
                <div class="bill-to">
                    <h3>{{ __('Bill To') }}</h3>
                    <p><strong>{{ $user->name }}</strong></p>
                    <p>{{ $user->email }}</p>
                </div>
            </td>
            @else
            <td style="vertical-align: top; width: 50%;">
                <div class="bill-to">
                    <h3>{{ __('Bill To') }}</h3>
                    <p><strong>{{ $user->name }}</strong></p>
                    <p>{{ $user->email }}</p>
                </div>
            </td>
            <td style="vertical-align: top; width: 50%; text-align: right;">
                <div class="invoice-details">
                    <table>
                        <tr>
                            <td>{{ __('Invoice Number') }}:</td>
                            <td><strong>{{ $transaction->invoice_number }}</strong></td>
                        </tr>
                        <tr>
                            <td>{{ __('Date') }}:</td>
                            <td>{{ $transaction->transaction_date?->format($date_format) ?? $date }}</td>
                        </tr>
                        <tr>
                            <td>{{ __('Payment Method') }}:</td>
                            <td>{{ $transaction->payment_method_label }}</td>
                        </tr>
                        <tr>
                            <td>{{ __('Status') }}:</td>
                            <td>
                                @php
                                    $statusLabels = [
                                        'completed' => __('Paid'),
                                        'pending' => __('Pending'),
                                        'failed' => __('Failed'),
                                        'refunded' => __('Refunded'),
                                    ];
                                @endphp
                                <span class="status-badge status-{{ $transaction->status }}">
                                    {{ $statusLabels[$transaction->status] ?? ucfirst($transaction->status) }}
                                </span>
                            </td>
                        </tr>
                    </table>
                </div>
            </td>
            @endif
        </tr>
    </table>

    <table class="items-table">
        <thead>
            <tr>
                @if($isRtl)
                <th style="width: 120px;">{{ __('Amount') }}</th>
                <th style="width: 100px;">{{ __('Qty') }}</th>
                <th>{{ __('Description') }}</th>
                @else
                <th>{{ __('Description') }}</th>
                <th style="width: 100px;">{{ __('Qty') }}</th>
                <th style="width: 120px;">{{ __('Amount') }}</th>
                @endif
            </tr>
        </thead>
        <tbody>
            <tr>
                @if($isRtl)
                <td>{{ \App\Services\InvoiceService::formatCurrency($transaction->amount, $transaction->currency) }}</td>
                <td>1</td>
                @endif
                <td>
                    @if($plan)
                        <strong>{{ __(':name Plan', ['name' => $plan->name]) }}</strong>
                        @php
                            $periodLabels = [
                                'monthly' => __('Monthly'),
                                'yearly' => __('Yearly'),
                                'lifetime' => __('Lifetime'),
                            ];
                            $periodLabel = $periodLabels[$plan->billing_period ?? 'monthly'] ?? ucfirst($plan->billing_period ?? 'Monthly');
                        @endphp
                        <div class="item-description">
                            {{ __(':period Subscription', ['period' => $periodLabel]) }}
                            @if($subscription && $subscription->starts_at)
                                <br>{{ __('Period') }}: {{ $subscription->starts_at->format('M j, Y') }} - {{ $subscription->renewal_at?->format('M j, Y') ?? __('Ongoing') }}
                            @endif
                        </div>
                    @else
                        <strong>{{ $transaction->type_label }}</strong>
                        <div class="item-description">
                            {{ __('Transaction ID') }}: {{ $transaction->transaction_id }}
                        </div>
                    @endif
                </td>
                @if(!$isRtl)
                <td>1</td>
                <td>{{ \App\Services\InvoiceService::formatCurrency($transaction->amount, $transaction->currency) }}</td>
                @endif
            </tr>
        </tbody>
    </table>

    <div class="totals">
        <table>
            <tr>
                @if($isRtl)
                <td>{{ \App\Services\InvoiceService::formatCurrency($transaction->amount, $transaction->currency) }}</td>
                <td>:{{ __('Subtotal') }}</td>
                @else
                <td>{{ __('Subtotal') }}:</td>
                <td>{{ \App\Services\InvoiceService::formatCurrency($transaction->amount, $transaction->currency) }}</td>
                @endif
            </tr>
            <tr class="total-row">
                @if($isRtl)
                <td>{{ \App\Services\InvoiceService::formatCurrency($transaction->amount, $transaction->currency) }}</td>
                <td>:{{ __('Total') }}</td>
                @else
                <td>{{ __('Total') }}:</td>
                <td>{{ \App\Services\InvoiceService::formatCurrency($transaction->amount, $transaction->currency) }}</td>
                @endif
            </tr>
        </table>
    </div>

    @if($transaction->status === 'completed')
        <div class="thank-you">
            <p>{{ __('Thank you for your payment!') }}</p>
        </div>
    @endif

    <div class="footer">
        <p>{{ __('This invoice was generated automatically on :date', ['date' => $date]) }}</p>
    </div>
</body>
</html>
