import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import {DynamoDB} from "aws-sdk";
import { ProductRepository } from "/opt/nodejs/productsLayer";

const productTableName = process.env.PRODUCTS_TABLE_NAME!;
const DynamoDBClient = new DynamoDB.DocumentClient()

const productRepository = new ProductRepository(DynamoDBClient, productTableName);

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const lambdaRequestId = context.awsRequestId;
  const apiRequestId = event.requestContext.requestId;

  console.log(`Lambda Request ID: ${lambdaRequestId}`);
  console.log(`API Gateway Request ID: ${apiRequestId}`);

  const method = event.httpMethod;
  if(event.resource === '/products' && method === 'GET') {
    const products = await productRepository.getAllProducts();
    return {
      statusCode: 200,
      body: JSON.stringify(products),
    };
  }
  if(event.resource === '/products/{id}' && method === 'GET') {
    const productId = event.pathParameters!.id!;
    try {
      const product = await productRepository.getProductById(productId);
      return {
        statusCode: 200,
        body: JSON.stringify(product),
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
