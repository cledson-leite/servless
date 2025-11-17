import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export class OrdersAppLayersStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const ordersLayer = new lambda.LayerVersion(this, 'OrdersLayerIdentifier', {
      layerVersionName: 'OrdersLayer',
      code: lambda.Code.fromAsset('lambda/orders/layers/ordersLayer'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new ssm.StringParameter(this, 'OrdersLayerVersionArnParameter', {
      parameterName: 'OrdersLayerVersionArn',
      stringValue: ordersLayer.layerVersionArn
    });

    const ordersApiLayer = new lambda.LayerVersion(this, 'OrdersApiLayerIdentifier', {
      layerVersionName: 'OrdersApiLayer',
      code: lambda.Code.fromAsset('lambda/orders/layers/orderApiLayer'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new ssm.StringParameter(this, 'OrdersApiLayerVersionArnParameter', {
      parameterName: 'OrdersApiLayerVersionArn',
      stringValue: ordersApiLayer.layerVersionArn
    });
  }
}
