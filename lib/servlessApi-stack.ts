import * as cdk from 'aws-cdk-lib';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cwLogs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface ServlessApiStackProps extends cdk.StackProps {
  productsFetchHandler: lambdaNodeJs.NodejsFunction;
  productsAdminHandler: lambdaNodeJs.NodejsFunction;
  ordersHandler: lambdaNodeJs.NodejsFunction;
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

    //POST /orders
    ordersResource.addMethod('POST', orderIntegration);

    //GET /orders
    //GET /orders?email={email}
    //GET /orders?email={email}&orderId={orderId}
    ordersResource.addMethod('GET', orderIntegration);

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
    productsResource.addMethod('POST', productsAdminIntegration);

    const productIDResource = productsResource.addResource('{id}');
    productIDResource.addMethod('GET', productsFetchIntegration);
    productIDResource.addMethod('PUT', productsAdminIntegration);
    productIDResource.addMethod('DELETE', productsAdminIntegration);
  }
}
