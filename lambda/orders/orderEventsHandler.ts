import { DynamoDB } from "aws-sdk";
import { OrderEventRepository, OrderEvent as EventRepository } from "/opt/nodejs/orderEventsRepositoryLayer";
import { OrderEvent, OrderEventData } from "/opt/nodejs/orderEventsLayer";
import { Context, SNSEvent, SNSMessage } from "aws-lambda";

const eventsTable = process.env.EVENTS_TABLE_NAME!;

const db = new DynamoDB.DocumentClient();
const orderEventsRepository = new OrderEventRepository(eventsTable, db);

export async function handler(event: SNSEvent, context: Context): Promise<void> {
  const promise = event.Records.map((record) => createEvent(record.Sns));
  await Promise.all(promise);
}

function createEvent(body: SNSMessage){
  const event = JSON.parse(body.Message) as OrderEvent
  const data = event.data as OrderEventData;

  console.log(`Order event - MessageId: ${body.MessageId}`);

  const timestamp = Date.now();
  const ttl = Math.floor(Date.now() / 1000) + 5 * 60; // 5 minutes

  const orderEvent: EventRepository = {
    pk: `#order_${data.orderId}`,
    sk: `${event.eventType}#${timestamp}`,
    ttl,
    email: data.email,
    createdAt: timestamp,
    requestId: data.requestId,
    eventType: event.eventType,
    info: {
      orderId: data.orderId,
      productCodes: data.productCodes,
      messageId: body.MessageId!,
    }
  };
  return orderEventsRepository.createOrderEvent(orderEvent);
}
