@extends('emails.layouts.base')

@section('content')
    <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #18181b;">
        {{ __('Payment Confirmed') }}
    </h2>

    <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #3f3f46;">
        {{ __('Thank you! Your payment has been processed successfully.') }}
    </p>

    @include('emails.partials.details-box', [
        'title' => __('Payment Details'),
        'details' => [
            __('Amount') => $amount,
            __('Transaction ID') => $transactionId,
            __('Plan') => $planName,
            __('Date') => $transactionDate
        ],
        'primaryColor' => $primaryColor
    ])

    <p style="margin: 24px 0 0; font-size: 14px; line-height: 22px; color: #71717a;">
        {{ __('Thank you for your continued support!') }}
    </p>
@endsection
