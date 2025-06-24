import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {
    Aws, aws_events, CfnMapping,
    CfnParameter,
    Duration,
    RemovalPolicy,
} from "aws-cdk-lib";
import {aws_s3 as s3} from 'aws-cdk-lib';
import {Effect, PolicyStatement} from "aws-cdk-lib/aws-iam";
import {Repository} from "aws-cdk-lib/aws-ecr";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import {HttpLambdaIntegration} from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import {HttpLambdaAuthorizer, HttpLambdaResponseType} from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import {RuleTargetInput, Schedule} from "aws-cdk-lib/aws-events";
import {Architecture, LayerVersion} from "aws-cdk-lib/aws-lambda";

export class ChinaCloudFrontSslPluginStackV2 extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.templateOptions.description = "(SO8156-cn) - China CloudFront SSL Plugin V2";

        const codeOfS3_Bucket = s3.Bucket.fromBucketName(this, "LambdaCodeOfS3", this.region + "-cloudfront-ssl-plugin-code")
        const codeOfS3_Path = "v2/code/"

        const accessKey = new CfnParameter(this, "accessKey", {
            type: "String",
            minLength: 1,
            noEcho: true,
            description: "Please set the accessKey for API protection"
        })


        this.templateOptions.metadata = {
            "AWS::CloudFormation::Interface": {
                ParameterGroups: [
                    {
                        Parameters: [
                            accessKey.logicalId,
                        ]
                    },
                ],
                ParameterLabels: {
                    accessKey: {
                        "default": "Access Key",
                    }
                }
            }
        }


        const cert_table = new dynamodb.Table(this, 'CertTable', {
            partitionKey: {
                name: 'ProjectName',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        });


        const cert_bucket = new s3.Bucket(this, 'CertBucket', {
            removalPolicy: RemovalPolicy.RETAIN
        });


        const lwaAccount = new CfnMapping(this, 'lwaAccount', {
            mapping: {
                'cn-northwest-1': {
                    account: '069767869989',
                },
                'cn-north-1': {
                    account: '041581134020',
                },
            }
        });

        const frontend_lambda_fn = new lambda.Function(this, 'FrontendFunction', {
            code: lambda.S3Code.fromBucket(codeOfS3_Bucket, codeOfS3_Path + "frontend.zip"),
            runtime: lambda.Runtime.PROVIDED_AL2023,
            description: "SSL Mgmt Frontend",
            handler: 'bootstrap',
            architecture: Architecture.X86_64,
            layers: [lambda.LayerVersion.fromLayerVersionArn(this, 'NginxLayer',
                `arn:aws-cn:lambda:${this.region}:319084102064:layer:Nginx123X86:1`)
                , lambda.LayerVersion.fromLayerVersionArn(this, 'LWALayer',
                    `arn:aws-cn:lambda:${this.region}:${lwaAccount.findInMap(this.region, 'account')}:layer:LambdaAdapterLayerX86:24`)],
            timeout: Duration.seconds(300),
        });


        const authorizer_lambda_fn = new lambda.Function(this, 'AuthorizerFunction', {
            code: lambda.S3Code.fromBucket(codeOfS3_Bucket, codeOfS3_Path + "authorizer.zip"),
            runtime: lambda.Runtime.PYTHON_3_13,
            handler: 'app.lambda_handler',
            description: "SSL API Authorizer",
            environment: {
                API_KEY: accessKey.valueAsString
            },
            architecture: Architecture.ARM_64,
            timeout: Duration.seconds(300),
        });


        const dataProvider_lambda_fn = new lambda.Function(this, 'DataProviderFunction', {
            code: lambda.S3Code.fromBucket(codeOfS3_Bucket, codeOfS3_Path + "dataprovider.zip"),
            runtime: lambda.Runtime.PYTHON_3_13,
            handler: 'app.lambda_handler',
            description: "Data Provider",
            environment: {
                S3_BUCKET: cert_bucket.bucketName,
                DYNAMODB_TABLE: cert_table.tableName,
                REGION: Aws.REGION
            },
            architecture: Architecture.ARM_64,
            timeout: Duration.seconds(300)
        });

        dataProvider_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['dynamodb:Scan'],
                resources: [cert_table.tableArn],
            }),
        );
        dataProvider_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "dynamodb:DeleteItem"
                ],
                resources: [cert_table.tableArn],
            }),
        );
        dataProvider_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "cloudformation:DescribeStackResources",
                    "cloudformation:DescribeStackResource"
                ],
                resources: ["*"],
                conditions: {
                    "StringEquals": {
                        "aws:ResourceTag/parent-stack":
                        this.stackId
                    }
                }
            }),
        );
        dataProvider_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "cloudformation:DescribeStacks",
                    "iam:ListServerCertificates"
                ],
                resources: ["*"],
            }),
        );
        dataProvider_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "sns:ListSubscriptionsByTopic"
                ],
                resources: ["*"],
                conditions: {
                    "StringEquals": {
                        "aws:ResourceTag/parent-stack":
                        this.stackId
                    }
                }
            }),
        );

        const master_lambda_fn = new lambda.Function(this, 'MasterFunction', {
            code: lambda.S3Code.fromBucket(codeOfS3_Bucket, codeOfS3_Path + "master.zip"),
            runtime: lambda.Runtime.PYTHON_3_13,
            handler: 'app.lambda_handler',
            description: "Master",
            environment: {
                PARENT_STACK: this.stackId,
                S3_BUCKET: cert_bucket.bucketName,
                TABLE_NAME: cert_table.tableName,
                REGION: Aws.REGION
            },
            architecture: Architecture.ARM_64,
            timeout: Duration.seconds(900),
        });

        master_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['dynamodb:PutItem'],
                resources: [cert_table.tableArn],
            }),
        );
        master_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['s3:GetObject'],
                resources: ["arn:aws-cn:s3:::cn-north-1-cloudfront-ssl-plugin-code/v2/code/certbot.zip",
                    "arn:aws-cn:s3:::cn-northwest-1-cloudfront-ssl-plugin-code/v2/code/certbot.zip",
                    "arn:aws-cn:s3:::cn-north-1-cloudfront-ssl-plugin-code/v2/code/certbot-arm64.zip",
                    "arn:aws-cn:s3:::cn-northwest-1-cloudfront-ssl-plugin-code/v2/code/certbot-arm64.zip"],
            }),
        );
        master_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['cloudformation:CreateStack'],
                resources: ['*'],
            }),
        );
        master_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "events:PutTargets",
                    "events:DescribeRule",
                    "events:PutRule",
                    "events:RemoveTargets"
                ],
                resources: ['*'],
            }),
        );
        master_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "iam:GetRole",
                    "iam:PassRole",
                    "iam:TagRole",
                    "iam:DetachRolePolicy",
                    "iam:CreateRole",
                    "iam:DeleteRole",
                    "iam:AttachRolePolicy",
                    "iam:PutRolePolicy",
                    "iam:DeleteRolePolicy"
                ],
                resources: ['*'],
            }),
        );
        master_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "lambda:CreateFunction",
                    "lambda:AddPermission",
                    "lambda:GetFunction",
                    "lambda:DeleteFunction",
                    "lambda:TagResource"
                ],
                resources: ['*'],
            }),
        );
        master_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "sns:GetTopicAttributes",
                    "sns:DeleteTopic",
                    "sns:CreateTopic",
                    "sns:Unsubscribe",
                    "sns:Subscribe",
                    "SNS:TagResource"
                ],
                resources: ['*'],
            }),
        );

        const check_stack_state_lambda_fn = new lambda.Function(this, 'CheckStackStateFunction', {
            code: lambda.S3Code.fromBucket(codeOfS3_Bucket, codeOfS3_Path + "check_stack_state.zip"),
            runtime: lambda.Runtime.PYTHON_3_13,
            handler: 'app.lambda_handler',
            description: "Check Stack State",
            environment: {
                REGION: Aws.REGION
            },
            architecture: Architecture.ARM_64,
            timeout: Duration.seconds(900),
        });

        check_stack_state_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "cloudformation:DescribeStacks",
                ],
                resources: ["*"],
            }),
        )

        const updateProject_lambda_fn = new lambda.Function(this, 'UpdateProjectFunction', {
            code: lambda.S3Code.fromBucket(codeOfS3_Bucket, codeOfS3_Path + "updateproject.zip"),
            runtime: lambda.Runtime.PYTHON_3_13,
            handler: 'app.lambda_handler',
            description: "Update Project",
            environment: {
                REGION: Aws.REGION,
                TABLE_NAME: cert_table.tableName,
            },
            architecture: Architecture.ARM_64,
            timeout: Duration.seconds(900),
        });

        updateProject_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "events:PutRule",
                    "events:DescribeRule",
                    "iam:PassRole",
                    "lambda:ListTags"
                ],
                resources: ["*"],
            }),
        );

        updateProject_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['dynamodb:UpdateItem'],
                resources: [cert_table.tableArn],
            }),
        );


        updateProject_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "cloudformation:UpdateStack",
                    "iam:GetRole",
                    "lambda:UpdateFunctionConfiguration",

                ],
                resources: ["*"],
                conditions: {
                    "StringEquals": {
                        "aws:ResourceTag/parent-stack":
                        this.stackId
                    }
                }
            }),
        );


        const deleteProject_lambda_fn = new lambda.Function(this, 'DeleteProjectFunction', {
            code: lambda.S3Code.fromBucket(codeOfS3_Bucket, codeOfS3_Path + "deleteproject.zip"),
            runtime: lambda.Runtime.PYTHON_3_13,
            handler: 'app.lambda_handler',
            description: "Delete Project",
            environment: {
                REGION: Aws.REGION,
                DYNAMODB_TABLE: cert_table.tableName,
            },
            architecture: Architecture.ARM_64,
            timeout: Duration.seconds(900),
        });

        deleteProject_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "cloudformation:DescribeStacks",
                    "dynamodb:Query",
                    "events:RemoveTargets",
                    "events:DeleteRule",
                    "iam:DeleteServerCertificate",
                    "iam:PassRole",
                    "iam:ListServerCertificates",
                    "iam:DetachRolePolicy",
                    "iam:DetachGroupPolicy",
                    "lambda:RemovePermission",
                    "sns:Unsubscribe",
                ],
                resources: ["*"],
            }),
        );

        deleteProject_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "cloudformation:DeleteStack",
                    "iam:DeleteRolePolicy",
                    "iam:GetRole",
                    "iam:DeleteRole",
                    "lambda:DeleteFunction",
                    "sns:DeleteTopic",
                    "sns:GetTopicAttributes",
                ],
                resources: ["*"],
                conditions: {
                    "StringEquals": {
                        "aws:ResourceTag/parent-stack":
                        this.stackId
                    }
                }
            }),
        );

        const addEmail_lambda_fn = new lambda.Function(this, 'AddEmailFunction', {
            code: lambda.S3Code.fromBucket(codeOfS3_Bucket, codeOfS3_Path + "addemail.zip"),
            runtime: lambda.Runtime.PYTHON_3_13,
            handler: 'app.lambda_handler',
            description: "Add Email",
            environment: {
                REGION: Aws.REGION
            },
            architecture: Architecture.ARM_64,
            timeout: Duration.seconds(900),
        });

        addEmail_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "cloudformation:DescribeStackResources",
                ],
                resources: ["*"],
            }),
        );
        addEmail_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "sns:ListSubscriptionsByTopic",
                    "sns:Subscribe"
                ],
                resources: ["*"],
            }),
        );

        const deleteEmail_lambda_fn = new lambda.Function(this, 'DeleteEmailFunction', {
            code: lambda.S3Code.fromBucket(codeOfS3_Bucket, codeOfS3_Path + "deleteemail.zip"),
            runtime: lambda.Runtime.PYTHON_3_13,
            handler: 'app.lambda_handler',
            description: "Delete Email",
            environment: {
                REGION: Aws.REGION
            },
            architecture: Architecture.ARM_64,
            timeout: Duration.seconds(300),
        });

        deleteEmail_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "cloudformation:DescribeStackResources",
                ],
                resources: ["*"],
            }),
        );
        deleteEmail_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "sns:ListSubscriptionsByTopic",
                    "sns:Unsubscribe"
                ],
                resources: ["*"],
            }),
        );


        const triggerCertbot_lambda_fn = new lambda.Function(this, 'TriggerCertbotFunction', {
            code: lambda.S3Code.fromBucket(codeOfS3_Bucket, codeOfS3_Path + "triggercertbot.zip"),
            runtime: lambda.Runtime.PYTHON_3_13,
            handler: 'app.lambda_handler',
            description: "Trigger Certbot Function",
            environment: {
                DYNAMODB_TABLE: cert_table.tableName,
                REGION: Aws.REGION
            },
            architecture: Architecture.ARM_64,
            timeout: Duration.seconds(900),
        });

        triggerCertbot_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "lambda:InvokeFunction",
                    "cloudformation:DescribeStackResources",
                ],
                resources: ["*"],
            }),
        );

        triggerCertbot_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['dynamodb:UpdateItem'],
                resources: [cert_table.tableArn],
            }),
        );

        const getMailByProject_lambda_fn = new lambda.Function(this, 'GetMailByProjectFunction', {
            code: lambda.S3Code.fromBucket(codeOfS3_Bucket, codeOfS3_Path + "getmailbyproject.zip"),
            runtime: lambda.Runtime.PYTHON_3_13,
            handler: 'app.lambda_handler',
            description: "Get Mail By Topic Function",
            environment: {
                REGION: Aws.REGION
            },
            architecture: Architecture.ARM_64,
            timeout: Duration.seconds(900),
        });

        getMailByProject_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "sns:ListSubscriptionsByTopic",
                ],
                resources: ["*"],
                conditions: {
                    "StringEquals": {
                        "aws:ResourceTag/parent-stack":
                        this.stackId
                    }
                }
            }),
        );

        getMailByProject_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "cloudformation:DescribeStackResources",
                ],
                resources: ["*"],
            }),
        );

        const getCertByPath_lambda_fn = new lambda.Function(this, 'GetCertByPathFunction', {
            code: lambda.S3Code.fromBucket(codeOfS3_Bucket, codeOfS3_Path + "getcertbypath.zip"),
            runtime: lambda.Runtime.PYTHON_3_13,
            handler: 'app.lambda_handler',
            description: "Get Cert By Path Function",
            environment: {
                REGION: Aws.REGION
            },
            architecture: Architecture.ARM_64,
            timeout: Duration.seconds(900),
        });

        getCertByPath_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "iam:ListServerCertificates",
                ],
                resources: ["*"],
            }),
        );

        const deleteCert_lambda_fn = new lambda.Function(this, 'DeleteCertFunction', {
            code: lambda.S3Code.fromBucket(codeOfS3_Bucket, codeOfS3_Path + "deletecert.zip"),
            runtime: lambda.Runtime.PYTHON_3_13,
            handler: 'app.lambda_handler',
            description: "Delete IAM Cert Function",
            environment: {
                REGION: Aws.REGION
            },
            architecture: Architecture.ARM_64,
            timeout: Duration.seconds(900),
        });

        deleteCert_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "iam:DeleteServerCertificate",
                ],
                resources: ["*"],
            }),
        );

        const check_cert_state_lambda_fn = new lambda.Function(this, 'CheckCertStateFunction', {
            code: lambda.S3Code.fromBucket(codeOfS3_Bucket, codeOfS3_Path + "check_cert_state.zip"),
            runtime: lambda.Runtime.PYTHON_3_13,
            handler: 'app.lambda_handler',
            description: "Check Cert State",
            environment: {
                DYNAMODB_TABLE: cert_table.tableName,
                REGION: Aws.REGION
            },
            architecture: Architecture.ARM_64,
            timeout: Duration.seconds(900),
        });

        check_cert_state_lambda_fn.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['dynamodb:GetItem'],
                resources: [cert_table.tableArn],
            }),
        )


        const ssl_HttpApi = new apigwv2.HttpApi(this, 'SslCertManageAPI', {
            apiName: Aws.STACK_NAME + ': SSL Cert Management',
        });

        const httpAuthorizer = new HttpLambdaAuthorizer('HttpAuthorizer', authorizer_lambda_fn, {
            responseTypes: [HttpLambdaResponseType.SIMPLE], // Define if returns simple and/or iam response
            resultsCacheTtl: cdk.Duration.minutes(60),
        });

        const frontendIntegration = new HttpLambdaIntegration('FrontendIntegration', frontend_lambda_fn);
        ssl_HttpApi.addRoutes({
            path: '/',
            methods: [apigwv2.HttpMethod.GET],
            integration: frontendIntegration,
        });
        ssl_HttpApi.addRoutes({
            path: '/{proxy+}',
            methods: [apigwv2.HttpMethod.GET],
            integration: frontendIntegration,
        });

        const dataproviderIntegration = new HttpLambdaIntegration('DataProviderIntegration', dataProvider_lambda_fn);
        ssl_HttpApi.addRoutes({
            path: '/api/dataprovider',
            methods: [apigwv2.HttpMethod.POST],
            integration: dataproviderIntegration,
            authorizer: httpAuthorizer
        });

        const masterIntegration = new HttpLambdaIntegration('MasterIntegration', master_lambda_fn);
        ssl_HttpApi.addRoutes({
            path: '/api/master',
            methods: [apigwv2.HttpMethod.POST],
            integration: masterIntegration,
            authorizer: httpAuthorizer
        });

        const checkStackStateIntegration = new HttpLambdaIntegration('CheckStackStateIntegration', check_stack_state_lambda_fn);
        ssl_HttpApi.addRoutes({
            path: '/api/check_stack_state',
            methods: [apigwv2.HttpMethod.POST],
            integration: checkStackStateIntegration,
            authorizer: httpAuthorizer
        });

        const updateProjectIntegration = new HttpLambdaIntegration('UpdateProjectIntegration', updateProject_lambda_fn);
        ssl_HttpApi.addRoutes({
            path: '/api/updateproject',
            methods: [apigwv2.HttpMethod.POST],
            integration: updateProjectIntegration,
            authorizer: httpAuthorizer
        });

        const deleteProjectIntegration = new HttpLambdaIntegration('DeleteProjectIntegration', deleteProject_lambda_fn);
        ssl_HttpApi.addRoutes({
            path: '/api/deleteproject',
            methods: [apigwv2.HttpMethod.POST],
            integration: deleteProjectIntegration,
            authorizer: httpAuthorizer
        });


        const addemailIntegration = new HttpLambdaIntegration('AddEmailIntegration', addEmail_lambda_fn);
        ssl_HttpApi.addRoutes({
            path: '/api/addemail',
            methods: [apigwv2.HttpMethod.POST],
            integration: addemailIntegration,
            authorizer: httpAuthorizer
        });

        const deleteemailIntegration = new HttpLambdaIntegration('DeleteEmailIntegration', deleteEmail_lambda_fn);
        ssl_HttpApi.addRoutes({
            path: '/api/deleteemail',
            methods: [apigwv2.HttpMethod.POST],
            integration: deleteemailIntegration,
            authorizer: httpAuthorizer
        });

        const triggerCertbotIntegration = new HttpLambdaIntegration('TriggerCertbotIntegration', triggerCertbot_lambda_fn);
        ssl_HttpApi.addRoutes({
            path: '/api/triggercertbot',
            methods: [apigwv2.HttpMethod.POST],
            integration: triggerCertbotIntegration,
            authorizer: httpAuthorizer
        });

        const getMailByProjectIntegration = new HttpLambdaIntegration('GetMailByProjectIntegration', getMailByProject_lambda_fn);
        ssl_HttpApi.addRoutes({
            path: '/api/getmailbyproject',
            methods: [apigwv2.HttpMethod.POST],
            integration: getMailByProjectIntegration,
            authorizer: httpAuthorizer
        });

        const getCertByPathIntegration = new HttpLambdaIntegration('GetCertByPathIntegration', getCertByPath_lambda_fn);
        ssl_HttpApi.addRoutes({
            path: '/api/getcertbypath',
            methods: [apigwv2.HttpMethod.POST],
            integration: getCertByPathIntegration,
            authorizer: httpAuthorizer
        });

        const deleteCertIntegration = new HttpLambdaIntegration('DeleteCertIntegration', deleteCert_lambda_fn);
        ssl_HttpApi.addRoutes({
            path: '/api/deletecert',
            methods: [apigwv2.HttpMethod.POST],
            integration: deleteCertIntegration,
            authorizer: httpAuthorizer
        });

        const checkCertStateIntegration = new HttpLambdaIntegration('CheckCertStateIntegration', check_cert_state_lambda_fn);
        ssl_HttpApi.addRoutes({
            path: '/api/check_cert_state',
            methods: [apigwv2.HttpMethod.POST],
            integration: checkCertStateIntegration,
            authorizer: httpAuthorizer
        });

        const event_restore = {
            event: RuleTargetInput.fromObject({
                "restore": true
            })
        }

        const invokeUrl = `https://${ssl_HttpApi.apiId}.execute-api.${Aws.REGION}.amazonaws.com.cn/`;

        master_lambda_fn.addEnvironment("API_EXPLORER", invokeUrl);

        new cdk.CfnOutput(this, 'Management-Web-URL', {
            value: invokeUrl.toString(),
            description: "Click to visit China CloudFront SSl Plugin Frontend"
        });

        new cdk.CfnOutput(this, 'Cloudfront-Console', {
            value: "https://console.amazonaws.cn/cloudfront",
            description: "Check IAM SSL Certification and use it in CloudFront, please find doc on: https://docs.amazonaws.cn/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-procedures.html#cnames-and-https-updating-cloudfront",
        });

    }
}