import logging
import os
import json
import boto3
import traceback

# Parameters
REGION = os.environ['REGION']
cfn_client = boto3.client('cloudformation', region_name=REGION)
sns_client = boto3.client('sns', region_name=REGION)

def lambda_handler(event, context):
    try:
        logger = logging.getLogger()
        logger.setLevel(logging.ERROR)
        # Get request body
        body = json.loads(event['body'])
        # Get stack name
        stack_name = body["ProjectName"] + "-CertBot"
        # Get SNS Email Subscription
        subscriptionlist = []
        stack_resources = cfn_client.describe_stack_resources(StackName=stack_name)[
            "StackResources"]  # [{resource dict}]
        for resource_dict in stack_resources:
            if resource_dict["ResourceType"] == "AWS::SNS::Topic":
                topic_arn = resource_dict["PhysicalResourceId"]
                response = sns_client.list_subscriptions_by_topic(TopicArn=topic_arn)
                subscriptions = response['Subscriptions']
                for subscription in subscriptions:
                    subscriptionlist.append(
                        {"Endpoint": subscription['Endpoint'], "SubscriptionArn": subscription['SubscriptionArn']})
                return {
                    "statusCode": 200,
                    "body": json.dumps(subscriptionlist),
                }
        return return_502("Can't find ResourceType AWS::SNS::Topic in stack")
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