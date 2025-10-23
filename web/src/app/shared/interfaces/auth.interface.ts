export interface LoginDto {
    email: string;
    senha: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
}

export interface RefreshTokenDto {
    refreshToken: string;
}

export interface JwtToken {
    sub: number;
    email: string;
    role: "USER" | "ADMIN";
    iat: number;
    exp: number;
}