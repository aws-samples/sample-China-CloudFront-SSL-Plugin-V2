import os
import json
import traceback

import boto3
import logging
from datetime import timezone, timedelta

# Parameters
DYNAMODB_TABLE = os.environ['DYNAMODB_TABLE']
S3_BUCKET = os.environ['S3_BUCKET']
REGION = os.environ['REGION']

# clients
cfn_client = boto3.client('cloudformation', region_name=REGION)
s3_client = boto3.client('s3')
iam_client = boto3.client('iam')
sns_client = boto3.client('sns', region_name=REGION)
dynamodb = boto3.resource('dynamodb', region_name=REGION)
bj_time = timezone(timedelta(hours=8))


def lambda_handler(event, context):
    # dynamodb table
    logger = logging.getLogger()
    logger.setLevel(logging.ERROR)
    try:
        logger.info("trying")
        ddb_table = dynamodb.Table(DYNAMODB_TABLE)
        ddb_response = ddb_table.scan()
        print(ddb_response)
        results = ddb_response['Items']
        display_rows = []
        delete_key = []
        for project in results:
            # project name
            project_name = project["ProjectName"]
            stack_name = project_name + '-CertBot'
            stack_paras = {"domainName": "", "renewIntervalDays": ""}
            try:
                stack = cfn_client.describe_stacks(StackName=stack_name)['Stacks'][0]
                stack_state = stack['StackStatus']
                parameters = stack["Parameters"]
                stack_paras = {item["ParameterKey"]: item["ParameterValue"] for item in parameters}
                stack_resources = cfn_client.describe_stack_resources(StackName=stack_name)[
                    "StackResources"]  # [{resource dict}]
                row = {
                    "Name": project_name,
                    "DomainName": stack_paras["domainName"],
                    "EmailList": [],
                    "CertListContent": [],
                    "RenewIntervalDays": stack_paras["renewIntervalDays"],
                    "Expire": None,
                    "s3path": "s3://" + S3_BUCKET + "/" + project_name + "/",
                    "SuccessfullyIssued": json.dumps(project["SuccessfullyIssued"]),
                    "SNSTopic": None,
                    "IAM_Path": f"/cloudfront/{REGION}/{stack_name}/",
                    "Stack_state": stack_state
                }
                for resource_dict in stack_resources:
                    if (resource_dict["ResourceType"] == "AWS::SNS::Topic"
                            and (resource_dict["ResourceStatus"] == "CREATE_COMPLETE" or resource_dict["ResourceStatus"] == "UPDATE_COMPLETE")):
                        topic_arn = resource_dict["PhysicalResourceId"]
                        row["SNSTopic"] = topic_arn
                        response = sns_client.list_subscriptions_by_topic(TopicArn=topic_arn)
                        subscriptions = response['Subscriptions']
                        for subscription in subscriptions:
                            row["EmailList"].append({"Endpoint": subscription['Endpoint'],
                                                     "SubscriptionArn": subscription['SubscriptionArn']})
                        break
                cert_dict_list = \
                    iam_client.list_server_certificates(PathPrefix=f"/cloudfront/{REGION}/{stack_name}/")[
                        'ServerCertificateMetadataList']
                expiration = None
                updated_date = None
                for project_cert in cert_dict_list:
                    project_cert.pop('Path')
                    project_cert.pop('Arn')
                    project_cert['UploadDate'] = project_cert['UploadDate'].astimezone(bj_time).strftime(
                        "%Y-%m-%d %H:%M")
                    project_cert['Expiration'] = project_cert['Expiration'].astimezone(bj_time).strftime(
                        "%Y-%m-%d %H:%M")
                    if expiration is None:
                        expiration = project_cert['Expiration']
                    else:
                        if project_cert['Expiration'] > expiration:
                            expiration = project_cert['Expiration']
                    if updated_date is None:
                        updated_date = project_cert['UploadDate']
                    else:
                        if project_cert['Expiration'] > expiration:
                            updated_date = project_cert['UploadDate']
                    row["Expire"] = expiration
                    row["Update"] = updated_date
                row["CertListContent"] = cert_dict_list
                display_rows.append(row)
                logger.info(row)
            except cfn_client.exceptions.ClientError as e:
                # Stack Not Exist
                if e.response['Error']['Code'] == 'ValidationError' and "does not exist" in str(
                        traceback.format_exc().splitlines()[-1]):
                    # row = {
                    #     "Name": project_name,
                    #     "DomainName": stack_paras["domainName"],
                    #     "EmailList": [],
                    #     "CertListContent": [],
                    #     "RenewIntervalDays": stack_paras["renewIntervalDays"],
                    #     "Update": None,
                    #     "Expire": None,
                    #     "s3path": "s3://" + S3_BUCKET + "/" + project_name + "/",
                    #     "SuccessfullyIssued": json.dumps(project["SuccessfullyIssued"]),
                    #     "SNSTopic": None,
                    #     "IAM_Path": f"/cloudfront/{REGION}/{stack_name}/"
                    # }
                    # display_rows.append(row)
                    delete_key.append(project_name)
                    # logger.info(row)
                else:
                    logger.error(traceback.format_exc())
                    return return_502(traceback.format_exc().splitlines()[-1])
        for project_name in delete_key:
            delete_response = ddb_table.delete_item(
                Key={"ProjectName": project_name}
            )
        # logger.info({"ddb": ddb_response})
        return {
            "statusCode": 200,
            "body": json.dumps(display_rows),
        }
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
