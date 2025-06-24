export filename="check_stack_state"
export S3_BJS="cn-north-1-cloudfront-ssl-plugin-code/v2/code/"
export S3_ZHY="cn-northwest-1-cloudfront-ssl-plugin-code/v2/code/"
export profile="cn-prod"

cd $filename
mkdir package
pip3 install -r requirements.txt --target=package
cd package
zip -r ../$filename.zip .
cd ..
zip $filename.zip app.py requirements.txt