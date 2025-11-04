import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { DynamoDB, Lambda } from "aws-sdk";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";
import { ProductEventInterface, ProductEventType } from "/opt/nodejs/productEventsLayer";

const productTableName = process.env.PRODUCTS_TABLE_NAME!;
const productEventsFunctionName = process.env.PRODUCT_EVENTS_FUNCTION_NAME!;

const DynamoDBClient = new DynamoDB.DocumentClient();
const lambdaClient = new Lambda()

const productRepository = new ProductRepository(DynamoDBClient, productTableName);

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;
  if(event.resource === '/products' && method === 'POST') {
    const product = JSON.parse(event.body!) as Product;
    const createdProduct = await productRepository.createProduct(product);
    const response = await sendProductEvent(
      createdProduct,
      ProductEventType.PRODUCT_CREATED,
      'teste@teste.com',
      context.awsRequestId
    );
    console.log(response);
    return {
      statusCode: 201,
      body: JSON.stringify(createdProduct),
    };
  }
  if(event.resource === '/products/{id}' && method === 'PUT') {
    const productId = event.pathParameters!.id! as string;
    const product = JSON.parse(event.body!) as Product;
    try {
      const UpdetedProduct = await productRepository.updateProduct(productId, product);
      const response = await sendProductEvent(
        UpdetedProduct,
        ProductEventType.PRODUCT_UPDATED,
        'teste2@teste2.com',
        context.awsRequestId
      );
      console.log(response);
      return {
        statusCode: 200,
        body: JSON.stringify(UpdetedProduct),
      };
    } catch (ConditionCheckFailedException) {
      console.error(ConditionCheckFailedException);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `Product with id ${productId} not found` }),
      };
    }
  }
  if(event.resource === '/products/{id}' && method === 'DELETE') {
    const productId = event.pathParameters!.id!;
    try {
      const deletedProduct = await productRepository.deleteProduct(productId);
      const response = await sendProductEvent(
        deletedProduct,
        ProductEventType.PRODUCT_DELETED,
        'teste3@teste3.com',
        context.awsRequestId
      );
      console.log(response);
      return {
        statusCode: 200,
        body: JSON.stringify(deletedProduct),
      };
    } catch (error) {
      console.error((<Error>error).message);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: (error as Error).message }),
      };
    }
  }
  return {
    statusCode: 400,
    body: JSON.stringify({ message: 'Bad request' }),
  };
}

function sendProductEvent(
  product: Product,
  eventType: ProductEventType,
  email: string,
  lambdarequestId: string
){
  const event: ProductEventInterface = {
    email,
    eventType,
    productCode: product.code,
    productId: product.id!,
    productPrice: product.price,
    requestId: lambdarequestId,
  };
  return lambdaClient.invoke({
    FunctionName: productEventsFunctionName,
    Payload: JSON.stringify(event),
    InvocationType: 'RequestResponse', // Synchronous invocation
  }).promise();
}
