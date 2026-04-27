@extends('emails.layouts.base')

@section('content')
    <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #18181b;">
        {{ __('Subscription Expired') }}
    </h2>

    <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #3f3f46;">
        {!! __('Your subscription to <strong>:planName</strong> has expired.', ['planName' => $planName]) !!}
    </p>

    <p style="margin: 0 0 24px; font-size: 15px; line-height: 24px; color: #3f3f46;">
        {{ __('To continue enjoying uninterrupted access to our services, please renew your subscription.') }}
    </p>

    @include('emails.partials.button', [
        'url' => $dashboardUrl,
        'text' => __('Renew Subscription'),
        'primaryColor' => $primaryColor,
        'primaryForeground' => $primaryForeground
    ])

    <p style="margin: 24px 0 0; font-size: 14px; line-height: 22px; color: #71717a;">
        {{ __('Thank you for being a valued customer!') }}
    </p>
@endsection
