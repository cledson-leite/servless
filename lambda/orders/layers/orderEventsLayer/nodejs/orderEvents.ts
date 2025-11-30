export enum OrderEventType {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_DELETED = 'ORDER_DELETED',
}
export interface OrderEvent {
  eventType: OrderEventType;
  data: OrderEventData
}

export interface OrderEventData {
  email: string;
  orderId: string;
  shipping: {
    type: string;
    currier: string;
  },
  billing: {
    payment: string;
    total: number;
  },
  productCodes?: string[];
  requestId: string;
}
