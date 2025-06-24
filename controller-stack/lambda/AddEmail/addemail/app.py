import os
import json
import boto3
import traceback
import logging

# Parameters
REGION = os.environ['REGION']
# # test only
cfn_client = boto3.client('cloudformation', region_name=REGION)
sns_client = boto3.client('sns', region_name=REGION)


def lambda_handler(event, context):
    try:
        logger = logging.getLogger()
        logger.setLevel(logging.ERROR)
        body = json.loads(event["body"])
        # Get stack name
        stack_name = body["ProjectName"] + "-CertBot"
        # Get new email
        email = body["Email"]
        # Get SNS arn
        stack_resources = cfn_client.describe_stack_resources(StackName=stack_name)[
            "StackResources"]  # [{resource dict}]
        for resource_dict in stack_resources:
            if resource_dict["ResourceType"] == "AWS::SNS::Topic":
                topic_arn = resource_dict["PhysicalResourceId"]
                # response_sns = sns_client.list_subscriptions_by_topic(TopicArn=topic_arn)
                # subscriptions = response['Subscriptions']
                # for subscription in subscriptions:
                #     subs_email = subscription['Endpoint']
                #     if email == subs_email:
                #         return return_502(subs_email+" Email already subscribed.")
                response = sns_client.subscribe(
                    TopicArn=topic_arn,
                    Protocol='email',
                    Endpoint=email
                )
                return {
                    "statusCode": 200,
                    "body": json.dumps({
                        "message": "Please check your email inbox."
                    }),
                }
        return return_502("Can't found ResourceType AWS::SNS::Topic in stack")
    except Exception as e:
        logger.error(traceback.format_exc())
        return return_502(traceback.format_exc().splitlines()[-1])


def return_502(e):
    return {
        "statusCode": 500,
        "body": json.dumps({
            "message": str(e),
        }),
    }
