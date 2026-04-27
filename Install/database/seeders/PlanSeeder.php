<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Free',
                'slug' => 'free',
                'description' => 'Get started with basic features',
                'price' => 0,
                'billing_period' => 'monthly',
                'features' => [
                    ['name' => 'Basic AI assistance', 'included' => true],
                    ['name' => 'Community support', 'included' => true],
                    ['name' => 'Priority support', 'included' => false],
                    ['name' => 'Custom templates', 'included' => false],
                    ['name' => 'Dedicated builders', 'included' => false],
                ],
                'max_projects' => 3,
                'monthly_build_credits' => 10000,
                'allow_user_ai_api_key' => false,
                'enable_subdomains' => false,
                'max_subdomains_per_user' => null,
                'allow_private_visibility' => false,
                'enable_custom_domains' => false,
                'max_custom_domains_per_user' => null,
                'enable_firebase' => false,
                'allow_user_firebase_config' => false,
                'enable_file_storage' => false,
                'max_storage_mb' => null,
                'max_file_size_mb' => 5,
                'allowed_file_types' => null,
                'is_active' => true,
                'is_popular' => false,
                'sort_order' => 1,
            ],
            [
                'name' => 'Pro',
                'slug' => 'pro',
                'description' => 'For professionals and growing teams',
                'price' => 19.99,
                'billing_period' => 'monthly',
                'features' => [
                    ['name' => 'Advanced AI assistance', 'included' => true],
                    ['name' => 'Priority support', 'included' => true],
                    ['name' => 'Custom templates', 'included' => true],
                    ['name' => 'Dedicated builders', 'included' => false],
                    ['name' => 'SLA guarantee', 'included' => false],
                ],
                'max_projects' => null,
                'monthly_build_credits' => 500000,
                'allow_user_ai_api_key' => true,
                'enable_subdomains' => true,
                'max_subdomains_per_user' => 5,
                'allow_private_visibility' => true,
                'enable_custom_domains' => true,
                'max_custom_domains_per_user' => 3,
                'enable_firebase' => true,
                'allow_user_firebase_config' => false,
                'enable_file_storage' => true,
                'max_storage_mb' => 500,
                'max_file_size_mb' => 10,
                'allowed_file_types' => null,
                'is_active' => true,
                'is_popular' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Enterprise',
                'slug' => 'enterprise',
                'description' => 'For large organizations',
                'price' => 99.99,
                'billing_period' => 'monthly',
                'features' => [
                    ['name' => 'Advanced AI assistance', 'included' => true],
                    ['name' => 'Priority support', 'included' => true],
                    ['name' => 'Custom templates', 'included' => true],
                    ['name' => 'Dedicated builders', 'included' => true],
                    ['name' => 'SLA guarantee', 'included' => true],
                    ['name' => 'Custom integrations', 'included' => true],
                    ['name' => 'Team management', 'included' => true],
                ],
                'max_projects' => null,
                'monthly_build_credits' => -1,
                'allow_user_ai_api_key' => true,
                'enable_subdomains' => true,
                'max_subdomains_per_user' => null,
                'allow_private_visibility' => true,
                'enable_custom_domains' => true,
                'max_custom_domains_per_user' => null,
                'enable_firebase' => true,
                'allow_user_firebase_config' => true,
                'enable_file_storage' => true,
                'max_storage_mb' => null,
                'max_file_size_mb' => 50,
                'allowed_file_types' => null,
                'is_active' => true,
                'is_popular' => false,
                'sort_order' => 3,
            ],
        ];

        foreach ($plans as $planData) {
            Plan::firstOrCreate(
                ['slug' => $planData['slug']],
                $planData
            );
        }
    }
}
