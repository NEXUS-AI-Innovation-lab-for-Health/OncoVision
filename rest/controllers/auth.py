from fastapi import HTTPException, Request
from fastapi.security.utils import get_authorization_scheme_param
from sqlmodel import select
from hashlib import sha256
from datetime import datetime

from api.controller import Controller
from api.model import CamelModel
from database.sql.connection import SQLConnection

from models.token import Token
from models.user import User

class AuthDependancy:

    sql_connection: SQLConnection

    def __init__(self, sql_connection: SQLConnection) -> None:
        self.sql_connection = sql_connection

    def _extract_token(self, request: Request) -> str | None:
        
        auth: str | None = request.headers.get("Authorization")
        if not auth:
            return None

        scheme, param = get_authorization_scheme_param(auth)
        if scheme.lower() != "bearer":
            return None
        return param
    
    async def __call__(self, request: Request) -> User:

        token = self._extract_token(request)
        if not token:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        with self.sql_connection.create_session() as session:
            statement = (
                select(Token)
                .where(Token.value == token)
            )
            token = session.exec(statement).first()
            if not token or token.has_expired():
                raise HTTPException(status_code=401, detail="Unauthorized")
            
            user = session.get(User, token.user_id)
            if not user:
                raise HTTPException(status_code=401, detail="Unauthorized")
            return user  

def hash_password(password: str) -> str:
    """Hash a password using SHA-256.

    Declared at module level to avoid misuse of @staticmethod outside a class
    which makes the object non-callable.
    """
    return sha256(password.encode("utf-8")).hexdigest()

class AuthController(Controller):
    
    sql_connection: SQLConnection

    def __init__(self, sql_connection: SQLConnection) -> None:
        super().__init__("auth")
        self.sql_connection = sql_connection
        self.add_api_route("/login", self.login, methods=["POST"], response_model=self.LoginResponse)

    # Login

    class LoginBody(CamelModel):

        email: str
        password: str

    class LoginResponse(CamelModel):
        
        token: str
        expires_at: datetime

    async def login(self, body: LoginBody, request: Request):

        hashed_password = hash_password(body.password)
        with self.sql_connection.create_session() as session:

            statement = (
                select(User)
                .where(
                    (User.email == body.email) &
                    (User.password == hashed_password)
                )
            )

            user = session.exec(statement).first()
            if not user:
                raise HTTPException(status_code=401, detail="Invalid credentials")
            
            ip_address = request.client.host
            statement = (
                select(Token)
                .where(
                    (Token.user_id == user.id) &
                    (Token.ip_address == ip_address) &
                    (~Token.has_expired())
                )
            )

            token = session.exec(statement).first()
            if not token:
                token_value = sha256(f"{user.id}{datetime.now()}".encode("utf-8")).hexdigest()
                token = Token(
                    value=token_value,
                    user_id=user.id,
                    ip_address=ip_address
                )
                session.add(token)
                session.commit()
                session.refresh(token)

            return self.LoginResponse(
                token=token.value,
                expires_at=token.expires_at
            )