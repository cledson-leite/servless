import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface OrdersAppStackProps extends cdk.StackProps {
  productsTable: dynamodb.Table;
  eventsTable: dynamodb.Table;
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

    const orderEventsLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      'OrderEventsLayerVersionArn'
    )
    const orderEventsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'OrderEventsLayerIdentifier',
      orderEventsLayerArn
    )

    const orderEventsRepositoryLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      'OrderEventsRepositoryLayerVersionArn'
    )
    const orderEventsRepositoryLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'OrderEventsRepositoryLayerIdentifier',
      orderEventsRepositoryLayerArn
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

    const orderNotificationTopic = new sns.Topic(this, 'OrderNotificationTopicIdentifier', {
      displayName: 'Order Notification Topic',
      topicName: 'OrderNotificationTopic',
    });

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
        ORDER_NOTIFICATION_TOPIC_ARN: orderNotificationTopic.topicArn,
      },
      layers: [productsLayer, ordersLayer, ordersApiLayer, orderEventsLayer],
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
    })
    props.productsTable.grantReadData(this.ordersHandler);
    orderTable.grantReadWriteData(this.ordersHandler);
    orderNotificationTopic.grantPublish(this.ordersHandler);

    const orderEventsHandler = new lambdaNodeJs.NodejsFunction(this, 'OrderEventsHandlerIdentifier', {
      functionName: 'OrderEventsHandler',
      entry: 'lambda/orders/orderEventsHandler.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      timeout: cdk.Duration.seconds(2),
      environment: {
        EVENTS_TABLE_NAME: props.eventsTable.tableName,
      },
      layers: [orderEventsLayer, orderEventsRepositoryLayer],
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
    });
    orderNotificationTopic.addSubscription(new subs.LambdaSubscription(orderEventsHandler));

    const eventsTablePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['dynamodb:PutItem'],
      resources: [props.eventsTable.tableArn],
      conditions: {
        ['ForAnyValue:StringLike']: {
          'dynamodb:LeadingKeys': ['#order_*'],
        }
      }
    });
    orderEventsHandler.addToRolePolicy(eventsTablePolicy);

    const paymentHandler = new lambdaNodeJs.NodejsFunction(this, 'PaymentHandlerIdentifier', {
      functionName: 'PaymentHandler',
      entry: 'lambda/orders/paymentHandler.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      timeout: cdk.Duration.seconds(2),
      bundling: {
        minify: true,
        sourceMap: false,
      },
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
    })
    orderNotificationTopic.addSubscription(new subs.LambdaSubscription(paymentHandler, {
      filterPolicy: {
        eventType: sns.SubscriptionFilter.stringFilter({
          allowlist: ['ORDER_CREATED'],
        }),
      },
    }));

    const orderEventsDLQ = new sqs.Queue(this, 'OrderEventsDLQIdentifier', {
      queueName: 'OrderEventsDLQ',
      retentionPeriod: cdk.Duration.days(10),
      enforceSSL: false,
      encryption: sqs.QueueEncryption.UNENCRYPTED,
    });

    const orderEventsQueue = new sqs.Queue(this, 'OrderEventsQueueIdentifier', {
      queueName: 'OrderEventsQueue',
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: orderEventsDLQ,
      },
      retentionPeriod: cdk.Duration.days(4),
      enforceSSL: false,
      encryption: sqs.QueueEncryption.UNENCRYPTED,
    });
    orderNotificationTopic.addSubscription(new subs.SqsSubscription(orderEventsQueue, {
      filterPolicy: {
        eventType: sns.SubscriptionFilter.stringFilter({
          allowlist: ['ORDER_CREATED'],
        }),
      },
    }));

    const orderEmailHandler = new lambdaNodeJs.NodejsFunction(this, 'OrderEmailHandlerIdentifier', {
      functionName: 'OrderEmailHandler',
      entry: 'lambda/orders/orderEmailHandler.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      timeout: cdk.Duration.seconds(2),
      bundling: {
        minify: true,
        sourceMap: false,
      },
      layers: [orderEventsLayer],
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
    })
    orderEmailHandler.addEventSource(new lambdaEventSources.SqsEventSource(orderEventsQueue, {
      batchSize: 10, //quantidade de mensagens acumulada para envio
      enabled: true, //habilitar ou desabilitar a fonte de eventos
      maxBatchingWindow: cdk.Duration.seconds(300), //tempo maximo para aguardar o tamanho do lote ser atingido
    }));
    orderEventsQueue.grantConsumeMessages(orderEmailHandler);

    const orderEmailPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    });
    orderEmailHandler.addToRolePolicy(orderEmailPolicy);
  }
}
