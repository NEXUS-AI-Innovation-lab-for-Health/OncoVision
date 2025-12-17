import os

from database.s3.connection import S3Connection

BUCKET = "test"
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

def upload_images(connection: S3Connection) -> None:

    session = connection.get_session()

    if not session.exists(BUCKET):
        session.mkdir(BUCKET)

    images_directory = os.path.join(DIRECTORY, "images")
    for file_name in os.listdir(images_directory):

        file_path = os.path.join(images_directory, file_name)
        s3_path = f"{BUCKET}/{file_name}"

        if(session.exists(s3_path)):
            continue

        with open(file_path, "rb") as file:
            with session.open(s3_path, "wb") as s3_file:
                s3_file.write(file.read())

        