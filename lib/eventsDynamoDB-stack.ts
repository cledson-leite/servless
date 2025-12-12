import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class EventsDynamoDBStack extends cdk.Stack {
  readonly table: dynamodb.Table;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.table = new dynamodb.Table(this, 'EventsDymanoIdentifier', {
      tableName: 'EVENTS',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
      billingMode: dynamodb.BillingMode.PROVISIONED, //começar com on-demand e depois mudar para provisioned
      readCapacity: 1,
      writeCapacity: 1,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: 'emailIndex',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'eventType', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL, //ALL, KEYS_ONLY, INCLUDE
      //non-key attributes to include in the index (only if projectionType is INCLUDE)
      //nonKeyAttributes: ['attribute1', 'attribute2'],
    });

    const readScaleUp = this.table.autoScaleReadCapacity({
      minCapacity: 1,
      maxCapacity: 2,
    });
    readScaleUp.scaleOnUtilization({
      targetUtilizationPercent: 50, //ideal 75%
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    const writeScaleUp = this.table.autoScaleWriteCapacity({
      minCapacity: 1,
      maxCapacity: 4,
    });
    writeScaleUp.scaleOnUtilization({
      targetUtilizationPercent: 50, //ideal 75%
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });
}
}
