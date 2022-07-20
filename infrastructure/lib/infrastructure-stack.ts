import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { join } from 'path'

export class InfrastructureStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const dynamoTable = new Table(this, 'items', {
      partitionKey: {
        name: 'itemId',
        type: AttributeType.STRING
      },
      tableName: 'items',
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code - use RETAIN
    });

    const nodeJsFunctionProps = {
      environment: {
        PRIMARY_KEY: 'itemId',
        TABLE_NAME: dynamoTable.tableName,
      },
      runtime: Runtime.NODEJS_14_X
    };

    // Create Lambda functions
    const getOneLambda = new lambda.Function(this, 'getOneFunction', {
      code: lambda.Code.fromAsset("./artifacts/get-one.zip"),
      handler: "get-one.handler",
      ...nodeJsFunctionProps
    });

    const createOneLambda = new lambda.Function(this, 'createItemFunction', {
      code: lambda.Code.fromAsset("./artifacts/create.zip"),
      handler: "create.handler",
      ...nodeJsFunctionProps
    });

    // Grant the Lambda function read access to the DynamoDB table
    dynamoTable.grantReadWriteData(getOneLambda);
    dynamoTable.grantReadWriteData(createOneLambda);

    // Integrate the Lambda functions with the API Gateway resource
    const createOneIntegration = new LambdaIntegration(createOneLambda);
    const getOneIntegration = new LambdaIntegration(getOneLambda);

    // Create an API Gateway resource for each of the CRUD operations
    const api = new RestApi(this, 'itemsApi', {
      restApiName: 'Items Service'
    });

    const items = api.root.addResource('items');
    items.addMethod('POST', createOneIntegration);

    const singleItem = items.addResource('{id}');
    singleItem.addMethod('GET', getOneIntegration);
  }
}
