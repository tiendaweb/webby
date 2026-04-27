@extends('emails.layouts.base')

@section('content')
    <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #18181b;">
        {{ __('User Account Deleted') }}
    </h2>

    <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #3f3f46;">
        {{ __('Hello Admin,') }}
    </p>

    <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #3f3f46;">
        {{ __('A user account has been permanently deleted from the system.') }}
    </p>

    @include('emails.partials.details-box', [
        'title' => __('Deleted User'),
        'details' => [
            __('Name') => $userName,
            __('Email') => $userEmail,
            __('Deleted At') => $deletedAt
        ],
        'primaryColor' => $primaryColor
    ])

    <p style="margin: 0; font-size: 14px; line-height: 22px; color: #71717a;">
        {{ __('This deletion was processed automatically after the grace period expired. All associated user data has been removed in compliance with data protection requirements.') }}
    </p>
@endsection
