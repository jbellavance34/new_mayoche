import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as s3_deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';

export class MayocheFrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /* Frontend */
    const s3_bucket = new s3.Bucket(this, 'mayoche-bucket', {})
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', { domainName: 'mayoche.info' }) 
    const cloudfrontDistribution = new cloudfront.Distribution(this, 'cloudfrontDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(s3_bucket),
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html'
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html'
        }
      ],
      defaultRootObject: 'index.html',
      domainNames: ['new.mayoche.info'],
      certificate: new acm.Certificate(this, 'certificate', { 
        domainName: 'new.mayoche.info',
        validation: acm.CertificateValidation.fromDns(hostedZone)  
      })
    })
    new route53.CnameRecord(this, 'cloudfront_route53_record', {
      recordName: 'new.mayoche.info',
      zone: hostedZone,
      domainName: cloudfrontDistribution.distributionDomainName,
    });

    new s3_deploy.BucketDeployment(this, 'mayoche-deploy-index', {
      sources: [s3_deploy.Source.asset(path.join(__dirname, '../app/new-mayoche/dist'))],
      destinationBucket: s3_bucket,
      distribution: cloudfrontDistribution,
      distributionPaths: ['/*'],
      cacheControl: [
        s3_deploy.CacheControl.maxAge(cdk.Duration.minutes(1)),
        s3_deploy.CacheControl.setPublic()
      ],
      include: ['index.html'],
      exclude: ['*']
    })
    new s3_deploy.BucketDeployment(this, 'mayoche-deploy-static', {
      sources: [s3_deploy.Source.asset(path.join(__dirname, '../app/new-mayoche/dist'))],
      destinationBucket: s3_bucket,
      distribution: cloudfrontDistribution,
      distributionPaths: ['/*'],
      cacheControl: [
        s3_deploy.CacheControl.maxAge(cdk.Duration.days(365)),
        s3_deploy.CacheControl.setPublic(),
        s3_deploy.CacheControl.immutable()
      ],
      exclude: ['index.html'],
    })

    /** Fetch Data */
    const s3_data_bucket = new s3.Bucket(this, 'mayoche-data-bucket', {})
    // cors
    s3_data_bucket.addCorsRule({
      allowedOrigins: ['https://new.mayoche.info', 'http://localhost:5173'],
      allowedMethods: [s3.HttpMethods.GET],
      allowedHeaders: ['*']
    })
    const lambda_fetch_data = new lambda.DockerImageFunction(this, 'mayoche-fetch-data-docker', {
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, 'lambda/image_scraper')),
      environment: {
        'BUCKET_NAME': s3_data_bucket.bucketName,
      },
      timeout: cdk.Duration.seconds(300),
      memorySize: 256,
      reservedConcurrentExecutions: 1,
    });
    // cloudwatch event rule to trigger lambda_fetch_data once every day at 3 am
    new events.Rule(this, 'mayoche-fetch-data-rule', {
      schedule: events.Schedule.expression('cron(0 3 * * ? *)'),
      targets: [
        new targets.LambdaFunction(lambda_fetch_data)
      ]
    })

    s3_data_bucket.grantWrite(lambda_fetch_data);
    // adding behavior to /image with s3_data_bucket
    cloudfrontDistribution.addBehavior('data/*.json', new origins.S3Origin(s3_data_bucket), {
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: new cloudfront.CachePolicy(this, 'data-cache-policy', {
          defaultTtl: cdk.Duration.minutes(1),
          maxTtl: cdk.Duration.minutes(1),
          minTtl: cdk.Duration.minutes(1)
      })
    })
    const modelName = 'choice'
    // dynamoDB to store data
    const dynamoTable = new dynamodb.Table(this, modelName, {
          billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
          partitionKey: {
            name: `${modelName}Id`,
            type: dynamodb.AttributeType.STRING,
          },
          removalPolicy: cdk.RemovalPolicy.RETAIN,
          tableName: modelName,
    });
    const api = new apigw.RestApi(this, 'mayoche-data-api', { 
      restApiName: 'mayoche-data-api',
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
      },
    })
    new apigw.UsagePlan(this, 'mayoche-data-api-usage-plan', {
      name: 'mayoche-data-api-usage-plan',
      apiStages: [{
        api: api,
        stage: api.deploymentStage,
      }],
      throttle: {
        burstLimit: 100,
        rateLimit: 200,
      }
    })
    const allResources = api.root.addResource(modelName.toLocaleLowerCase());
    const oneResource = allResources.addResource('{id}');
    const getPolicy = new iam.Policy(this, 'getPolicy', {
      statements: [
        new iam.PolicyStatement({
          actions: ['dynamodb:GetItem'],
          effect: iam.Effect.ALLOW,
          resources: [dynamoTable.tableArn],
        }),
      ],
    });
    const getRole = new iam.Role(this, 'getRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });
    getRole.attachInlinePolicy(getPolicy);
    const errorResponses = [
      {
        selectionPattern: '400',
        statusCode: '400',
        responseTemplates: {
          'application/json': `{
            "error": "Bad input!"
          }`,
        },
      },
      {
        selectionPattern: '5\\d{2}',
        statusCode: '500',
        responseTemplates: {
          'application/json': `{
            "error": "Internal Service Error!"
          }`,
        },
      },
    ];

    const integrationResponses = [
      {
        statusCode: '200',
      },
      ...errorResponses,
    ];
    const getIntegration = new apigw.AwsIntegration({
      action: 'GetItem',
      options: {
        credentialsRole: getRole,
        integrationResponses,
        requestTemplates: {
          'application/json': `{
              "Key": {
                "${modelName}Id": {
                  "S": "$method.request.path.id"
                }
              },
              "TableName": "${modelName}"
            }`,
        },
      },
      service: 'dynamodb',
    });
    const putPolicy = new iam.Policy(this, 'putPolicy', {
      statements: [
        new iam.PolicyStatement({
          actions: ['dynamodb:PutItem'],
          effect: iam.Effect.ALLOW,
          resources: [dynamoTable.tableArn],
        }),
      ],
    });
    const putRole = new  iam.Role(this, 'putRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });
    putRole.attachInlinePolicy(putPolicy);
    const createIntegration = new apigw.AwsIntegration({
      action: 'PutItem',
      options: {
        credentialsRole: putRole,
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': `{
                "requestId": "$context.requestId"
              }`,
            },
          },
          ...errorResponses,
        ],
        requestTemplates: {
          'application/json': `{
              "Item": {
                "${modelName}Id": {
                  "S": "$context.requestId"
                },
                "Animal": {
                  "S": "$input.path('$.animal')"
                },
                "CreatedAt": {
                  "S": "$context.requestTime"
                },
                "Description": {
                  "S": "$input.path('$.description')"
                },
                "Name": {
                  "S": "$input.path('$.name')"
                },
                "type": {
                  "S": "vote"
                }
              },
              "TableName": "${modelName}"
            }`,
        },
      },
      service: 'dynamodb',
    });
    const methodOptions = { methodResponses: [{ statusCode: '200' }, { statusCode: '400' }, { statusCode: '500' }] };

    allResources.addMethod('POST', createIntegration, methodOptions);
    oneResource.addMethod('GET', getIntegration, methodOptions);
  }
}