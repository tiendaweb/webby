{{--
    Email Button Partial

    Usage: @include('emails.partials.button', [
        'url' => 'https://example.com',
        'text' => 'Click Here',
        'primaryColor' => '#3b82f6',
        'primaryForeground' => '#ffffff'
    ])
--}}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
    <tr>
        <td align="center">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{ $url }}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="17%" stroke="f" fillcolor="{{ $primaryColor }}">
                <w:anchorlock/>
                <center style="color:{{ $primaryForeground }};font-family:sans-serif;font-size:14px;font-weight:bold;">{{ $text }}</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <a href="{{ $url }}" target="_blank" style="display: inline-block; background-color: {{ $primaryColor }}; color: {{ $primaryForeground }}; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; text-align: center; mso-hide: all;">
                {{ $text }}
            </a>
            <!--<![endif]-->
        </td>
    </tr>
</table>
