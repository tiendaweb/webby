@extends('emails.layouts.base')

@section('content')
    <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #18181b;">
        {{ __('Great News!') }}
    </h2>

    <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #3f3f46;">
        {!! __('Your subscription has been extended by <strong>:days days</strong>.', ['days' => $daysExtended]) !!}
    </p>

    @include('emails.partials.details-box', [
        'title' => __('Subscription Details'),
        'details' => [
            __('Plan') => $planName,
            __('Days Extended') => __(':days days', ['days' => $daysExtended]),
            __('New Expiration Date') => $newExpirationDate
        ],
        'primaryColor' => $primaryColor
    ])

    <p style="margin: 24px 0 0; font-size: 14px; line-height: 22px; color: #71717a;">
        {{ __('Thank you for being a valued customer!') }}
    </p>
@endsection
