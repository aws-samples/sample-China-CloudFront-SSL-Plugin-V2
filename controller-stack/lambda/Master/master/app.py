import json
import boto3
import os
import traceback
import logging

PARENT_STACK = os.environ['PARENT_STACK']
TABLE_NAME = os.environ['TABLE_NAME']
S3_BUCKET = os.environ['S3_BUCKET']
API_EXPLORER = os.environ['API_EXPLORER']
REGION = os.environ['REGION']

cfn_client = boto3.client('cloudformation', region_name=REGION)
ddb_client = boto3.client('dynamodb', region_name=REGION)


def lambda_handler(event, context):
    logger = logging.getLogger()
    logger.setLevel(logging.ERROR)
    try:
        body = json.loads(event['body'])
        ProjectName = body['ProjectName']
        DomainNames = body['DomainNames']
        Emails = body['Emails']
        RenewInterval = body['RenewInterval']
        cfn_response = cfn_client.create_stack(
            StackName=ProjectName + '-CertBot',  # fixed
            TemplateURL='https://aws-cn-getting-started.s3.cn-northwest-1.amazonaws.com.cn/china-cloudfront-ssl-plugin_v2/ChinaCloudFrontSslPluginStack.template.json',
            Parameters=[
                {
                    'ParameterKey': 'apiExplorer',
                    'ParameterValue': API_EXPLORER,
                },
                {
                    'ParameterKey': 'projectName',
                    'ParameterValue': ProjectName,
                },
                {
                    'ParameterKey': 'domainName',
                    'ParameterValue': DomainNames,
                },
                {
                    'ParameterKey': 'emailAddress',
                    'ParameterValue': Emails,
                },
                {
                    'ParameterKey': 'renewIntervalDays',
                    'ParameterValue': RenewInterval,
                },
                {
                    'ParameterKey': 'dynamoDBTable',
                    'ParameterValue': TABLE_NAME,
                },
                {
                    'ParameterKey': 'bucketName',
                    'ParameterValue': S3_BUCKET,
                },
                {
                    'ParameterKey': 'bucketARN',
                    'ParameterValue': 'arn:aws-cn:s3:::' + S3_BUCKET, #ToDo account ID？
                },
            ],
            Capabilities=[
                'CAPABILITY_NAMED_IAM'
            ],
            Tags=[
                {
                    'Key': 'parent-stack',
                    'Value': PARENT_STACK
                },
            ],
        )
        try:
            ddb_response = ddb_client.put_item(
                TableName=TABLE_NAME,
                Item={
                    "ProjectName": {"S": ProjectName},
                    "SuccessfullyIssued": {"M": {"LambdaTriggerTime": {"S": ""}, "LambdaRequestID": {"S": ""}, "ReplaceMsg": {"S": ""}, "Status": {"S": "Processing"}}},
                    # "Status": ErrorMsg return from 502 exception | "Processing" | "Replace failed" | "Delete IAM failed" | "Success" | "None"
                }
            )
            logger.info(ddb_response)
        except Exception as e:
            logger.error(traceback.format_exc())
        finally:
            return {
                "statusCode": 200,
                "body": json.dumps({
                    "message": cfn_response,
                }),
            }
    except Exception as e:
        logger.error(traceback.format_exc())
        return {
            "statusCode": 500,
            "body": json.dumps({
                "message": traceback.format_exc().splitlines()[-1]
            })
        }
