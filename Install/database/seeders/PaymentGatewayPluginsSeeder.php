<?php

namespace Database\Seeders;

use App\Models\Plugin;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class PaymentGatewayPluginsSeeder extends Seeder
{
    /**
     * Core plugins that are always installed and cannot be deleted.
     */
    public const CORE_PLUGINS = ['bank-transfer', 'paypal'];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Core payment gateways (always installed)
        $plugins = [
            [
                'name' => 'Bank Transfer',
                'slug' => 'bank-transfer',
                'type' => 'payment_gateway',
                'class' => 'App\Plugins\PaymentGateways\BankTransferPlugin',
                'version' => '1.0.0',
                'status' => 'inactive',
                'config' => null,
                'metadata' => $this->getPluginMetadata('BankTransfer'),
                'migrations' => null,
                'installed_at' => now(),
            ],
            [
                'name' => 'PayPal',
                'slug' => 'paypal',
                'type' => 'payment_gateway',
                'class' => 'App\Plugins\PaymentGateways\PayPalPlugin',
                'version' => '1.0.0',
                'status' => 'inactive',
                'config' => null,
                'metadata' => $this->getPluginMetadata('PayPal'),
                'migrations' => null,
                'installed_at' => now(),
            ],
        ];

        // Add development payment gateways in local environment
        if (app()->environment('local')) {
            $developmentPlugins = [
                [
                    'name' => 'Stripe',
                    'slug' => 'stripe',
                    'type' => 'payment_gateway',
                    'class' => 'App\Plugins\PaymentGateways\StripePlugin',
                    'version' => '1.0.0',
                    'status' => 'inactive',
                    'config' => null,
                    'metadata' => $this->getPluginMetadata('Stripe'),
                    'migrations' => null,
                    'installed_at' => now(),
                ],
                [
                    'name' => 'Paystack',
                    'slug' => 'paystack',
                    'type' => 'payment_gateway',
                    'class' => 'App\Plugins\PaymentGateways\PaystackPlugin',
                    'version' => '1.0.0',
                    'status' => 'inactive',
                    'config' => null,
                    'metadata' => $this->getPluginMetadata('Paystack'),
                    'migrations' => null,
                    'installed_at' => now(),
                ],
                [
                    'name' => 'Razorpay',
                    'slug' => 'razorpay',
                    'type' => 'payment_gateway',
                    'class' => 'App\Plugins\PaymentGateways\RazorpayPlugin',
                    'version' => '1.0.0',
                    'status' => 'inactive',
                    'config' => null,
                    'metadata' => $this->getPluginMetadata('Razorpay'),
                    'migrations' => null,
                    'installed_at' => now(),
                ],
                [
                    'name' => 'Crypto.com Pay',
                    'slug' => 'cryptocom',
                    'type' => 'payment_gateway',
                    'class' => 'App\Plugins\PaymentGateways\CryptoComPlugin',
                    'version' => '1.0.0',
                    'status' => 'inactive',
                    'config' => null,
                    'metadata' => $this->getPluginMetadata('CryptoCom'),
                    'migrations' => null,
                    'installed_at' => now(),
                ],
            ];

            $plugins = array_merge($plugins, $developmentPlugins);
        }

        // Install plugins using updateOrCreate for idempotency
        foreach ($plugins as $pluginData) {
            Plugin::updateOrCreate(
                ['slug' => $pluginData['slug']],
                $pluginData
            );

            $this->command?->info("Installed: {$pluginData['name']}");
        }

        $this->command?->info('Total payment gateway plugins: '.Plugin::byType('payment_gateway')->count());
    }

    /**
     * Get plugin metadata from plugin.json file.
     */
    private function getPluginMetadata(string $pluginDir): ?array
    {
        $path = app_path("Plugins/PaymentGateways/{$pluginDir}/plugin.json");

        if (! File::exists($path)) {
            return null;
        }

        return json_decode(File::get($path), true);
    }
}
