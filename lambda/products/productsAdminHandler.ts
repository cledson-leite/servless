import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";

const productTableName = process.env.PRODUCTS_TABLE_NAME!;
const DynamoDBClient = new DynamoDB.DocumentClient();

const productRepository = new ProductRepository(DynamoDBClient, productTableName);

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;
  if(event.resource === '/products' && method === 'POST') {
    const product = JSON.parse(event.body!) as Product;
    const createdProduct = await productRepository.createProduct(product);
    return {
      statusCode: 201,
      body: JSON.stringify(createdProduct),
    };
  }
  if(event.resource === '/products/{id}' && method === 'PUT') {
    const productId = event.pathParameters!.id!;
    const product = JSON.parse(event.body!) as Product;
    try {
      const UpdetedProduct = await productRepository.updateProduct(productId, product);
      return {
        statusCode: 200,
        body: JSON.stringify(UpdetedProduct),
      };
    } catch (ConditionCheckFailedException) {
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
