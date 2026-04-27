@extends('emails.layouts.base')

@section('content')
    <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #18181b;">
        {{ __('Account Deletion Cancelled') }}
    </h2>

    <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #3f3f46;">
        {{ __('Hello :name,', ['name' => $userName]) }}
    </p>

    <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #3f3f46;">
        {{ __('Good news! Your account deletion request has been successfully cancelled.') }}
    </p>

    <p style="margin: 0 0 24px; font-size: 15px; line-height: 24px; color: #3f3f46;">
        {{ __('Your account and all your data will remain intact. You can continue using all features as usual.') }}
    </p>

    <p style="margin: 24px 0 0; font-size: 14px; line-height: 22px; color: #71717a;">
        {{ __('If you did not cancel this request, please contact our support team immediately and consider changing your password.') }}
    </p>
@endsection
