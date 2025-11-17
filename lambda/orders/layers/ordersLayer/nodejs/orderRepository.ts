import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { v4 as uuidv4 } from 'uuid';

export interface OrderProduct {
  code: string;
  price: number;
}

export interface Order {
  pk: string;
  sk?: string;
  createdAt?: number;
  shipping: {
    type: 'URGENT' | 'ECONOMIC';
    carrier: 'CORREIOS' | 'FEDEX';
  },
  billing: {
    payment: 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH';
    totalPrice: number;
  },
  products: OrderProduct[];
}

export class OrderRepository {
  constructor(private readonly tableName: string, private readonly dbClient: DocumentClient) {
    this.tableName = tableName;
    this.dbClient = dbClient;
  }

  async createOrder(order: Order): Promise<Order> {
    const timestamp = Date.now();
    const orderId = uuidv4();

    const newOrder: Order = {
      ...order,
      sk: orderId,
      createdAt: timestamp,
    };
    await this.dbClient.put({
      TableName: this.tableName,
      Item: newOrder,
    }).promise();

    return newOrder;
  }

  async getAllOrder(): Promise<Order[]> {
    const result = await this.dbClient.scan({
      TableName: this.tableName,
    }).promise();

    return result.Items as Order[];
  }

  async getOrderByEmail(email: string): Promise<Order[]> {
    //usar quando for filtrar por pk ou por indexação
    const result = await this.dbClient.query({
      TableName: this.tableName,
      //condição simples
      KeyConditionExpression: 'pk = :email',
      ExpressionAttributeValues: {
        ':email': email,
      },
    }).promise();

    return result.Items as Order[];
  }

  async getOrder(email: string, orderId: string): Promise<Order> {
    const result = await this.dbClient.get({
      TableName: this.tableName,
      Key: {
        pk: email,
        sk: orderId,
      },
    }).promise();
    if (!result.Item) {
      throw new Error('Order not found');
    }
    return result.Item as Order;
  }

  async deleteOrder(email: string, orderId: string): Promise<Order> {
    const result = await this.dbClient.delete({
      TableName: this.tableName,
      Key: {
        pk: email,
        sk: orderId,
      },
      ReturnValues: 'ALL_OLD',
    }).promise();
    if (!result.Attributes) {
      throw new Error('Order not found');
    }
    return result.Attributes as Order;
  }
}
