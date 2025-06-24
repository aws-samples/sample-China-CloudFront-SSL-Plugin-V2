import boto3
import json
import logging
import os
import traceback

# Parameters
REGION = os.environ['REGION']

# clients
cfn_client = boto3.client('cloudformation', region_name=REGION)
ddb_client = boto3.client('dynamodb', region_name=REGION)
TABLE_NAME = os.environ['TABLE_NAME']

def lambda_handler(event, context):
    logger = logging.getLogger()
    logger.setLevel(logging.ERROR)
    # update stack parameters
    try:
        # get update info
        body = json.loads(event['body'])
        ProjectName = body['ProjectName']
        NewDomainNames = body['DomainNames']
        NewRenewInterval = body['RenewInterval']
        StackName = ProjectName + '-CertBot'
        cfn_response = cfn_client.update_stack(
            StackName=StackName,
            UsePreviousTemplate=True,
            Parameters=[
                {
                    'ParameterKey': 'projectName',
                    'UsePreviousValue': True,
                },
                {
                    'ParameterKey': 'domainName',
                    'ParameterValue': NewDomainNames,
                },
                {
                    'ParameterKey': 'emailAddress',
                    'UsePreviousValue': True,
                },
                {
                    'ParameterKey': 'renewIntervalDays',
                    'ParameterValue': NewRenewInterval,
                },
                {
                    'ParameterKey': 'dynamoDBTable',
                    'UsePreviousValue': True,
                },
                {
                    'ParameterKey': 'bucketName',
                    'UsePreviousValue': True,
                },
                {
                    'ParameterKey': 'bucketARN',
                    'UsePreviousValue': True,
                },
                {
                    'ParameterKey': 'apiExplorer',
                    'UsePreviousValue': True,
                }
            ],
            Capabilities=[
                'CAPABILITY_NAMED_IAM'
            ]
        )
        try:
            update_response = ddb_client.update_item(
                TableName=TABLE_NAME,
                Key={
                    "ProjectName": {"S": ProjectName},
                },
                AttributeUpdates={
                    "SuccessfullyIssued": {
                        'Value': {
                            "M": {"LambdaTriggerTime": {"S": ""},
                                  "LambdaRequestID": {"S": ""}, "ReplaceMsg": {"S": ""},
                                  "Status": {"S": "Processing"}}
                        },
                        'Action': 'PUT'
                    },
                }
            )
            logger.info(update_response)
        except Exception as e:
            logger.error(traceback.format_exc())
        finally:
            return {
                "statusCode": 200,
                "body": json.dumps({
                    "message": cfn_response,
                    "stack_name": StackName
                })
            }
    except Exception as e:
        logger.error(traceback.format_exc())
        return {
            "statusCode": 500,
            "body": json.dumps({
                "message": traceback.format_exc().splitlines()[-1]
            })
        }
