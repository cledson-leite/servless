import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;
  if(event.resource === '/products' && method === 'POST') {
    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'Create Product' }),
    };
  }
  if(event.resource === '/products/{id}' && method === 'PUT') {
    const productId = event.pathParameters!.id;
    return {
      statusCode: 200,
      body: JSON.stringify({ message: `PUT /products/${productId}` }),
    };
  }
  if(event.resource === '/products/{id}' && method === 'DELETE') {
    const productId = event.pathParameters!.id;
    return {
      statusCode: 200,
      body: JSON.stringify({ message: `DELETE /products/${productId}` }),
    };
  }
  return {
    statusCode: 400,
    body: JSON.stringify({ message: 'Bad request' }),
  };
}
