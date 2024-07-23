import os
import io
import matplotlib.pyplot as plt
import requests
import argparse

if __name__ == "__main__":
    pass

    # refer to: https://docs.python.org/3/howto/argparse.html
    parser = argparse.ArgumentParser()
    
    # read and display passed arguments, including optional
    parser.add_argument("arg1", help="This is argument one")
    parser.add_argument("arg2", help="This is argument two")
    parser.add_argument("--optional", help="This is optional argument")
    args = parser.parse_args()
    print("Arg1: " + args.arg1)
    print("Arg2: " + args.arg2)
    if(args.optional):
        print("Optional arg: " + args.optional)

    image_url = "https://www.warrenphotographic.co.uk/photography/bigs/40790-Cute-chocolate-Border-Collie-puppy-7-weeks-old-white-background.jpg"
    file_extension = os.path.splitext(image_url)[1][1:]
    print("File extension: " + file_extension)

    # download the image
    response = requests.get(image_url)

    # load the image bytes into pyplot
    # format: png, jpg, jpeg
    image_bytes = io.BytesIO(response.content)
    img = plt.imread(image_bytes, format=format)
    
    # extract width and height of the image
    original_width = img.shape[1]
    original_height = img.shape[0]
    print("File dimensions: " + str(original_width) + "x" + str(original_height))