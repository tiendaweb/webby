@extends('emails.layouts.base')

@section('content')
    <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #18181b;">
        {{ __('Account Deletion Scheduled') }}
    </h2>

    <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #3f3f46;">
        {{ __('Hello :name,', ['name' => $userName]) }}
    </p>

    <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #3f3f46;">
        {{ __('We have received your request to delete your account. Your account and all associated data will be permanently deleted on:') }}
    </p>

    <p style="margin: 0 0 24px; font-size: 18px; font-weight: 600; color: #18181b; text-align: center; padding: 16px; background-color: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
        {{ $deletionDate }}
    </p>

    <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #3f3f46;">
        {!! __('You have <strong>:days days</strong> to cancel this request if you change your mind.', ['days' => $graceDays]) !!}
    </p>

    @include('emails.partials.button', [
        'url' => $cancelUrl,
        'text' => __('Cancel Account Deletion'),
        'primaryColor' => $primaryColor,
        'primaryForeground' => $primaryForeground
    ])

    <p style="margin: 24px 0 0; font-size: 13px; line-height: 20px; color: #71717a; padding: 16px; background-color: #fafafa; border-radius: 8px; border: 1px solid #e4e4e7;">
        {!! __('<strong>Warning:</strong> Once your account is deleted, this action cannot be undone. All your data including projects, subscriptions, and activity history will be permanently removed.') !!}
    </p>

    <p style="margin: 24px 0 0; font-size: 14px; line-height: 22px; color: #71717a;">
        {{ __('If you did not request this deletion, please click the cancel button immediately and change your password.') }}
    </p>
@endsection
