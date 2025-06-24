export filename="certbot"

# Building ARM64 Compatible Packages Using Container
sam build --use-container --parameter-overrides "LambdaArchitecture=arm64"

cd .aws-sam/build/$filename
zip -r ../../../$filename-arm64.zip .

cd ../../../