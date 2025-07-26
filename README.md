# China CloudFront SSL Plugin V2

The China CloudFront SSL Plugin V2 is an enhanced solution from Amazon Web Services in the China region that helps you generate, update, and manage free SSL/TLS certificates. It provides seamless integration with Amazon CloudFront and automates the process of updating associated SSL certificates. This solution uses a serverless architecture and leverages open-source tools to provide a cost-effective way to secure your web applications.

## Features

- **Cost-Effective**: Built using serverless architecture and open-source tools, it incurs minimal charges based on the invocation of serverless services, with a default renewal cycle of every 80 days.
  - *This solution adopts a serverless architecture with nearly zero cost for each certificate issuance, including serverless resource execution costs, minimal Amazon S3 storage cost, Amazon DynamoDB cost, and Amazon CloudWatch log storage cost. However, domain control validation requires a fee of approximately 3.575 RMB per month for using Amazon Route 53 for domain hosting.*

- **Simplified Deployment**: The V2 solution features a two-stack architecture (certbot-stack and controller-stack) for better separation of concerns and enhanced maintainability.

- **Enhanced Management**: Improved certificate management capabilities with a more robust API interface and management console.

- **Open Source**: All the code within this solution is provided in an open-source manner, allowing for customization based on your specific needs.

## Architecture Diagram

![Architecture Diagram](China%20CloudFront%20SSL%20Plugin%20V2%20-%20EN.png)

## Solution Components

This solution automates the deployment of serverless resources using Amazon CloudFormation templates, divided into two main stacks:

### 1. Certbot Stack
Handles the certificate issuance and renewal process using Let's Encrypt and Certbot.

- **Let's Encrypt**: A free, open, and automated certificate authority (CA).
- **Certbot**: A free open-source software tool that automates the process of obtaining, deploying, and renewing SSL certificates issued by Let's Encrypt.
- **Amazon Lambda**: Runs the Certbot certificate issuance and renewal process.
- **Amazon Route 53**: Used for domain name resolution and DNS validation.
- **Amazon EventBridge**: Triggers certificate renewal at regular intervals (default every 80 days).

### 2. Controller Stack
Manages certificate storage, distribution, and API interfaces.

- **Amazon SNS**: Sends email notifications about certificate issuance status.
- **Amazon API Gateway**: Integrates and manages SSL certificate operations, providing a callable interface.
- **Amazon S3**: Stores backup SSL certificates for download.
- **IAM SSL Certificate Storage**: Stores SSL certificates associated with Amazon CloudFront.
- **Amazon CloudFront Integration**: Automatically updates SSL certificates in CloudFront distributions.
- **Lambda Functions**: Features of Lambda functions in the controller stack are as follow.

| Lambda Function Name | Feature |
|-----------------|----------------|
| AddEmail | Add notification email addresses for a specified project |
| Authorizer | Management interface and API authentication |
| CheckCertState | Search DynamoDB by project name to get the latest certificate issuance status |
| CheckStackState | Get the status of associated stacks by project name |
| DataProvider | Get homepage data and list items |
| DeleteCert | Input certificate name and delete it |
| DeleteEmail | Delete notification emails for a specified project by inputting email address |
| DeleteProject | Delete certificate issuance project and associated sub-stacks |
| FrontEnd | Function for running the frontend management page |
| GetCertByPath | Get associated information for all certificates under a certificate path |
| GetMailByProject | Get associated email addresses by project name |
| Master | Create certificate issuance stack based on project name, email address, and other information |
| TriggerCertbot | Trigger certificate issuance function, used for manually renewing certificates |
| UpdateProject | Update project information, i.e., related information of the certificate issuance stack |

## Directory Structure

| Directory                       | Description                                                  |
|---------------------------------|--------------------------------------------------------------|
| [certbot-stack/cdk](./certbot-stack/cdk/)         | CDK code for generating the Certbot stack CloudFormation template |
| [certbot-stack/lambda](./certbot-stack/lambda/)   | Lambda code for Let's Encrypt/Certbot certificate issuance |
| [controller-stack/cdk](./controller-stack/cdk/)   | CDK code for generating the Controller stack CloudFormation template |
| [controller-stack/lambda](./controller-stack/lambda/) | Lambda code for IAM Certificate Management and API interfaces |

The .zip archives of all the Lambda functions used in this solution can be found in:

