import json
import logging
import os
import tarfile
import traceback
from datetime import datetime, timezone, timedelta
import sys
import boto3
import certbot.main
import subprocess

DOMAINS_LIST = os.environ["DOMAINS_LIST"]
PROJECT_NAME = os.environ["PROJECT_NAME"]
DOMAINS_EMAIL = os.environ["DOMAINS_EMAIL"]
REGION = os.environ["REGION"]
DYNAMODB_TABLE = os.environ["DYNAMODB_TABLE"]
CERTBOT_BUCKET = os.environ["CERTBOT_BUCKET"]
TOPIC_ARN = os.environ["TOPIC_ARN"]
API_EXPLORER = os.environ["API_EXPLORER"]

MAX_ITEMS = 50
PAGE_SIZE = 50

# Temp dir of Lambda runtime
STACK_NAME = PROJECT_NAME + "-CertBot"
CERTBOT_DIR = '/tmp/certbot'

s3_link = f"https://{REGION}.console.amazonaws.cn/s3/buckets/{CERTBOT_BUCKET}/{PROJECT_NAME}"
iam_cert_path = f"/cloudfront/{REGION}/{STACK_NAME}/"

logger = logging.getLogger()
logger.setLevel(logging.ERROR)

# Get trigger time
bj_time = timezone(timedelta(hours=8))
lambda_trigger_time = datetime.now(bj_time).strftime("%Y-%m-%d %H:%M:%S")

# Get S3/SNS/IAM/CDN/DDB clients
s3_client = boto3.client('s3', region_name=REGION)
sns_client = boto3.client('sns', region_name=REGION)
iam_client = boto3.client('iam', region_name=REGION)
cdn_client = boto3.client('cloudfront')
ddb_client = boto3.client('dynamodb', region_name=REGION)
dynamodb = boto3.resource('dynamodb')
ddb_table = dynamodb.Table(DYNAMODB_TABLE)

def lambda_handler(event, context):
    try:
        logger.info("Domain list is [{}]".format(DOMAINS_LIST))
        update_ddb(context.aws_request_id, "", "Processing")
        if (DOMAINS_LIST != '') and (DOMAINS_EMAIL != ''):
            subprocess.run(["rm", "-rf", CERTBOT_DIR], check=True)
            subprocess.run(["mkdir", "-p", CERTBOT_DIR], check=True)
            return request_certs(DOMAINS_LIST, DOMAINS_EMAIL, context)
        else:
            return return_502(context.aws_request_id, "Invalid Domain list or Domain Email")
    except Exception as e:
        logger.error(traceback.format_exc())
        return return_502(context.aws_request_id, traceback.format_exc().splitlines()[-1])


