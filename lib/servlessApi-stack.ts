import * as cdk from 'aws-cdk-lib';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cwLogs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface ServlessApiStackProps extends cdk.StackProps {
  productsFetchHandler: lambdaNodeJs.NodejsFunction;
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
        deployOptions: {
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
    const productsFetchIntegration = new apigateway.LambdaIntegration(props.productsFetchHandler)
    const productsResource = api.root.addResource('products')
    productsResource.addMethod('GET', productsFetchIntegration)
  }
}
