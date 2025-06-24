import logging
import os
import json
import boto3
import traceback
from datetime import timezone, timedelta

# Parameters
REGION = os.environ['REGION']
iam_client = boto3.client('iam')
bj_time = timezone(timedelta(hours=8))

def lambda_handler(event, context):
    try:
        logger = logging.getLogger()
        logger.setLevel(logging.ERROR)
        # Get request body
        body = json.loads(event['body'])
        # Get IAM Cert Path
        iam_cert_path = body["IAM_Path"]
        cert_dict_list = \
            iam_client.list_server_certificates(PathPrefix=f"{iam_cert_path}")[
                'ServerCertificateMetadataList']
        for project_cert in cert_dict_list:
            project_cert.pop('Path')
            project_cert.pop('Arn')
            project_cert['UploadDate'] = project_cert['UploadDate'].astimezone(bj_time).strftime(
                "%Y-%m-%d %H:%M")
            project_cert['Expiration'] = project_cert['Expiration'].astimezone(bj_time).strftime(
                "%Y-%m-%d %H:%M")
        return {
            "statusCode": 200,
            "body": json.dumps(cert_dict_list),
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