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

  async getOrderEventsByEmail(email: string): Promise<OrderEvent[]> {
    const result = await this.db.query({
      TableName: this.eventTable,
      IndexName: 'emailIndex',
      KeyConditionExpression: 'email = :email and begins_with(eventType, :prefix)',
      ExpressionAttributeValues: {
        ':email': email,
        ':prefix': 'ORDER_'
      }
    }).promise();

    return result.Items as OrderEvent[];
  }

  async getOrderEventsByEmailAndEventType(email: string, eventType: string): Promise<OrderEvent[]> {
    const result = await this.db.query({
      TableName: this.eventTable,
      IndexName: 'emailIndex',
      KeyConditionExpression: 'email = :email and eventType = :eventType',
      ExpressionAttributeValues: {
        ':email': email,
        ':eventType': eventType
      }
    }).promise();

    return result.Items as OrderEvent[];
  }
}
