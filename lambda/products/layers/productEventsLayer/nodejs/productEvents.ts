export enum ProductEventType {
  PRODUCT_CREATED = 'PRODUCT_CREATED',
  PRODUCT_UPDATED = 'PRODUCT_UPDATED',
  PRODUCT_DELETED = 'PRODUCT_DELETED',
}

export interface ProductEventInterface {
  requestId: string;
  eventType: ProductEventType;
  productId: string;
  productCode: string;
  productPrice: number;
  email: string;
}
