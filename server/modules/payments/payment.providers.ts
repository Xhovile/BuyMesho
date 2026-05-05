import { PaymentGatewayRegistry } from '../../../src/modules/payments/paymentGateway';
import { flutterwaveProvider } from '../../../src/modules/payments/providers/flutterwave';
import { paychanguProvider } from '../../../src/modules/payments/providers/paychangu';
import { paystackProvider } from '../../../src/modules/payments/providers/paystack';

export function createPaymentProviderRegistry(): PaymentGatewayRegistry {
  const registry = new PaymentGatewayRegistry();
  registry.register(paystackProvider);
  registry.register(flutterwaveProvider);
  registry.register(paychanguProvider);
  return registry;
}
