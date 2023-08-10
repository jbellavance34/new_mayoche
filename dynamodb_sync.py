#!/usr/bin/env python

import boto3

SOURCE_DATABASE = 'Choice-ntu4w2o4krempmbxvq4tsmdrkq-dev'
SOURCE_REGION = 'ca-central-1'
DESTINATION_DATABASE = 'choice'
DESTINATION_REGION = 'us-east-1'

def get_all_entries(table_name, region_name):
    client = boto3.client('dynamodb', region_name=region_name)
    response = client.scan(TableName=table_name)
    # change Key id -> choiceId
    for item in response['Items']:
        item['choiceId'] = item['id']
        item.pop('id')
    return response['Items']

def put_items(items, table_name, region_name):
    client = boto3.client('dynamodb', region_name=region_name)
    for item in items:
        # adding url for old data
        item['ImageUrl'] = {"S": f"https://{item['animal']['S']}oftheday.com/"}
        # animal > Animal
        item['Animal'] = item['animal']
        item.pop('animal')
        # createdAt > CreatedAt
        # changing format
        # before
        # 2022-11-08T13:47:09.339Z
        # after 
        # 2022/11/08:13:47:09 +0000
        # description > Description
        item['CreatedAt'] = {"S": f"{item['createdAt']['S'].replace('-','/')}"} 
        item.pop('createdAt')
        item['Description'] = item['description']
        item.pop('description')
        # name > Name
        item['Name'] = item['name']
        item.pop('name')

        client.put_item(TableName=table_name, Item=item)

def cleanup_items(table_name, region_name):
    client = boto3.client('dynamodb', region_name=region_name)
    response = client.scan(TableName=table_name)
    for item in response['Items']:
        client.delete_item(TableName=table_name, Key={'choiceId': item['choiceId']})

if __name__ == '__main__':
    print(f"Get source database items -> {SOURCE_DATABASE}")
    source_items = get_all_entries(SOURCE_DATABASE, SOURCE_REGION)
    print(f"Cleanup destination database -> {DESTINATION_DATABASE}")
    cleanup_items(DESTINATION_DATABASE, DESTINATION_REGION)
    print(f"Sync items to destination database -> {DESTINATION_DATABASE}")
    put_items(source_items, DESTINATION_DATABASE, DESTINATION_REGION)