def request_certs(domains, email, context):
    domains = domains.replace(" ", "")
    logger.info(f"Function: request_certs, {domains}")

    s3_client.put_object(Bucket=CERTBOT_BUCKET, Key=(PROJECT_NAME + '/'))

    certbot_args = [
        '--config-dir', CERTBOT_DIR + "/config",
        '--work-dir', CERTBOT_DIR + "/work",
        '--logs-dir', CERTBOT_DIR + "/logs",

        '--cert-name', "ssl",

        # Obtain a cert but don't install it
        'certonly',

        # Run in non-interactive mode
        '--non-interactive',

        # Agree to the terms of service
        '--agree-tos',

        # Email of domain administrators
        '--email', email,

        # Use dns challenge with dns plugin
        '--dns-route53',
        # '--dns-route53-propagation-seconds', '60',
        '--preferred-challenges', 'dns-01',

        # Use this server instead of default acme-v01
        # '--server', CERTBOT_SERVER,

        # Domains to provision certs for (comma separated)
        '--domains', domains,
    ]

    try:
        cert_code = certbot.main.main(certbot_args)
    except certbot.errors.AuthorizationError as e:
        logger.error(e)
        if str(e) == "Some challenges have failed.":
            certbot_args_again = [
                '--config-dir', CERTBOT_DIR + "/config",
                '--work-dir', CERTBOT_DIR + "/work",
                '--logs-dir', CERTBOT_DIR + "/logs",

                '--cert-name', "ssl",

                # Obtain a cert but don't install it
                'certonly',

                # Run in non-interactive mode
                '--non-interactive',

                # Agree to the terms of service
                '--agree-tos',

                # Email of domain administrators
                '--email', email,

                # Use dns challenge with dns plugin
                '--dns-route53',
                # '--dns-route53-propagation-seconds', '720',
                '--preferred-challenges', 'dns-01',
                '--issuance-timeout', '900',

                # Use this server instead of default acme-v01
                # '--server', CERTBOT_SERVER,

                # Domains to provision certs for (comma separated)
                '--domains', domains

                # '--dry-run'
            ]
            cert_code = certbot.main.main(certbot_args_again)
        else:
            raise e

    logger.info(f"CertBot request exec code: {cert_code}")

    # None represent Success
    if cert_code is None:
        now = get_now_time()
        expiration_datetime = now + timedelta(days=89, hours=23)
        expiration_date = expiration_datetime.strftime("%Y-%m-%d-%H%M")
        expiration_date_text = expiration_datetime.strftime("%Y-%m-%d %H:%M")
        # Data Structure: previous_iam_certificate_list, {IAM_ID: IAM_NAME}
        previous_iam_certificate_list = {}
        list_cert_paginator = iam_client.get_paginator('list_server_certificates')
        previous_iam_certificate_list = get_previous_iam_certificate(previous_iam_certificate_list, list_cert_paginator,
                                                                     None)
        logger.info(f"Length: previous_iam_certificate_list: {len(previous_iam_certificate_list)}")

        iam_ssl_name = PROJECT_NAME + '-' + expiration_date
        upload_iam_certificate(now, iam_ssl_name, domains)
        iam_ssl_id = get_iam_ssl_id(iam_ssl_name)
        replace_msg, status = replace_cloudfront_ssl(iam_ssl_id, previous_iam_certificate_list)
        update_ddb(context.aws_request_id, replace_msg, status)
        sns_notification = send_confirm_notification(domains, expiration_date_text, iam_ssl_name, iam_ssl_id,
                                                     replace_msg)
        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": f"Success request new cert {domains}",
                "notification": sns_notification,
            }),
        }
    else:
        e = f"[Error]CertBot request exec code: {cert_code}"
        logger.error(e)
        return return_502(context.aws_request_id, e)


def create_sns_subscription(email):
    sns_client.subscribe(
        TopicArn=TOPIC_ARN,
        Protocol='email',
        Endpoint=email
    )

def update_ddb(lambda_request_id, message, status):
    try:
        ddb_table.update_item(
            Key={
                'ProjectName': PROJECT_NAME,
            },
            UpdateExpression='SET SuccessfullyIssued = :val1',
            ExpressionAttributeValues={
                ':val1': {
                    "LambdaTriggerTime": lambda_trigger_time,
                    "LambdaRequestID": str(lambda_request_id),
                    "ReplaceMsg": message,
                    "Status": status
                }
            }
        )
        return

    except Exception as e:
        logger.error(traceback.format_exc())
        return



def send_error_notification(msg):
    subject = f"Error for request SSL certification with {PROJECT_NAME} project."

    logger.info(f"Function: send_error_notification: SUBJECT: {subject}, MSG: {msg}")

    response = sns_client.publish(
        TopicArn=TOPIC_ARN,
        Message=msg,
        Subject=subject,
    )
    return response


def return_502(aws_request_id, e):
    sns_error_notification = send_error_notification(str(e))
    update_ddb(aws_request_id, "", str(e))
    return {
        "statusCode": 502,
        "body": json.dumps({
            "message": str(e),
            "notification": sns_error_notification,
        }),
    }


def get_now_time():
    bj_time = timezone(timedelta(hours=8))
    now = datetime.now(bj_time)
    return now


def get_previous_iam_certificate(previous_cert_list, list_cert_paginator, marker):
    logger.info("Function: get_previous_iam_certificate")
    try:
        if marker:
            list_cert_res_iterator = list_cert_paginator.paginate(
                PathPrefix=iam_cert_path,
                PaginationConfig={
                    'MaxItems': MAX_ITEMS,
                    'PageSize': PAGE_SIZE,
                    'StartingToken': marker
                }
            )
        else:
            list_cert_res_iterator = list_cert_paginator.paginate(
                PathPrefix=iam_cert_path,
                PaginationConfig={
                    'MaxItems': MAX_ITEMS,
                    'PageSize': PAGE_SIZE,
                }
            )
        for list_cert_res in list_cert_res_iterator:
            if list_cert_res["ResponseMetadata"]["HTTPStatusCode"] == 200:
                cert_list = list_cert_res["ServerCertificateMetadataList"]
                for cert in cert_list:
                    previous_cert_list[cert["ServerCertificateId"]] = cert["ServerCertificateName"]
                if list_cert_res['IsTruncated']:
                    return get_previous_iam_certificate(previous_cert_list, list_cert_paginator,
                                                        list_cert_res['Marker'])
        return previous_cert_list
    except Exception as e:
        raise e


