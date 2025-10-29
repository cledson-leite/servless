#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ProductsAppStack } from '../lib/productsApp-stack';
import { ServlessApiStack } from '../lib/servlessApi-stack';

const app = new cdk.App();

const env: cdk.Environment = {
  account: '012086763954',
  region: 'sa-east-1',
};

const tags = {
  cost: 'Curso-aws',
  team: 'Eu mesmo'
}

const productsAppStack = new ProductsAppStack(
  app,
  'ProductsAppStackIndentifier',
  {
    env,
    tags,
  }
);

const servlessApiStack = new ServlessApiStack(
  app,
  'ServlessApiStackIndentifier',
  {
    env,
    tags,
    productsFetchHandler: productsAppStack.productsFetchHandler,
  }
);

servlessApiStack.addDependency(productsAppStack);
