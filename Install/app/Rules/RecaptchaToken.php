<?php

namespace App\Rules;

use App\Models\SystemSetting;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use ReCaptcha\ReCaptcha;

class RecaptchaToken implements ValidationRule
{
    protected float $minScore;

    public function __construct(float $minScore = 0.5)
    {
        $this->minScore = $minScore;
    }

    /**
     * Run the validation rule.
     *
     * @param  \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        // Skip validation if reCAPTCHA is disabled
        if (! SystemSetting::get('recaptcha_enabled', false)) {
            return;
        }

        $secretKey = SystemSetting::get('recaptcha_secret_key');
        if (empty($secretKey)) {
            $fail('reCAPTCHA is not configured properly.');

            return;
        }

        $recaptcha = new ReCaptcha($secretKey);
        $response = $recaptcha
            ->setExpectedHostname(request()->getHost())
            ->verify($value, request()->ip());

        if (! $response->isSuccess()) {
            $fail('reCAPTCHA verification failed. Please try again.');

            return;
        }

        // v3 score check (0.0 = bot, 1.0 = human)
        if ($response->getScore() !== null && $response->getScore() < $this->minScore) {
            $fail('reCAPTCHA verification failed. Please try again.');
        }
    }
}
