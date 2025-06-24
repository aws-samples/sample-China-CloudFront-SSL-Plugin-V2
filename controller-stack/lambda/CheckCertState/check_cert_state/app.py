import os
import boto3
import json
import logging
import traceback

# Parameters
DYNAMODB_TABLE = os.environ['DYNAMODB_TABLE']
REGION = os.environ['REGION']
dynamodb = boto3.resource('dynamodb', region_name=REGION)


def lambda_handler(event, context):

    logger = logging.getLogger()
    logger.setLevel(logging.ERROR)
    try:
        # Get request body
        body = json.loads(event['body'])
        # Get stack name and cert name
        project_name = body["ProjectName"]
        # Get cert status from ddb
        ddb_table = dynamodb.Table(DYNAMODB_TABLE)
        ddb_response = ddb_table.get_item(
            Key={
                'ProjectName': project_name
            },
        )
        item = ddb_response['Item']
        logger.info(f"Get item: {item}")
        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": item['SuccessfullyIssued'],
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
