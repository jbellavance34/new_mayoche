#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MayocheFrontendStack } from '../lib/mayoche-stack';

const app = new cdk.App();
new MayocheFrontendStack(app, 'MayocheFrontendStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1'
  },
});