class MongoCredentials:

    host: str = "http://localhost"
    port: int = 27017
    user: str
    password: str
    database: str

    def __init__(self, host: str, port: int, user: str, password: str, database: str) -> None:
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.database = database