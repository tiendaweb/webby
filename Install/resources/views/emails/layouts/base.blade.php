<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{{ $subject ?? $appName }}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        /* Reset styles */
        body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
        }
        body {
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
        }
        a[x-apple-data-detectors] {
            color: inherit !important;
            text-decoration: none !important;
            font-size: inherit !important;
            font-family: inherit !important;
            font-weight: inherit !important;
            line-height: inherit !important;
        }
        @media only screen and (max-width: 620px) {
            .email-container {
                width: 100% !important;
                max-width: 100% !important;
            }
            .mobile-padding {
                padding-left: 20px !important;
                padding-right: 20px !important;
            }
            .mobile-stack {
                display: block !important;
                width: 100% !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <!-- Preview text -->
    <div style="display: none; max-height: 0; overflow: hidden;">
        {{ $previewText ?? '' }}
        &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;
    </div>

    <!-- Main wrapper -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
        <tr>
            <td style="padding: 40px 10px;">
                <!-- Email container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" class="email-container" style="max-width: 600px; margin: 0 auto;">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: {{ $primaryColor }}; padding: 30px 40px; border-radius: 12px 12px 0 0; text-align: center;">
                            @if(!empty($logoUrl))
                                <img src="{{ $logoUrl }}" alt="{{ $appName }}" style="max-height: 48px; width: auto; display: inline-block;">
                            @else
                                <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: {{ $primaryForeground }}; letter-spacing: -0.5px;">
                                    {{ $appName }}
                                </h1>
                            @endif
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 40px; border-left: 1px solid #e4e4e7; border-right: 1px solid #e4e4e7;">
                            @yield('content')
                        </td>
                    </tr>

                    <!-- Divider with gradient -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 0 40px; border-left: 1px solid #e4e4e7; border-right: 1px solid #e4e4e7;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="height: 1px; background: linear-gradient(to right, transparent, {{ $primaryColor }}, transparent);"></td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 30px 40px 40px; border-radius: 0 0 12px 12px; border-left: 1px solid #e4e4e7; border-right: 1px solid #e4e4e7; border-bottom: 1px solid #e4e4e7;">
                            <p style="margin: 0; font-size: 13px; line-height: 20px; color: #71717a; text-align: center;">
                                &copy; {{ date('Y') }} {{ $appName }}. {{ __('All rights reserved.') }}
                            </p>
                        </td>
                    </tr>

                    <!-- Shadow effect -->
                    <tr>
                        <td style="height: 8px; background: linear-gradient(to bottom, rgba(0,0,0,0.05), transparent); border-radius: 0 0 12px 12px;"></td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
