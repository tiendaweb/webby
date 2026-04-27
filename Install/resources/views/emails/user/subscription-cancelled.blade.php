@extends('emails.layouts.base')

@section('content')
    <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #18181b;">
        {{ __('Subscription Cancelled') }}
    </h2>

    <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #3f3f46;">
        {{ __('Your subscription has been cancelled.') }}
    </p>

    @include('emails.partials.details-box', [
        'title' => __('Subscription Details'),
        'details' => [
            __('Plan') => $planName,
            __('Access Until') => $accessUntil
        ],
        'primaryColor' => $primaryColor
    ])

    <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #3f3f46;">
        {{ __('You will continue to have access to your subscription benefits until the end date shown above.') }}
    </p>

    @include('emails.partials.button', [
        'url' => $dashboardUrl,
        'text' => __('Resubscribe'),
        'primaryColor' => $primaryColor,
        'primaryForeground' => $primaryForeground
    ])

    <p style="margin: 24px 0 0; font-size: 14px; line-height: 22px; color: #71717a;">
        {{ __('We hope to see you again soon!') }}
    </p>
@endsection