def upload_iam_certificate(now, iam_ssl_name, domains):
    logger.info("Function: upload_iam_certificate")
    upload_iam_cert_response = iam_client.upload_server_certificate(
        Path=iam_cert_path,
        ServerCertificateName=iam_ssl_name,
        CertificateBody=get_file_contents(CERTBOT_DIR + "/config/live/ssl/cert.pem"),
        PrivateKey=get_file_contents(CERTBOT_DIR + "/config/live/ssl/privkey.pem"),
        CertificateChain=get_file_contents(CERTBOT_DIR + "/config/live/ssl/chain.pem"),
        Tags=[
            {
                'Key': "parent-stack",
                'Value': "ChinaCloudFrontSslPluginStackV2" # parent_stack
            }
        ]
    )
    logger.info(upload_iam_cert_response)

    folder_time = now.strftime("%Y-%m-%d-%H%M")
    tar_file_name = f"{folder_time}.tar.gz"
    tar_file_path = f"/tmp/{tar_file_name}"
    logger.info(f"Tar file: {tar_file_path}")
    tar_file = tarfile.open(tar_file_path, "w:gz")
    tar_file.add(CERTBOT_DIR)
    tar_file.close()
    s3_client.upload_file(tar_file_path, CERTBOT_BUCKET, PROJECT_NAME + "/" + tar_file_name)


def delete_previous_iam_certificate(previous_iam_certificate_name_list, replace_msg):
    status = "Processing"
    if len(previous_iam_certificate_name_list)==0:
        status = "Succeeded"
    for last_iam_ssl_name in previous_iam_certificate_name_list:
        try:
            delete_ssl_res = iam_client.delete_server_certificate(ServerCertificateName=last_iam_ssl_name)
            if delete_ssl_res["ResponseMetadata"]["HTTPStatusCode"] == 200:
                replace_msg["Delete_Previous_IAM_SSL_Cert"][last_iam_ssl_name] = f"Successfully deleted IAM SSL Cert."
                status = "Succeeded"
            else:
                logger.error("Delete_SSL_Res_Error:" + delete_ssl_res["ResponseMetadata"])
                status = "Delete IAM failed"
                replace_msg["Delete_Previous_IAM_SSL_Cert"][last_iam_ssl_name] = delete_ssl_res["ResponseMetadata"]
        except Exception as e:
            logger.error("Delete_IAM_Cert_Error:" + traceback.format_exc())
            status = "Delete IAM failed"
            replace_msg["Delete_Previous_IAM_SSL_Cert"][last_iam_ssl_name] = traceback.format_exc()
    return replace_msg, status


def get_file_contents(filename):
    logger.info(f"Function: get_file_contents {filename}")
    in_file = open(filename, "rb")
    data = in_file.read()
    in_file.close()
    return data.decode("utf-8")


def get_iam_ssl_id(iam_ssl_name):
    logger.info("Function: get_iam_ssl_id")
    iam_ssl_info = iam_client.get_server_certificate(ServerCertificateName=iam_ssl_name)
    iam_ssl_id = iam_ssl_info["ServerCertificate"]["ServerCertificateMetadata"]["ServerCertificateId"]
    return iam_ssl_id


