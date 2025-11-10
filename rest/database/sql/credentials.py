class SQLCredentials:

    host: str = "localhost"
    port: int = 3306
    name: str
    user: str
    password: str

    def __init__(self, host: str, port: int, name: str, user: str, password: str):
        self.host = host
        self.port = port
        self.name = name
        self.user = user
        self.password = password