| Lambda Function        | Beijing region S3 URL       | Ningxia region S3 URL   |
|-----------------|----------------|------------------------------|
| AddEmail | [addemail-bj-s3-url](https://cn-north-1-cloudfront-ssl-plugin-code.s3.cn-north-1.amazonaws.com.cn/v2/code/addemail.zip) | [addemail-nx-s3-url](https://cn-northwest-1-cloudfront-ssl-plugin-code.s3.cn-northwest-1.amazonaws.com.cn/v2/code/addemail.zip) |
| Authorizer | [authorizer-bj-s3-url](https://cn-north-1-cloudfront-ssl-plugin-code.s3.cn-north-1.amazonaws.com.cn/v2/code/authorizer.zip) | [authorizer-nx-s3-url](https://cn-northwest-1-cloudfront-ssl-plugin-code.s3.cn-northwest-1.amazonaws.com.cn/v2/code/authorizer.zip) |
| Certbot | [certbot-bj-s3-url](https://cn-north-1-cloudfront-ssl-plugin-code.s3.cn-north-1.amazonaws.com.cn/v2/code/certbot-arm64.zip) | [certbot-nx-s3-url](https://cn-northwest-1-cloudfront-ssl-plugin-code.s3.cn-northwest-1.amazonaws.com.cn/v2/code/certbot-arm64.zip) |
| CheckCertState | [checkcertstate-bj-s3-url](https://cn-north-1-cloudfront-ssl-plugin-code.s3.cn-north-1.amazonaws.com.cn/v2/code/checkcertstate.zip) | [checkcertstate-nx-s3-url](https://cn-northwest-1-cloudfront-ssl-plugin-code.s3.cn-northwest-1.amazonaws.com.cn/v2/code/check_cert_state.zip) |
| CheckStackState | [checkstackstate-bj-s3-url](https://cn-north-1-cloudfront-ssl-plugin-code.s3.cn-north-1.amazonaws.com.cn/v2/code/check_stack_state.zip) | [checkstackstate-nx-s3-url](https://cn-northwest-1-cloudfront-ssl-plugin-code.s3.cn-northwest-1.amazonaws.com.cn/v2/code/check_stack_state.zip) |
| DataProvider | [dataprovider-bj-s3-url](https://cn-north-1-cloudfront-ssl-plugin-code.s3.cn-north-1.amazonaws.com.cn/v2/code/dataprovider.zip) | [dataprovider-nx-s3-url](https://cn-northwest-1-cloudfront-ssl-plugin-code.s3.cn-northwest-1.amazonaws.com.cn/v2/code/dataprovider.zip) |
| DeleteCert | [deletecert-bj-s3-url](https://cn-north-1-cloudfront-ssl-plugin-code.s3.cn-north-1.amazonaws.com.cn/v2/code/deletecert.zip) | [deletecert-nx-s3-url](https://cn-northwest-1-cloudfront-ssl-plugin-code.s3.cn-northwest-1.amazonaws.com.cn/v2/code/deletecert.zip) |
| DeleteEmail | [deleteemail-bj-s3-url](https://cn-north-1-cloudfront-ssl-plugin-code.s3.cn-north-1.amazonaws.com.cn/v2/code/deleteemail.zip) | [deleteemail-nx-s3-url](https://cn-northwest-1-cloudfront-ssl-plugin-code.s3.cn-northwest-1.amazonaws.com.cn/v2/code/deleteemail.zip) |
| DeleteProject | [deleteproject-bj-s3-url](https://cn-north-1-cloudfront-ssl-plugin-code.s3.cn-north-1.amazonaws.com.cn/v2/code/deleteproject.zip) | [deleteproject-nx-s3-url](https://cn-northwest-1-cloudfront-ssl-plugin-code.s3.cn-northwest-1.amazonaws.com.cn/v2/code/deleteproject.zip) |
| FrontEnd | [frontend-bj-s3-url](https://cn-north-1-cloudfront-ssl-plugin-code.s3.cn-north-1.amazonaws.com.cn/v2/code/frontend.zip) | [frontend-nx-s3-url](https://cn-northwest-1-cloudfront-ssl-plugin-code.s3.cn-northwest-1.amazonaws.com.cn/v2/code/frontend.zip) |
| GetCertByPath | [getcertbypath-bj-s3-url](https://cn-north-1-cloudfront-ssl-plugin-code.s3.cn-north-1.amazonaws.com.cn/v2/code/getcertbypath.zip) | [getcertbypath-nx-s3-url](https://cn-northwest-1-cloudfront-ssl-plugin-code.s3.cn-northwest-1.amazonaws.com.cn/v2/code/getcertbypath.zip) |
| GetMailByProject | [getmailbyproject-bj-s3-url](https://cn-north-1-cloudfront-ssl-plugin-code.s3.cn-north-1.amazonaws.com.cn/v2/code/getmailbyproject.zip) | [getmailbyproject-nx-s3-url](https://cn-northwest-1-cloudfront-ssl-plugin-code.s3.cn-northwest-1.amazonaws.com.cn/v2/code/getmailbyproject.zip) |
| Master | [master-bj-s3-url](https://cn-north-1-cloudfront-ssl-plugin-code.s3.cn-north-1.amazonaws.com.cn/v2/code/master.zip) | [master-nx-s3-url](https://cn-northwest-1-cloudfront-ssl-plugin-code.s3.cn-northwest-1.amazonaws.com.cn/v2/code/master.zip) |
| TriggerCertbot | [triggercertbot-bj-s3-url](https://cn-north-1-cloudfront-ssl-plugin-code.s3.cn-north-1.amazonaws.com.cn/v2/code/triggercertbot.zip) | [triggercertbot-nx-s3-url](https://cn-northwest-1-cloudfront-ssl-plugin-code.s3.cn-northwest-1.amazonaws.com.cn/v2/code/triggercertbot.zip) |
| UpdateProject | [updateproject-bj-s3-url](https://cn-north-1-cloudfront-ssl-plugin-code.s3.cn-north-1.amazonaws.com.cn/v2/code/updateproject.zip) | [updateproject-nx-s3-url](https://cn-northwest-1-cloudfront-ssl-plugin-code.s3.cn-northwest-1.amazonaws.com.cn/v2/code/updateproject.zip) |


## Deployment Guide


### Prerequisites

1. An AWS account in the China region
2. Domain name(s) managed by Amazon Route 53
3. AWS CLI configured with appropriate permissions
4. Node.js and AWS CDK installed (for customization)

### Deployment Steps

1. Deploy the Certbot Stack:
   - Initialize deployment by accessing the CloudFormation console and creating a new stack with new resources
   - Upload the certbot-stack [template file](https://aws-cn-getting-started.s3.cn-northwest-1.amazonaws.com.cn/china-cloudfront-ssl-plugin_v2/ChinaCloudFrontSslPluginStackV2.template.json) and provide the required parameters:
     - **Stack name**
     - **Access key** for the SSL certificate management console
   - Review the configuration and create the stack

2. Deploy the Controller Stack:
   - Access the certificate management console by clicking the value of `ManagementWebURL` in stack **Output** after the Certbot stack deployment is complete
   - After you enter your **Access key** and get into the management console, click the **Create Project** button to create a new project
   - Create a new project by providing:
     - Project name
     - The domains for which certificates were issued
     - Email address for getting notification
     - Certificate renewal schedule (default: 30 days)
   - Review the configuration and create the project

3. Configure CloudFront Distribution:
   - Associate the issued SSL certificate with your CloudFront distribution
   - Future certificate renewals will be automatically updated

## Build Instructions

If you need to customize the solution:

1. To modify and build Lambda code for your requirements:
 
   ```bash
   # For the certbot function
   cd certbot-stack/lambda/CertBot
   # Build in the certbot/app.py file
   sh zip_to_s3.sh
   # Get a .zip archive of the updated Lambda function.
   # Upload the .zip archive to Lambda and redeploy the function.
   
   # For controller-stack Lambda
   cd controller-stack/lambda
   # Find the Lambda function that you want to modify. Go into the coresponding directory and modify the app.py file.
   sh zip_to_s3.sh
   # Get a .zip archive of the Lambda function.
   # Upload the .zip archive to Lambda and redeploy the function.
   ```

2. Modify and export CloudFormation templates:

   ```bash
   # For certbot-stack
   cd certbot-stack/cdk
   # Modify the code under the bin/ directory
   cdk synth --path-metadata false --version-reporting false
   # Get the json template in the certbot-stack/cdk/ directory
   
   # For controller-stack
   cd controller-stack/cdk
   # Modify the code under the bin/ directory
   cdk synth --path-metadata false --version-reporting false
   # Get the json template in the controller-stack/cdk/ directory
   ```

## Key Improvements in V2

- **Two-Stack Architecture**: Better separation of concerns between certificate issuance and management
- **Enhanced API Interface**: More robust API for certificate management
- **Improved CloudFront Integration**: Streamlined process for updating certificates in CloudFront distributions
- **Better Error Handling**: More comprehensive error handling and notification system
- **Updated Dependencies**: Latest versions of Certbot and other dependencies for improved security and reliability

## Documentation

- Solution Deployment Guide: `https://www.amazonaws.cn/en/getting-started/tutorials/create-ssl-with-cloudfront/`
- Solution Deployment Guide: ([English](https://www.amazonaws.cn/en/getting-started/tutorials/create-ssl-with-cloudfront/) | [简体中文](https://www.amazonaws.cn/getting-started/tutorials/create-ssl-with-cloudfront/))

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This solution is licensed under the MIT-0 License. See the [LICENSE](LICENSE) file for details.
