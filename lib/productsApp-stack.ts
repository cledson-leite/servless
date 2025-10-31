import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import { Construct } from 'constructs'

export class ProductsAppStack extends cdk.Stack {
  readonly productsFetchHandler: lambdaNodeJs.NodejsFunction
  readonly productsAdminHandler: lambdaNodeJs.NodejsFunction
  readonly productsTable: dynamodb.Table
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
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
        layers: [productsLayer],
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
        },
        layers: [productsLayer],
      }
    )
    this.productsTable.grantWriteData(this.productsAdminHandler)
  }
}
