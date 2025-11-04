import { Callback, Context } from "aws-lambda";
import { ProductEventInterface } from "/opt/nodejs/productEventsLayer";
import { DynamoDB } from "aws-sdk";

const eventsDynamoDB = process.env.EVENTS_TABLE_NAME!;
const dynamoDbClient = new DynamoDB.DocumentClient();

export async function handler(
  event: ProductEventInterface,
  context: Context,
  callback: Callback
): Promise<void> {
  console.log('Product event received:', JSON.stringify(event, null, 2));
  try {
    await createEvent(event);
    callback(null, JSON.stringify({ message: 'Event stored successfully' }));
  } catch (error) {
    callback(error as Error, JSON.stringify({ message: (error as Error).message }));
  }
}

function createEvent(event: ProductEventInterface) {
  const timestamp = Date.now();
  const ttl = Math.floor((timestamp / 1000) + (5 * 60)); // 5 minutes from now
  return dynamoDbClient.put({
    TableName: eventsDynamoDB,
    Item: {
      pk: `#product_${event.productCode}`,
      sk: `${event.eventType}#${timestamp}`,
      email: event.email,
      createdAt: timestamp,
      requestId: event.requestId,
      eventType: event.eventType,
      info: {
        preoductId: event.productId,
        productPrice: event.productPrice,
      },
      ttl,
    },
  }).promise();
}
