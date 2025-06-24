import os
import boto3
import json
import logging
import traceback

# Parameters
REGION = os.environ['REGION']


def lambda_handler(event, context):

    logger = logging.getLogger()
    logger.setLevel(logging.ERROR)
    try:
        # Get request body
        body = json.loads(event['body'])
        # Get stack name
        stack_name = body["ProjectName"] + "-CertBot"
        cfn_client = boto3.client('cloudformation', region_name=REGION)
        response = cfn_client.describe_stacks(
            StackName=stack_name
        )
        parameters = response['Stacks'][0]["Parameters"]
        json_data = {item["ParameterKey"]: item["ParameterValue"] for item in parameters}
        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": response['Stacks'][0]['StackStatus'],
                "stack_info": json_data
            })
        }
    except Exception as e:
        logger.error(traceback.format_exc())
        # etype, evalue, tb = sys.exc_info()
        # logger.error(traceback.format_exception_only(etype, evalue))
        return {
            "statusCode": 500,
            "body": json.dumps({
                "message": traceback.format_exc().splitlines()[-1]
            })
        }
