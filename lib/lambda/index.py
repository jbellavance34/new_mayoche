#!/usr/bin/env python

# Import libraries
import requests
from bs4 import BeautifulSoup

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
def main():
    animals = ['cat', 'dog', 'pet']
    for animal in animals:
        url = f"https://{animal}oftheday.com/"
        image = get_animal_image(url, animal)
        print(image)
if __name__ == "__main__":
    main()