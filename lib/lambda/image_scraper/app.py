#!/usr/bin/env python

# Import libraries
import requests
from bs4 import BeautifulSoup
import boto3
from botocore.exceptions import ClientError
import json
import os

BUCKET_NAME = os.environ['BUCKET_NAME']
def get_animal_image(url, animal):
    photo_url = ''
    page = requests.get(url)
    soup = BeautifulSoup(page.text, 'html.parser')
    images = soup.find_all('img', alt=True)
    for image in images:
        if f"{animal.capitalize()} of the Day" in image['alt'] and image['src'].startswith("archive"):
            photo_url = f"{url}{image['src']}"
            break
    return photo_url

def upload_file(data, bucket, key):
    s3 = boto3.resource('s3')
    s3object = s3.Object(bucket, key)

    s3object.put(
        Body=(bytes(json.dumps(data).encode('UTF-8')))
    )

def handler(event, context): 
    animals = [{'name': 'cat'},{'name': 'dog'},{'name': 'pet'}]    
    for animal in animals:
        url = f"https://{animal['name']}oftheday.com/"
        image_url = get_animal_image(url, animal['name'])
        animal['image'] = image_url
    upload_file(animals, BUCKET_NAME, 'animals.json')
    return {
        'statusCode': 200,
        'body': json.dumps('Web scraping completed')
    }