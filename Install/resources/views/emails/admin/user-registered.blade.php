@extends('emails.layouts.base')

@section('content')
    <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #18181b;">
        {{ __('New User Registered') }}
    </h2>

    <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #3f3f46;">
        {{ __('A new user has registered on your platform.') }}
    </p>

    @include('emails.partials.details-box', [
        'title' => __('User Details'),
        'details' => [
            __('Name') => $userName,
            __('Email') => $userEmail,
            __('Registered At') => $registeredAt
        ],
        'primaryColor' => $primaryColor
    ])

    @include('emails.partials.button', [
        'url' => $usersUrl,
        'text' => __('View Users'),
        'primaryColor' => $primaryColor,
        'primaryForeground' => $primaryForeground
    ])
@endsection
