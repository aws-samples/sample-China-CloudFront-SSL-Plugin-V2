import os

def lambda_handler(event, context):
    response = {
        "isAuthorized": False
    }
    try:
        if (event["headers"]["authorization"] == os.environ['API_KEY']):
            response = {
                "isAuthorized": True
            }
            print('allowed')
            return response
        else:
            print('denied')
            return response
    except:
        print('denied')
        return response