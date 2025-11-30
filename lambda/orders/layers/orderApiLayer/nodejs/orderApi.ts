export enum PaymentType {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  CASH = 'CASH',
}

export enum ShippingType {
  ECONOMIC = 'ECONOMIC',
  URGENT = 'URGENT',
}

export enum CarrierType {
  CORREIOS = 'CORREIOS',
  FEDEX = 'FEDEX',
}

export interface OrderResquest {
  email: string,
  productsIds: string[],
  payment: PaymentType,
  shipping: {
    type: ShippingType,
    carrier: CarrierType,
  },
}

export interface OrderProductResponse {
  code: string,
  price: number,
}

export interface OrderResponse {
  email: string,
  id: string,
  createdAt: number,
  billing: {
    payment: PaymentType,
    totalPrice: number,
  },
  shipping: {
    type: ShippingType,
    carrier: CarrierType,
  },
  products?: OrderProductResponse[],
}
