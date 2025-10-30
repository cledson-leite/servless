import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

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
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Fetched all products' }),
    };
  }
  if(event.resource === '/products/{id}' && method === 'GET') {
    const productId = event.pathParameters!.id;
    return {
      statusCode: 200,
      body: JSON.stringify({ message: `GET /products/${productId}` }),
    };
  }
  return {
    statusCode: 400,
    body: JSON.stringify({ message: 'Bad request' }),
  };
}
