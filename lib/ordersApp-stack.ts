import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

interface OrdersAppStackProps extends cdk.StackProps {
  productsTable: dynamodb.Table;
}

export class OrdersAppStack extends cdk.Stack {
  readonly ordersHandler: lambdaNodeJs.NodejsFunction;
  constructor(scope: Construct, id: string, props: OrdersAppStackProps) {
    super(scope, id, props);

    const orderTable = new dynamodb.Table(this, 'OrdersTableIndetifier', {
      tableName: 'ORDERS',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    });

    const ordersLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      'OrdersLayerVersionArn'
    )
    const ordersLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'OrdersLayerIdentifitier',
      ordersLayerArn
    )

    const ordersApiLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      'OrdersApiLayerVersionArn'
    )
    const ordersApiLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'OrdersApiLayerIdentifier',
      ordersApiLayerArn
    )

    const productsLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      'ProductsLayerVersionArn'
    )
    const productsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'ProductsLayerIdentifitier',
      productsLayerArn
    )

    this.ordersHandler = new lambdaNodeJs.NodejsFunction(this, 'OrdersHandlerIdentifier', {
      functionName: 'OrdersHandler',
      entry: 'lambda/orders/ordersHandler.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      timeout: cdk.Duration.seconds(2),
      bundling: {
        minify: true,
        sourceMap: false,
      },
      environment: {
        PRODUCTS_TABLE_NAME: props.productsTable.tableName,
        ORDERS_TABLE_NAME: orderTable.tableName,
      },
      layers: [productsLayer, ordersLayer, ordersApiLayer],
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
    })
    props.productsTable.grantReadData(this.ordersHandler);
    orderTable.grantReadWriteData(this.ordersHandler);
  }
}
