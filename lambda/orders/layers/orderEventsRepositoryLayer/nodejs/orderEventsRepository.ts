import { DocumentClient } from "aws-sdk/clients/dynamodb";

export interface OrderEventInfo {
      orderId: string;
      productCodes: string[];
      messageId: string;
    }

export interface OrderEvent {
    pk: string;
    sk: string;
    ttl: number;
    email: string;
    createdAt: number;
    requestId: string;
    eventType: string;
    info: OrderEventInfo;
}

export class OrderEventRepository {
  constructor(
    private readonly eventTable: string,
    private readonly db: DocumentClient
  ){};

  createOrderEvent(orderEvent: OrderEvent) {
    return this.db.put({
      TableName: this.eventTable,
      Item: orderEvent
    }).promise();
  }
}