def replace_cloudfront_ssl(new_iam_ssl_id, previous_iam_cert):
    logger.info("Function: replace_cloudfront_ssl")
    replace_msg = {"Previous_IAM_SSL_Info": "No Previous IAM SSL Information", "Matched_CloudFront": {},
                   "Update_CloudFront_Status": [],
                   "Delete_Previous_IAM_SSL_Cert": {}}
    error_tag = False
    status = "Processing"

    if len(previous_iam_cert) > 0:
        last_iam_ssl_id_list = list(previous_iam_cert.keys())
        last_iam_ssl_name_list = list(previous_iam_cert.values())
        replace_msg["Previous_IAM_SSL_Info"] = {"IAM_SSL_ID": last_iam_ssl_id_list,
                                                "IAM_SSL_NAME": last_iam_ssl_name_list}
        # Match Previous SSL ID
        list_dist_paginator = cdn_client.get_paginator('list_distributions')
        replace_dist_id_list = {"dist_list": [], "error_list": []}
        replace_dist_id_list = get_replaced_cloudfront(last_iam_ssl_id_list,
                                                       list_dist_paginator,
                                                       replace_dist_id_list,
                                                       None)
        logger.info(f"Length replace_dist_id_list: {len(replace_dist_id_list['dist_list'])}")

        if len(replace_dist_id_list["error_list"]) == 0 and len(replace_dist_id_list["dist_list"]) == 0:
            replace_msg["Matched_CloudFront"] = f"No Matched CloudFront on IAM Cert ID {last_iam_ssl_id_list}"
            status = "Succeeded"
        elif len(replace_dist_id_list["error_list"]) != 0:
            replace_msg["Matched_CloudFront"]["Error"] = replace_dist_id_list["error_list"]
            status = "Replace failed"
        elif len(replace_dist_id_list["dist_list"]) != 0:
            replace_msg["Matched_CloudFront"]["ID_LIST"] = replace_dist_id_list["dist_list"]

        # Get CloudFront Config and Modify
        for dist_id in replace_dist_id_list["dist_list"]:
            try:
                dist_config_res = cdn_client.get_distribution_config(Id=dist_id)
                logger.info(f'get_dist_config_res:{dist_id},{dist_config_res["ResponseMetadata"]}')
                if dist_config_res["ResponseMetadata"]["HTTPStatusCode"] == 200:
                    ETag = dist_config_res["ETag"]
                    dist_config = dist_config_res["DistributionConfig"]
                    dist_config["ViewerCertificate"]["IAMCertificateId"] = new_iam_ssl_id
                    update_dist_res = cdn_client.update_distribution(Id=dist_id, IfMatch=ETag,
                                                                     DistributionConfig=dist_config)
                    logger.info(
                        f'update_dist_res:{dist_id},{update_dist_res["ResponseMetadata"]}')
                    if update_dist_res["ResponseMetadata"]["HTTPStatusCode"] == 200:
                        updated_dist_config = update_dist_res["Distribution"]["DistributionConfig"]
                        if "IAMCertificateId" in updated_dist_config["ViewerCertificate"] and \
                                updated_dist_config["ViewerCertificate"]["IAMCertificateId"] == new_iam_ssl_id:
                            replace_msg["Update_CloudFront_Status"].append(
                                {dist_id: "Success"})
                        else:
                            error_tag = True
                            logger.error(f"Update_Dist_Failed {dist_id}: " + updated_dist_config)
                            replace_msg["Update_CloudFront_Status"].append(
                                {dist_id: "Failed"})
                    else:
                        error_tag = True
                        logger.error("Update_Dist_Error:" + update_dist_res["ResponseMetadata"])
                        replace_msg["Update_CloudFront_Status"].append(
                            {dist_id: {"Update_Dist_Error": update_dist_res["ResponseMetadata"]}})
                else:
                    error_tag = True
                    logger.error("Get_Dist_Error:" + dist_config_res["ResponseMetadata"])
                    replace_msg["Update_CloudFront_Status"].append(
                        {dist_id: {"Get_Dist_Error": dist_config_res["ResponseMetadata"]}})
            except Exception as e:
                error_tag = True
                logger.error(traceback.format_exc())
                replace_msg["Update_CloudFront_Status"].append({dist_id: traceback.format_exc()})

        # If no any error delete IAM Cert
        if not error_tag:
            replace_msg, status = delete_previous_iam_certificate(last_iam_ssl_name_list, replace_msg)
        else:
            status = "Replace failed"
            replace_msg["Delete_Previous_IAM_SSL_Cert"] = "Due to a failed CloudFront certificate renewal, please update " \
                                                      "it and then delete the old SSL Cert ."
    else:
        status = "Succeeded"
    return replace_msg, status


