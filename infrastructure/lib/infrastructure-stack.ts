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

    // Erstelle Datenbank
    const dynamoTable = new Table(this, 'items', {
      partitionKey: {
        name: 'itemId',
        type: AttributeType.STRING
      },
      tableName: 'items',
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code - use RETAIN
    });

    // Erstelle Umgebungsvariablen für Funktionen
    const nodeJsFunctionProps = {
      environment: {
        PRIMARY_KEY: 'itemId',
        TABLE_NAME: dynamoTable.tableName,
      },
      runtime: Runtime.NODEJS_14_X
    };

    // Erstelle Funktionen
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

    // Berechtige Funktionen auf Datenbank (zero trust)
    dynamoTable.grantReadWriteData(getOneLambda);
    dynamoTable.grantReadWriteData(createOneLambda);

    // Erstelle API-Gateway
    const api = new RestApi(this, 'itemsApi', {
      restApiName: 'Items Service'
    });

    // Binde Funktion an POST
    const items = api.root.addResource('items');
    items.addMethod('POST', new LambdaIntegration(createOneLambda));

    // Binde Funktion an GET
    const singleItem = items.addResource('{id}');
    singleItem.addMethod('GET', new LambdaIntegration(getOneLambda));
  }
}
