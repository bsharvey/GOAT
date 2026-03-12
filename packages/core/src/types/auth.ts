export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "artist" | "manager" | "viewer";
  createdAt: Date;
}

export interface AuthToken {
  userId: string;
  email: string;
  role: User["role"];
  iat: number;
  exp: number;
}
