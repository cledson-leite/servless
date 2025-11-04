import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import { Construct } from 'constructs'

interface ProductsAppStackProps extends cdk.StackProps {
  eventsDynamoDBTable: dynamodb.Table
}

export class ProductsAppStack extends cdk.Stack {
  readonly productsFetchHandler: lambdaNodeJs.NodejsFunction
  readonly productsAdminHandler: lambdaNodeJs.NodejsFunction
  readonly productsTable: dynamodb.Table
  constructor(scope: Construct, id: string, props: ProductsAppStackProps) {
    super(scope, id, props)
    this.productsTable = new dynamodb.Table(this, 'ProductsTableIndefitier', {
      tableName: 'PRODUCTS',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      //por padrão, mantem a tabela mesmo se a stack for deletada (preferencial em produção)
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    })

    const productsLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      'ProductsLayerVersionArn'
    )
    const productsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'ProductsLayerIdentifitier',
      productsLayerArn
    )

    const productLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      'ProductEventsLayerVersionArn'
    )
    const productEventsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'ProductEventsLayerIdentifitier',
      productLayerArn
    )

    const productEventsHandler = new lambdaNodeJs.NodejsFunction(
      this,
      'ProductEventsIdentifier',
      {
        functionName: 'ProductEventsHandler',
        entry: 'lambda/products/productEventsHandler.ts',
        handler: 'handler',
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 512,
        timeout: cdk.Duration.seconds(2),
        bundling: {
          minify: true,
          sourceMap: false,
        },
        environment: {
          EVENTS_TABLE_NAME: props.eventsDynamoDBTable.tableName,
        },
        layers: [productEventsLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
      }
    )
    props.eventsDynamoDBTable.grantWriteData(productEventsHandler)

    this.productsFetchHandler = new lambdaNodeJs.NodejsFunction(
      this,
      'ProductsFetchIdentifier',
      {
        functionName: 'ProductsFetchHandler',
        entry: 'lambda/products/productsFetchHandler.ts',
        handler: 'handler',
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 512,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          sourceMap: false,
        },
        environment: {
          PRODUCTS_TABLE_NAME: this.productsTable.tableName,
        },
        layers: [productsLayer, productEventsLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
      }
    )
    this.productsTable.grantReadData(this.productsFetchHandler)

    this.productsAdminHandler = new lambdaNodeJs.NodejsFunction(
      this,
      'ProductsAdminIdentifier',
      {
        functionName: 'ProductsAdminHandler',
        entry: 'lambda/products/productsAdminHandler.ts',
        handler: 'handler',
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 512,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          sourceMap: false,
        },
        environment: {
          PRODUCTS_TABLE_NAME: this.productsTable.tableName,
          PRODUCT_EVENTS_FUNCTION_NAME: productEventsHandler.functionName,
        },
        layers: [productsLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
      }
    )
    this.productsTable.grantWriteData(this.productsAdminHandler)
    productEventsHandler.grantInvoke(this.productsAdminHandler)
  }
}
