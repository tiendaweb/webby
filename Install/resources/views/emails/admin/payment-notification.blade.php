@extends('emails.layouts.base')

@section('content')
    <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #18181b;">
        {{ $title }}
    </h2>

    <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #3f3f46;">
        {{ $introLine }}
    </p>

    @if($customerName || $customerEmail)
    @include('emails.partials.details-box', [
        'title' => __('Customer'),
        'details' => array_filter([
            __('Name') => $customerName,
            __('Email') => $customerEmail
        ]),
        'primaryColor' => $primaryColor
    ])
    @endif

    @if(!empty($details))
    @include('emails.partials.details-box', [
        'title' => $detailsTitle ?? __('Details'),
        'details' => $details,
        'primaryColor' => $primaryColor
    ])
    @endif

    @if($actionUrl)
    @include('emails.partials.button', [
        'url' => $actionUrl,
        'text' => $actionText ?? __('View Dashboard'),
        'primaryColor' => $primaryColor,
        'primaryForeground' => $primaryForeground
    ])
    @endif
@endsection
