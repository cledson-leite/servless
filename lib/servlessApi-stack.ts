import * as cdk from 'aws-cdk-lib';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cwLogs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface ServlessApiStackProps extends cdk.StackProps {
  productsFetchHandler: lambdaNodeJs.NodejsFunction;
  productsAdminHandler: lambdaNodeJs.NodejsFunction;
  ordersHandler: lambdaNodeJs.NodejsFunction;
  orderEventsFetchHandler: lambdaNodeJs.NodejsFunction;
}

export class ServlessApiStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: ServlessApiStackProps
  ) {
    super(scope, id, props);

    const logGroup = new cwLogs.LogGroup(this, 'ServlessApiLogGroup');

    const api = new apigateway.RestApi(
      this,
      'ServlessApiIdentifier',
      {
        restApiName: 'ServlessApi',
        cloudWatchRole: true,
        deployOptions: {
          tracingEnabled: true,
          metricsEnabled: true,
          loggingLevel: apigateway.MethodLoggingLevel.INFO,
          accessLogDestination:
            new apigateway.LogGroupLogDestination(logGroup),
          accessLogFormat: apigateway.AccessLogFormat
            .jsonWithStandardFields({
              caller: true,
              httpMethod: true,
              ip: true,
              protocol: true,
              requestTime: true,
              resourcePath: true,
              responseLength: true,
              status: true,
              user: true,
            }),
        },
      }
    )
    this.createProductService(props, api);
    this.createOrderService(props, api);
  }

  private createOrderService(props: ServlessApiStackProps, api: apigateway.RestApi) {
    const orderIntegration = new apigateway.LambdaIntegration(props.ordersHandler);

    //resource ORDER
    const ordersResource = api.root.addResource('orders');

    const orderRequestValidator = new apigateway.RequestValidator(this, 'OrderRequestValidatorIdentifier', {
      restApi: api,
      requestValidatorName: 'OrderRequestValidator',
      validateRequestBody: true,
    });

    const orderModel = new apigateway.Model(this,'OrderModelIdentifier', {
      modelName: 'OrderModel',
      restApi: api,
      contentType: 'application/json',
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          email: { type: apigateway.JsonSchemaType.STRING },
          productsIds: {
            type: apigateway.JsonSchemaType.ARRAY,
            minItems: 1,
            items: { type: apigateway.JsonSchemaType.STRING },
          },
          payment: {
            type: apigateway.JsonSchemaType.STRING,
            enum: ['CASH', 'DEBIT_CARD', 'CREDIT_CARD'],
          },
          shipping: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              type: {
                type: apigateway.JsonSchemaType.STRING,
                enum: ['ECONOMIC', 'URGENT'],
              },
              carrier: {
                type: apigateway.JsonSchemaType.STRING,
                enum: ['CORREIO', 'FEDEX'],
              },
	          }
          },
        },
        required: ['email', 'productsIds', 'payment'],
      },
    });

    //POST /orders
    ordersResource.addMethod('POST', orderIntegration, {
      requestValidator: orderRequestValidator,
      requestModels: {
        'application/json': orderModel,
      },
    });

    //GET /orders
    //GET /orders?email={email}
    //GET /orders?email={email}&orderId={orderId}
    ordersResource.addMethod('GET', orderIntegration);

    const orderEventsResource = ordersResource.addResource('events');
    const orderEvetsFatchValidador = new apigateway.RequestValidator(this, 'OrderEventsFetchValidatorIdentifier', {
      restApi: api,
      requestValidatorName: 'OrderEventsFetchValidator',
      validateRequestParameters: true,
    });

    const orderEventsIntegration = new apigateway.LambdaIntegration(props.orderEventsFetchHandler);

    orderEventsResource.addMethod('GET', orderEventsIntegration, {
      requestParameters: {
        'method.request.querystring.email': true,
        'method.request.querystring.eventType': false,
      },
      requestValidator: orderEvetsFatchValidador,
    });
    
    const orderDeletionValidator = new apigateway.RequestValidator(this, 'OrderDeletionValidatorIdentifier', {
      restApi: api,
      requestValidatorName: 'OrderDeletionValidator',
      validateRequestParameters: true,
    });

    //DELETE /orders?email={email}&orderId={orderId}
    ordersResource.addMethod('DELETE', orderIntegration, {
      requestParameters: {
        'method.request.querystring.email': true,
        'method.request.querystring.orderId': true,
      },
      requestValidator: orderDeletionValidator,
    });
  }

  private createProductService(props: ServlessApiStackProps, api: apigateway.RestApi) {
    const productsFetchIntegration = new apigateway.LambdaIntegration(props.productsFetchHandler);
    const productsAdminIntegration = new apigateway.LambdaIntegration(props.productsAdminHandler);

    const productsResource = api.root.addResource('products');
    productsResource.addMethod('GET', productsFetchIntegration);

    const productRequestValidator = new apigateway.RequestValidator(
      this,
      'ProductRequestValidatorIdentifier',
      {
        restApi: api,
        requestValidatorName: 'ProductRequestValidator',
        validateRequestBody: true,
      }
    );
    const productModel = new apigateway.Model(this,'ProductModelIdentifier', {
      modelName: 'ProductModel',
      restApi: api,
      contentType: 'application/json',
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          productName: { type: apigateway.JsonSchemaType.STRING },
          code: { type: apigateway.JsonSchemaType.STRING },
          price: { type: apigateway.JsonSchemaType.NUMBER },
          model: { type: apigateway.JsonSchemaType.STRING },
          productUrl: { type: apigateway.JsonSchemaType.STRING },
        },
        required: ['productName', 'code', 'price', 'model', 'productUrl'],
      },
    });
    productsResource.addMethod('POST', productsAdminIntegration, {
      requestValidator: productRequestValidator,
      requestModels: {
        'application/json': productModel,
      },
    });

    const productIDResource = productsResource.addResource('{id}');
    productIDResource.addMethod('GET', productsFetchIntegration);
    productIDResource.addMethod('PUT', productsAdminIntegration, {
      requestValidator: productRequestValidator,
      requestModels: {
        'application/json': productModel,
      },
    });
    productIDResource.addMethod('DELETE', productsAdminIntegration);
  }
}
