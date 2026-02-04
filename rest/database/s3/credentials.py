class S3Credentials:
    host: str = "http://localhost"
    port: int = 9000
    user: str
    password: str
    region: str = "us-east-1"

    def __init__(self, host: str, port: int, user: str, password: str, region: str) -> None:
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.region = region
