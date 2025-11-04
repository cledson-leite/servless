#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ProductsAppStack } from '../lib/productsApp-stack';
import { ServlessApiStack } from '../lib/servlessApi-stack';
import { ProductsAppLayersStack } from '../lib/productsAppLayers-stack';
import { EventsDynamoDBStack } from '../lib/eventsDynamoDB-stack';

const app = new cdk.App();

const env: cdk.Environment = {
  account: '012086763954',
  region: 'sa-east-1',
};

const tags = {
  cost: 'Curso-aws',
  team: 'Eu mesmo'
}

const productsAppLayersStack = new ProductsAppLayersStack(
  app,
  'ProductsAppLayersStackIndentifier',
  {
    env,
    tags,
  }
);

const eventsDynamoDBStack = new EventsDynamoDBStack(
  app,
  'EventsDynamoDBStackIndentifier',
  {
    env,
    tags,
  }
);

const productsAppStack = new ProductsAppStack(
  app,
  'ProductsAppStackIndentifier',
  {
    eventsDynamoDBTable: eventsDynamoDBStack.table,
    env,
    tags,
  }
);

productsAppStack.addDependency(productsAppLayersStack);
productsAppStack.addDependency(eventsDynamoDBStack);

const servlessApiStack = new ServlessApiStack(
  app,
  'ServlessApiStackIndentifier',
  {
    env,
    tags,
    productsFetchHandler: productsAppStack.productsFetchHandler,
    productsAdminHandler: productsAppStack.productsAdminHandler,
  }
);

servlessApiStack.addDependency(productsAppStack);
