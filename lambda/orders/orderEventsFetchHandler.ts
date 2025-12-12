import { DynamoDB } from "aws-sdk";
import { OrderEventRepository, OrderEvent } from "/opt/nodejs/orderEventsRepositoryLayer";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

const eventTable = process.env.EVENTS_TABLE_NAME!;

const db = new DynamoDB.DocumentClient();
const repositoy = new OrderEventRepository(eventTable, db);

type ParamsPropsType = {email: string, eventType?: string}

export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  const email = event.queryStringParameters!.email!;
  const eventType = event.queryStringParameters!.eventType;

  let orderEvents = await fetchOrderEvents({email, eventType})

  return {
    statusCode: 200,
    body: JSON.stringify(toOrderEvents(orderEvents)),
    headers: {
      'Content-Type': 'application/json',
    },
  };
}

function fetchOrderEvents(params: ParamsPropsType){
  if(!params.eventType) return repositoy.getOrderEventsByEmail(params.email)

  return repositoy.getOrderEventsByEmailAndEventType(params.email, params.eventType!);
}

function toOrderEvents(orderEvents: OrderEvent[]){
  return orderEvents.map(event => ({
    email: event.email,
    createdAt: event.createdAt,
    eventType: event.eventType,
    requestId: event.requestId,
    orderId: event.info.orderId,
    productCodes: event.info.productCodes
  }))
}
