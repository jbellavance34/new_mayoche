import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3_deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
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
  }
}
