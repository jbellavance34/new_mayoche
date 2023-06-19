import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3_deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
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
   // const lambda_function = new lambda.Function(this, 'mayoche-fetch-data', {
   //   runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
   //   code: cdk.aws_lambda.Code.fromAsset(path.join(__dirname, 'lambda/image_scraper')),
   //   handler: 'index.handler',
   // })
   // TODO : Add cloudwatch event with crontab
    const lambda_fetch_data = new lambda.DockerImageFunction(this, 'mayoche-fetch-data-docker', {
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, 'lambda/image_scraper')),
      environment: {
        'BUCKET_NAME': s3_data_bucket.bucketName,
      },
      timeout: cdk.Duration.seconds(300),
      memorySize: 256,
      reservedConcurrentExecutions: 1,
    });
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

  }
}