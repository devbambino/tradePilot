import { HummingbotPlugin } from '..';
import { OrderParams } from '../types';

export async function placeOrder(
  plugin: HummingbotPlugin,
  params: OrderParams
): Promise<string> {
  return plugin.orderService.placeOrder(params);
}

export async function cancelOrder(
  plugin: HummingbotPlugin,
  exchange: string,
  orderId: string
): Promise<boolean> {
  return plugin.orderService.cancelOrder(exchange, orderId);
}

export async function cancelAllOrders(
  plugin: HummingbotPlugin,
  exchange: string
): Promise<void> {
  const orders = await plugin.orderService.getOpenOrders(exchange);
  await Promise.all(
    orders.map(order => {
      const orderId = (order as any).id || order.clientOrderId;
      if (orderId) {
        return plugin.orderService.cancelOrder(exchange, orderId);
      }
      return Promise.resolve();
    })
  );
}