def get_replaced_cloudfront(last_iam_ssl_id, list_dist_paginator, replace_dist_id_list, marker):
    logger.info("Function: get_replaced_cloudfront")
    try:
        if marker:
            list_dist_res_iterator = list_dist_paginator.paginate(
                PaginationConfig={
                    'MaxItems': MAX_ITEMS,
                    'PageSize': PAGE_SIZE,
                    'StartingToken': marker
                }
            )
        else:
            list_dist_res_iterator = list_dist_paginator.paginate(
                PaginationConfig={
                    'MaxItems': MAX_ITEMS,
                    'PageSize': PAGE_SIZE,
                }
            )
        for list_cdn_res in list_dist_res_iterator:
            if list_cdn_res["ResponseMetadata"]["HTTPStatusCode"] == 200:
                dist_list = list_cdn_res["DistributionList"]
                if dist_list["Quantity"] > 0:
                    dist_items = dist_list["Items"]
                    for item in dist_items:
                        if "IAMCertificateId" in item["ViewerCertificate"] and \
                                item["ViewerCertificate"]["IAMCertificateId"] in last_iam_ssl_id:
                            replace_dist_id_list["dist_list"].append(item["Id"])
                if dist_list['IsTruncated']:
                    return get_replaced_cloudfront(last_iam_ssl_id, list_dist_paginator, replace_dist_id_list,
                                                   dist_list['NextMarker'])
                else:
                    return replace_dist_id_list
            else:
                logger.error("List_Dist_Res_Error:" + list_cdn_res["ResponseMetadata"])
                replace_dist_id_list["error_list"].append(list_cdn_res["ResponseMetadata"])
        return replace_dist_id_list
    except Exception as e:
        raise e


def send_confirm_notification(domains, expiration_date, iam_ssl_name, iam_ssl_id, update_cdn_msg):
    subject = f"Success request SSL certification for {PROJECT_NAME} project."
    msg = f'The certificate automatically generated for your domain [ {domains} ] is successful. \n\nPlease find your SSL certificate "{iam_ssl_name}" (ID: {iam_ssl_id}) on CloudFront dashboard, and attach it in time. \n\nThe certificate is valid until (UTC+8): {expiration_date}\n\n'

    msg = msg + f'自动为您域名: [ {domains} ] \n\n生成的证书已成功。请及时在CloudFront页面中找到您的SSL证书："{iam_ssl_name}" (ID: {iam_ssl_id})，并为您的CloudFront分配绑定您的证书。\n\n证书有效期截止(北京时间)：{expiration_date}\n\n'

    msg = msg + "CloudFront Update SSL Certificate Doc/ CloudFront绑定证书操作文档: \nhttps://docs.amazonaws.cn/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-procedures.html#cnames-and-https-updating-cloudfront\n\n"

    msg = msg + "#############SSL Renew Information / 证书更新信息##############\n\n"

    msg = msg + "If the SSL certificate has already been attached, please review the following automatic update " \
                "records to ensure that the CloudFront certificate that has been updated. If all certificates have " \
                "been successfully updated, you can delete the expired certificates via IAM SSL Certificate Management.\n\n"

    msg = msg + "如果该证书已经绑定CloudFront，请查看以下自动更新记录，确保全部绑定的CloudFront证书已经更新。如果证书都已更新完毕，您可以通过管理界面删除过期的证书。"

    msg = msg + "\n\n=====CloudFront SSL Certificate Renew Records======\n" + json.dumps(
        update_cdn_msg, indent=4)

    msg = msg + "\n\n=================Records Ends=================\n\n"

    msg = msg + "\n\n###########################\n\n"

    msg = msg + "If there are errors in the renew list, please refer to the troubleshooting section in the deployment documentation.\n若更新列表中出现错误，请参考部署文档中的问题排查。\n\n"

    msg = msg + f"Download SSL Certificate From S3 / 从S3下载证书：\n {s3_link} \n"

    msg = msg + f"IAM SSL Certificate Management / IAM SSL证书管理界面：\n {os.environ['API_EXPLORER']} \n"

    logger.info(f"Function: send_confirm_notification: SUBJECT: {subject}, MSG: {msg}")

    response = sns_client.publish(
        TopicArn=TOPIC_ARN,
        Message=msg,
        Subject=subject,
    )
    return response
