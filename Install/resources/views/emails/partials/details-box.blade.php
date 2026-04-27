{{--
    Email Details Box Partial

    Usage: @include('emails.partials.details-box', [
        'title' => 'Payment Details',
        'details' => [
            'Amount' => '$29.99',
            'Transaction ID' => 'TXN123',
            'Date' => 'January 15, 2024'
        ],
        'primaryColor' => '#3b82f6'
    ])
--}}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0; background-color: #fafafa; border-radius: 8px; border: 1px solid #e4e4e7;">
    @if(isset($title))
    <tr>
        <td style="padding: 16px 20px 12px; border-bottom: 1px solid #e4e4e7;">
            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #18181b;">{{ $title }}</p>
        </td>
    </tr>
    @endif
    <tr>
        <td style="padding: 16px 20px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                @foreach($details as $label => $value)
                <tr>
                    <td style="padding: 6px 0; width: 40%;">
                        <span style="font-size: 13px; color: #71717a;">{{ $label }}</span>
                    </td>
                    <td style="padding: 6px 0; text-align: right;">
                        <span style="font-size: 13px; font-weight: 500; color: #18181b;">{{ $value }}</span>
                    </td>
                </tr>
                @endforeach
            </table>
        </td>
    </tr>
</table>
