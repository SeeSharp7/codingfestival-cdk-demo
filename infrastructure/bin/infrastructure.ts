#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { InfrastructureStack } from '../lib/infrastructure-stack';

const app = new cdk.App();
new InfrastructureStack(app, 'CodingFestival-InfrastructureAsCode', {  
  env: { account: '807721111563', region: 'eu-central-1' }
});