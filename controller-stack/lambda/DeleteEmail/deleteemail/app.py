import logging
import os
import json
import boto3
import traceback

# Parameters
REGION = os.environ['REGION']
# # test only
# stack_name = "TestProject-CertBot"
# clients
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
        # Get the email to delete
        email_to_delete = body["Email"]
        # Get SNS arn
        stack_resources = cfn_client.describe_stack_resources(StackName=stack_name)["StackResources"] # [{resource dict}]
        for resource_dict in stack_resources:
            if resource_dict["ResourceType"] == "AWS::SNS::Topic":
                topic_arn = resource_dict["PhysicalResourceId"]
                response = sns_client.list_subscriptions_by_topic(TopicArn=topic_arn)
                subscriptions = response['Subscriptions']
                for subscription in subscriptions:
                    subs_email = subscription['Endpoint']
                    if subs_email == email_to_delete:
                        subscription_arn = subscription["SubscriptionArn"]
                        if subscription_arn=="PendingConfirmation":
                            return return_502("Email " + email_to_delete + " is pending confirmation.")
                        else:
                            sns_client.unsubscribe(SubscriptionArn=subscription_arn)
                            return {
                                "statusCode": 200,
                                "body": json.dumps({
                                    "message": "Email " + email_to_delete + " successfully deleted."
                            })
                        }
                return return_502("Can't find " + email_to_delete + "in Subscriptions")
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