import logging
import os
import json
import boto3
import traceback

# Parameters
REGION = os.environ['REGION']
iam_client = boto3.client('iam')

def lambda_handler(event, context):
    try:
        logger = logging.getLogger()
        logger.setLevel(logging.ERROR)
        # Get request body
        body = json.loads(event['body'])
        # Get CertName
        cert_to_delete = body["CertName"]
        delete_ssl_res = iam_client.delete_server_certificate(ServerCertificateName=cert_to_delete)
        if delete_ssl_res["ResponseMetadata"]["HTTPStatusCode"] == 200:
            return {
                "statusCode": 200,
                "body": cert_to_delete,
            }
        else:
            logger.error("Delete_SSL_Res_Error:" + delete_ssl_res["ResponseMetadata"])
            return_502(delete_ssl_res["ResponseMetadata"])
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