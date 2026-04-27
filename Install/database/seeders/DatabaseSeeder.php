<?php

namespace Database\Seeders;

use App\Models\Plan;
use App\Models\ReferralCode;
use App\Models\ReferralCreditTransaction;
use App\Models\Subscription;
use App\Models\User;
use App\Models\UserAiSettings;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed core data first
        $this->call([
            BuilderSeeder::class,
            PlanSeeder::class,
            TemplateSeeder::class,
            SystemSettingSeeder::class,
            PaymentGatewayPluginsSeeder::class,
            LanguageSeeder::class,
            LandingPageSeeder::class,
        ]);

        // Get the Pro plan for admin subscription
        $proPlan = Plan::where('slug', 'pro')->first();

        // Create admin user
        $admin = User::firstOrCreate(
            ['email' => 'admin@webby.com'],
            [
                'name' => 'Admin',
                'password' => bcrypt('password'),
                'role' => 'admin',
                'email_verified_at' => now(),
                'referral_credit_balance' => 75.50,
                'plan_id' => $proPlan?->id,
            ]
        );

        // Create 1-month Pro subscription for admin
        if ($proPlan) {
            Subscription::firstOrCreate(
                ['user_id' => $admin->id, 'status' => Subscription::STATUS_ACTIVE],
                [
                    'plan_id' => $proPlan->id,
                    'amount' => $proPlan->price,
                    'payment_method' => Subscription::PAYMENT_MANUAL,
                    'starts_at' => now(),
                    'renewal_at' => now()->addMonth(),
                    'approved_at' => now(),
                    'approved_by' => $admin->id,
                    'admin_notes' => 'Seeded subscription for development',
                ]
            );

            // Ensure admin has the pro plan assigned
            $admin->update(['plan_id' => $proPlan->id]);
        }

        // Ensure admin has AI settings with sound enabled
        UserAiSettings::firstOrCreate(
            ['user_id' => $admin->id],
            [
                'sounds_enabled' => true,
                'sound_style' => 'playful',
                'sound_volume' => 100,
            ]
        );

        // Create referral code for admin
        ReferralCode::firstOrCreate(
            ['user_id' => $admin->id],
            [
                'code' => ReferralCode::generateUniqueCode(),
                'is_active' => true,
                'total_clicks' => 150,
                'total_signups' => 12,
                'total_conversions' => 5,
                'total_earnings' => 145.00,
            ]
        );

        // Create sample referral credit transactions for admin
        $transactions = [
            ['amount' => 5.00, 'type' => ReferralCreditTransaction::TYPE_SIGNUP_BONUS, 'description' => 'Signup bonus for referring john@example.com', 'days_ago' => 30],
            ['amount' => 29.00, 'type' => ReferralCreditTransaction::TYPE_PURCHASE_COMMISSION, 'description' => '20% commission on Pro Plan purchase', 'days_ago' => 25],
            ['amount' => 5.00, 'type' => ReferralCreditTransaction::TYPE_SIGNUP_BONUS, 'description' => 'Signup bonus for referring jane@example.com', 'days_ago' => 20],
            ['amount' => 14.50, 'type' => ReferralCreditTransaction::TYPE_PURCHASE_COMMISSION, 'description' => '20% commission on Starter Plan purchase', 'days_ago' => 15],
            ['amount' => -29.00, 'type' => ReferralCreditTransaction::TYPE_BILLING_REDEMPTION, 'description' => 'Used for Pro Plan subscription', 'days_ago' => 10],
            ['amount' => 5.00, 'type' => ReferralCreditTransaction::TYPE_SIGNUP_BONUS, 'description' => 'Signup bonus for referring mike@example.com', 'days_ago' => 7],
            ['amount' => 58.00, 'type' => ReferralCreditTransaction::TYPE_PURCHASE_COMMISSION, 'description' => '20% commission on Business Plan purchase', 'days_ago' => 5],
            ['amount' => -12.00, 'type' => ReferralCreditTransaction::TYPE_ADMIN_ADJUSTMENT, 'description' => 'Adjustment for refunded purchase', 'days_ago' => 3],
        ];

        $balance = 0;
        foreach ($transactions as $txn) {
            $balance += $txn['amount'];
            ReferralCreditTransaction::create([
                'user_id' => $admin->id,
                'amount' => $txn['amount'],
                'balance_after' => $balance,
                'type' => $txn['type'],
                'description' => $txn['description'],
                'created_at' => now()->subDays($txn['days_ago']),
                'updated_at' => now()->subDays($txn['days_ago']),
            ]);
        }

        // Seed Reverb settings for local development
        if (app()->environment('local')) {
            $this->call(ReverbSeeder::class);
        }

        // Demo mode seeder (configures demo-specific settings)
        // Only runs when APP_ENV=local AND APP_DEMO=true
        $this->call(DemoSeeder::class);
    }
}
