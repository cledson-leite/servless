import { DynamoDB, SNS } from "aws-sdk";
import { Order, OrderRepository } from "/opt/nodejs/ordersLayer";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";
import { OrderEvent, OrderEventData, OrderEventType } from "/opt/nodejs/orderEventsLayer";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { CarrierType, OrderProductResponse, OrderResponse, OrderResquest, PaymentType, ShippingType } from "/opt/nodejs/orderApiLayer";

const ordersTable = process.env.ORDERS_TABLE_NAME!;
const productsTable = process.env.PRODUCTS_TABLE_NAME!;
const orderNotificationTopicArn = process.env.ORDER_NOTIFICATION_TOPIC_ARN!;

const dynamoDb = new DynamoDB.DocumentClient();
const sns = new SNS();

const orderRepository = new OrderRepository(ordersTable, dynamoDb);
const productRepository = new ProductRepository(dynamoDb, productsTable);

type MethodHandler = (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult>;
const methodHandlers: Record<string, MethodHandler> = {
  GET: handleGetOrders,
  POST: handleCreateOrder,
  DELETE: handleDeleteOrder,
};

export async function handler(event: APIGatewayProxyEvent, context: Context):
Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;
  const handlerFN = methodHandlers[method];
  if (!handlerFN) {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: `Method ${method} not allowed` }),
    };
  }
  return handlerFN(event, context);
};

async function handleGetOrders(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  const email = event.queryStringParameters?.email;
  const orderId = event.queryStringParameters?.orderId;

  if (email && !orderId) {
    const orders = await orderRepository.getOrderByEmail(email);
    const ordersResponse = orders.map(mapperOrderToOrderResponse);
    return {
      statusCode: 200,
      body: JSON.stringify(ordersResponse),
    };
  }

  if (email && orderId) {
    try {
      const order = await orderRepository.getOrder(email, orderId);
      const orderResponse = mapperOrderToOrderResponse(order);
      return {
        statusCode: 200,
        body: JSON.stringify(orderResponse),
      };
    } catch (error) {
      const message = (<Error>error).message;
      console.error('Error fetching order: ', message);
      return {
        statusCode: 404,
        body: JSON.stringify({ message }),
      };
    }

  }

  const orders = await orderRepository.getAllOrder();
  const ordersResponse = orders.map(mapperOrderToOrderResponse);
  return {
    statusCode: 200,
    body: JSON.stringify(ordersResponse),
  };
}

async function handleCreateOrder(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  const orderRequest = JSON.parse(event.body!) as OrderResquest;
  const products = await productRepository.getProductsByIds(orderRequest.productsIds);
  if(products.length !== orderRequest.productsIds.length) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'One or more products not found' }),
    };
  };
  const orderToCreate = buildOrder(orderRequest, products);
  const createdOrder = await orderRepository.createOrder(orderToCreate);
  const eventResult = await publishOrderEvent(
    OrderEventType.ORDER_CREATED,
    createdOrder,
    context.awsRequestId
  );
  console.log(
    `Event created and sent with orderID: ${createdOrder.sk}
      with messageID ${eventResult.MessageId} from request ${context.awsRequestId}`
  )
  const orderResponse = mapperOrderToOrderResponse(createdOrder);

  return {
    statusCode: 201,
    body: JSON.stringify(orderResponse),
  };
}

async function handleDeleteOrder(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  try {
    const email = event.queryStringParameters!.email!;
    const orderId = event.queryStringParameters!.orderId!;
    const deletedOrder = await orderRepository.deleteOrder(email, orderId);
    const eventResult = await publishOrderEvent(
    OrderEventType.ORDER_DELETED,
    deletedOrder,
    context.awsRequestId
  );
  console.log(
    `Event deleted and sent with orderID: ${deletedOrder.sk}
      with messageID ${eventResult.MessageId} from request ${context.awsRequestId}`
  )
    const orderResponse = mapperOrderToOrderResponse(deletedOrder);

    return {
      statusCode: 200,
      body: JSON.stringify(orderResponse),
    };
  } catch (error) {
    const message = (<Error>error).message;
    console.error('Error delete order: ', message);
    return {
      statusCode: 404,
      body: JSON.stringify({ message }),
    };
  }
}

function publishOrderEvent(eventType: OrderEventType, order: Order, lambdaRequestId: string) {
  const data: OrderEventData = {
    email: order.pk,
    orderId: order.sk!,
    shipping: {
      type: order.shipping.type,
      currier: order.shipping.carrier,
    },
    billing: {
      payment: order.billing.payment as PaymentType,
      total: order.billing.totalPrice,
    },
    productCodes: order.products.map(product => product.code),
    requestId: lambdaRequestId,
  };
  const event: OrderEvent = {
    eventType,
    data
  }
  return sns.publish({
    TopicArn: orderNotificationTopicArn,
    Message: JSON.stringify({event})
  }).promise();
}

function mapperOrderToOrderResponse(order: Order): OrderResponse {
  const products: OrderProductResponse[] = order.products.map(product => ({
    code: product.code,
    price: product.price
  }));
  return {
    email: order.pk,
    id: order.sk!,
    createdAt: order.createdAt!,
    billing: {
      payment: order.billing.payment as PaymentType,
      totalPrice: order.billing.totalPrice,
    },
    shipping: {
      type: order.shipping.type as ShippingType,
      carrier: order.shipping.carrier as CarrierType,
    },
    products,
  };
}

function buildOrder(orderRequest: OrderResquest, products: Product[]): Order {
  const orderProducts: OrderProductResponse[] = products.map(product => ({
    code: product.code,
    price: product.price,
  }));
  const totalPrice = products.reduce((total, product) => total + product.price, 0);

  return {
    pk: orderRequest.email,
    shipping: {
      type: orderRequest.shipping.type,
      carrier: orderRequest.shipping.carrier,
    },
    billing: {
      payment: orderRequest.payment,
      totalPrice: totalPrice,
    },
    products: orderProducts,
  };
}

