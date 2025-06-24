import os
import logging
import boto3
import json
import traceback

REGION = os.environ["REGION"]
DYNAMODB_TABLE = os.environ["DYNAMODB_TABLE"]

MAX_ITEMS = 50
PAGE_SIZE = 50

s3_client = boto3.client('s3', region_name=REGION)
iam_client = boto3.client('iam', region_name=REGION)
cfn_client = boto3.client('cloudformation', region_name=REGION)
logger = logging.getLogger()


def lambda_handler(event, context):
    # delete stack
    try:
        # get delete info
        logger.setLevel(logging.ERROR)

        body = json.loads(event['body'])
        ProjectName = body['ProjectName']
        StackName = ProjectName + '-CertBot'

        logger.info(f"Start deleting project {ProjectName}")

        # delete iam certificate
        list_cert_paginator = iam_client.get_paginator('list_server_certificates')
        delete_cert_list = {}
        delete_cert_list = get_iam_certificate(StackName,
                                               list_cert_paginator,
                                               delete_cert_list,
                                               None)
        delete_iam_certificate(delete_cert_list)
        cfn_client.delete_stack(
            StackName=StackName,
        )
    except Exception as e:
        return return_502(traceback.format_exc().splitlines()[-1])
    return {
            "statusCode": 200,
            "body": json.dumps({
                "message": f"Successfully delete {ProjectName}",
            }),
        }

def return_502(e):
    return {
        "statusCode": 502,
        "body": json.dumps({
            "message": str(e),
        }),
    }

def get_iam_certificate(StackName, list_cert_paginator, delete_cert_list, marker):

    logger.info("Function: get_iam_certificate")

    try:
        if marker:
            list_cert_res_iterator = list_cert_paginator.paginate(
                PathPrefix=f"/cloudfront/{REGION}/{StackName}/",
                PaginationConfig={
                    'MaxItems': MAX_ITEMS,
                    'PageSize': PAGE_SIZE,
                    'StartingToken': marker
                }
            )
        else:
            list_cert_res_iterator = list_cert_paginator.paginate(
                PathPrefix=f"/cloudfront/{REGION}/{StackName}/",
                PaginationConfig={
                    'MaxItems': MAX_ITEMS,
                    'PageSize': PAGE_SIZE,
                }
            )

        for list_cert_res in list_cert_res_iterator:
            if list_cert_res["ResponseMetadata"]["HTTPStatusCode"] == 200:
                cert_list = list_cert_res["ServerCertificateMetadataList"]
                for cert in cert_list:
                    delete_cert_list[cert["ServerCertificateId"]] = cert["ServerCertificateName"]
                if list_cert_res['IsTruncated']:
                    return get_iam_certificate(delete_cert_list, list_cert_paginator, list_cert_res['Marker'])
        return delete_cert_list

    except Exception as e:
        raise e

def delete_iam_certificate(delete_cert_list):
    logger.info(delete_cert_list)
    logger.info(list(delete_cert_list.values()))
    for iam_certificate_name in list(delete_cert_list.values()):
        try:
            delete_ssl_res = iam_client.delete_server_certificate(
                ServerCertificateName=iam_certificate_name
            )
            if delete_ssl_res["ResponseMetadata"]["HTTPStatusCode"] != 200:
                logger.error("Delete_SSL_Res_Error:" + delete_ssl_res["ResponseMetadata"])
        except Exception as e:
            logger.error("Delete_IAM_Cert_Error:" + traceback.format_exc())