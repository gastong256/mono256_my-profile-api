export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface JwtUserPayload {
  sub: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: AuthUser;
}
