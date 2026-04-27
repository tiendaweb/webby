@extends('emails.layouts.base')

@section('content')
    <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #18181b;">
        {{ __('New Bank Transfer Payment') }}
    </h2>

    <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #3f3f46;">
        {{ __('A new bank transfer payment is awaiting your approval.') }}
    </p>

    @include('emails.partials.details-box', [
        'title' => __('Customer Details'),
        'details' => [
            __('Name') => $customerName,
            __('Email') => $customerEmail
        ],
        'primaryColor' => $primaryColor
    ])

    @include('emails.partials.details-box', [
        'title' => __('Payment Details'),
        'details' => [
            __('Plan') => $planName,
            __('Amount') => $amount,
            __('Subscription ID') => $subscriptionId
        ],
        'primaryColor' => $primaryColor
    ])

    @include('emails.partials.button', [
        'url' => $reviewUrl,
        'text' => __('Review Payment'),
        'primaryColor' => $primaryColor,
        'primaryForeground' => $primaryForeground
    ])

    <p style="margin: 24px 0 0; font-size: 14px; line-height: 22px; color: #71717a;">
        {{ __('Please review and approve or reject this payment.') }}
    </p>
@endsection
