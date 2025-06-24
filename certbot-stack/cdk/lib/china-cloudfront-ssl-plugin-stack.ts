import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam'
import {
    Aws,
    aws_sns,
    aws_sns_subscriptions,
    CfnParameter,
    aws_events,
    Duration,
} from "aws-cdk-lib";
import {aws_s3 as s3} from 'aws-cdk-lib';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import {Schedule} from "aws-cdk-lib/aws-events";
import {Architecture} from "aws-cdk-lib/aws-lambda";

export class ChinaCloudFrontSslPluginStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.templateOptions.description = "(SO8156-cn) - China CloudFront SSL Plugin";

        const codeOfS3_Bucket = s3.Bucket.fromBucketName(this, "LambdaCodeOfS3", this.region + "-cloudfront-ssl-plugin-code")
        const codeOfS3_Path = "v2/code/"

        const apiExplorer = new CfnParameter(this, "apiExplorer", {
            type: "String",
            minLength: 1,
            description: "Your Management Frontend URL"
        })

        const projectName = new CfnParameter(this, "projectName", {
            type: "String",
            minLength: 1,
            description: "Please input your project name e.g. exampleProject."
        })

        const domainName = new CfnParameter(this, "domainName", {
            type: "String",
            minLength: 1,
            description: "Please input your domain names for applying SSL Certificate, please using commas(,) to separate multiple domains. eg.: www.example.cn,example.cn,*.example.com"
        })

        const dynamoDBTable = new CfnParameter(this, "dynamoDBTable", {
            type: "String",
            minLength: 1,
            description: "Please input your centralized dynamoDBTable"
        })

        const bucketName = new CfnParameter(this, "bucketName", {
            type: "String",
            minLength: 1,
            description: "Please input your centralized s3 bucket"
        })

        const bucketARN = new CfnParameter(this, "bucketARN", {
            type: "String",
            minLength: 1,
            description: "Please input your centralized s3 bucketARN"
        })

        const emailAddress = new CfnParameter(this, "emailAddress", {
            type: "String",
            minLength: 1,
            description: "Please input your Email address for Email notification.",
            allowedPattern: "\\b[\\w.%+-]+@[\\w.-]+\\.[a-zA-Z]{2,6}\\b",
        })

        const renewIntervalDays = new CfnParameter(this, "renewIntervalDays", {
            type: "Number",
            maxValue: 89,
            minValue: 1,
            default: 30,
            description: "Please input renew interval days between 1 to 89 days, default renew interval days is 30 days."
        })

        this.templateOptions.metadata = {
            "AWS::CloudFormation::Interface": {
                ParameterGroups: [
                    {
                        Parameters: [
                            projectName.logicalId,
                            emailAddress.logicalId,
                            domainName.logicalId,
                            renewIntervalDays.logicalId,
                            dynamoDBTable.logicalId,
                            bucketName.logicalId,
                            bucketARN.logicalId,
                            apiExplorer.logicalId,
                        ]
                    },
                ],
                ParameterLabels: {
                    apiExplorer: {
                        "default": "Management Frontend URL"
                    },
                    projectName: {
                        "default": "Project Name",
                    },
                    domainName: {
                        "default": "Domain Name",
                    },
                    emailAddress: {
                        "default": "Email",
                    },
                    renewIntervalDays: {
                        "default": "SSL Renew Interval Days",
                    },
                    dynamoDBTable: {
                        "default": "Cert records DDB",
                    },
                    bucketName: {
                        "default": "S3 IAM Cert Bucket Name",
                    },
                    bucketARN: {
                        "default": "S3 IAM Cert Bucket arn",
                    },
                }
            }
        }


        const cert_topic = new aws_sns.Topic(this, 'Topic', {
            displayName: Aws.STACK_NAME+"-Issue-SSL-Notification",
        });

        cert_topic.addSubscription(new aws_sns_subscriptions.EmailSubscription(emailAddress.valueAsString))

        const certbot_lambda_fn = new lambda.Function(this, 'CertBotFunction', {
            code: lambda.S3Code.fromBucket(codeOfS3_Bucket, codeOfS3_Path + "certbot-arm64.zip"),
            runtime: lambda.Runtime.PYTHON_3_13,
            handler: 'app.lambda_handler',
            description: "Core Function for issuing certificates",
            environment: {
                API_EXPLORER: apiExplorer.valueAsString,
                CERTBOT_BUCKET: bucketName.valueAsString,
                DYNAMODB_TABLE: dynamoDBTable.valueAsString,
                DOMAINS_LIST: domainName.valueAsString,
                DOMAINS_EMAIL: emailAddress.valueAsString,
                PROJECT_NAME: projectName.valueAsString,
                REGION: Aws.REGION,
                TOPIC_ARN: cert_topic.topicArn,
            },
            architecture: Architecture.ARM_64,
            memorySize: 256,
            timeout: Duration.seconds(900),
        });

        certbot_lambda_fn.addToRolePolicy(new iam.PolicyStatement({
            resources: ["*"],
            actions: [
                "cloudfront:GetDistribution",
                "cloudfront:ListDistributions",
                "cloudfront:UpdateDistribution",
                "cloudfront:GetDistributionConfig",
                "route53:GetChange",
                "iam:ListServerCertificates",
                "route53:ListHostedZones"],
            effect: iam.Effect.ALLOW,
        }));

        certbot_lambda_fn.addToRolePolicy(new iam.PolicyStatement({
            resources: ["arn:aws-cn:dynamodb:" + Aws.REGION + ":" + Aws.ACCOUNT_ID + ":table/" + dynamoDBTable.valueAsString],
            actions: [
                "dynamodb:PutItem",
                "dynamodb:Query",
                "dynamodb:DeleteItem",
                "dynamodb:UpdateItem"
            ],
            effect: iam.Effect.ALLOW,
        }));

        certbot_lambda_fn.addToRolePolicy(new iam.PolicyStatement({
            resources: [
                "arn:aws-cn:iam::" + Aws.ACCOUNT_ID + ":server-certificate/*",
                "arn:aws-cn:route53:::hostedzone/*",
                bucketARN.valueAsString,
                bucketARN.valueAsString + "/*",
                cert_topic.topicArn,
            ],
            actions: [
                "iam:GetServerCertificate",
                "iam:UpdateServerCertificate",
                "iam:ListServerCertificateTags",
                "iam:DeleteServerCertificate",
                "iam:TagServerCertificate",
                "route53:ChangeResourceRecordSets",
                "iam:UntagServerCertificate",
                "iam:UploadServerCertificate",
                "s3:ListBucket",
                "s3:PutObject",
                "s3:GetObject",
                "sns:Publish"
            ],
            effect: iam.Effect.ALLOW,
        }));


        const cfn_created_rule = new aws_events.Rule(this, "CertCfnCreatedRule", {
            description: "Trigger lambda function after stack created",
            enabled: true,
            eventPattern: {
                source: ["aws.cloudformation"],
                detailType: ["CloudFormation Stack Status Change"],
                detail: {
                    "stack-id": [Aws.STACK_ID],
                    "status-details": {
                        "status": ["CREATE_COMPLETE", "UPDATE_COMPLETE"]
                    }
                }
            }
        })

        cfn_created_rule.addTarget(new targets.LambdaFunction(certbot_lambda_fn))

        certbot_lambda_fn.addPermission("CertCfnCreatedEventInvokeLambda", {
            action: "lambda:InvokeFunction",
            principal: new iam.ServicePrincipal("events.amazonaws.com"),
            sourceArn: cfn_created_rule.ruleArn,
        })
        const scheduled_event_rule = new aws_events.Rule(this, "CertScheduledRule", {
            description: "Automatically trigger cert lambda function every " + renewIntervalDays.valueAsNumber + " days",
            enabled: true,
            schedule: Schedule.rate(Duration.days(renewIntervalDays.valueAsNumber))
        })

        scheduled_event_rule.addTarget(new targets.LambdaFunction(certbot_lambda_fn))

        certbot_lambda_fn.addPermission("ScheduledEventsInvokeLambda", {
            action: "lambda:InvokeFunction",
            principal: new iam.ServicePrincipal("events.amazonaws.com"),
            sourceArn: cfn_created_rule.ruleArn,
        })


        new cdk.CfnOutput(this, 'CloudFormation-Template-Link', {
            value: "https://aws-cn-getting-started.s3.cn-northwest-1.amazonaws.com.cn/china-cloudfront-ssl-plugin_v2/ChinaCloudFrontSslPluginStack.template.json",
            description: "",
        });

    }
}
