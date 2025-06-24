export filename="getcertbypath"

cd $filename
mkdir package
pip3 install -r requirements.txt --target=package
cd package
zip -r ../$filename.zip .
cd ..
zip $filename.zip app.py requirements.txt