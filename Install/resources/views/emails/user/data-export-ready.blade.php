@extends('emails.layouts.base')

@section('content')
    <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #18181b;">
        {{ __('Your Data Export is Ready') }}
    </h2>

    <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #3f3f46;">
        {{ __('Hello :name,', ['name' => $userName]) }}
    </p>

    <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #3f3f46;">
        {{ __('Your personal data export has been prepared and is ready for download.') }}
    </p>

    <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #3f3f46;">
        {{ __('The export includes your profile information, projects, subscriptions, and activity history.') }}
    </p>

    @include('emails.partials.button', [
        'url' => $downloadUrl,
        'text' => __('Download Your Data'),
        'primaryColor' => $primaryColor,
        'primaryForeground' => $primaryForeground
    ])

    <p style="margin: 24px 0 0; font-size: 13px; line-height: 20px; color: #71717a; padding: 16px; background-color: #fafafa; border-radius: 8px; border: 1px solid #e4e4e7;">
        {!! __('<strong>Important:</strong> This download link will expire on :expiresAt. Please download your data before then.', ['expiresAt' => $expiresAt]) !!}
    </p>

    <p style="margin: 24px 0 0; font-size: 14px; line-height: 22px; color: #71717a;">
        {{ __('If you did not request this export, please contact our support team immediately.') }}
    </p>
@endsection
