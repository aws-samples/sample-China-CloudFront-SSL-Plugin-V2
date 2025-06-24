export filename="frontend"

rm -rf build
npm run build
mkdir ./$filename
mkdir ./$filename/app
mkdir ./$filename/app/public
cp -r ./build/* ./$filename/app/public
#cp -r ./nginx ./$filename
rm -rf ../$filename.zip
cd $filename
zip -r ../$filename.zip .
cd ..