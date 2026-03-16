export type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  priceInCents: number;
}

export interface Order {
  orderId: string;
  customerId: string;
  items: OrderItem[];
  totalInCents: number;
  status: OrderStatus;
  createdAt: string;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createSampleOrder(): Order {
  const items: OrderItem[] = [
    {
      productId: "prod-1",
      name: "Mechanical Keyboard",
      quantity: 1,
      priceInCents: 3500,
    },
    { productId: "prod-2", name: "USB-C Hub", quantity: 2, priceInCents: 8990 },
  ];

  const totalInCents = items.reduce(
    (sum, item) => sum + item.priceInCents * item.quantity,
    0,
  );

  return {
    orderId: generateId(),
    customerId: `customer-${Math.floor(Math.random() * 100)}`,
    items,
    totalInCents,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };
}
