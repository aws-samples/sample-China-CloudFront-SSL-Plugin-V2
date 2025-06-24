import json
import logging
import traceback
import boto3
import os

REGION = os.environ['REGION']
TABLE_NAME = os.environ['DYNAMODB_TABLE']

lambda_client = boto3.client('lambda', region_name=REGION)
cfn_client = boto3.client('cloudformation', region_name=REGION)
ddb_client = boto3.client('dynamodb', region_name=REGION)

def lambda_handler(event, context):

    try:
        logger = logging.getLogger()
        logger.setLevel(logging.ERROR)
        body = json.loads(event['body'])
        ProjectName = body['ProjectName']

        stack_resources = cfn_client.describe_stack_resources(StackName=ProjectName + '-CertBot')[
            "StackResources"]  # [{resource dict}]
        for resource_dict in stack_resources:
            if resource_dict["ResourceType"] == "AWS::Lambda::Function":
                function_name = resource_dict["PhysicalResourceId"]
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
                response = lambda_client.invoke(FunctionName=function_name,InvocationType='Event')
                return {
                    "statusCode": 200,
                    "body": json.dumps({
                        "message": str(response),
                    }),
                }
        return {
            "statusCode": 500,
            "body": json.dumps({
                "message": "Failed to invoke lambda",
            }),
        }
    except Exception as ex:
        logger.error(traceback.format_exc())
        return return_502(traceback.format_exc().splitlines()[-1])

def return_502(e):
    return {
        "statusCode": 500,
        "body": json.dumps({
            "message": str(e),
        }),
    }