import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserModel, UserRow } from "../models/User.js";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserRow;
    }
  }
}

const JWT_SECRET: string = process.env.JWT_SECRET || "goat-dev-secret";

export function generateToken(userId: string): string {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "30d" });
}

// Protect routes — verify JWT token
export async function protect(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer")) {
    res.status(401).json({ success: false, message: "Not authorized, no token" });
    return;
  }

  try {
    const token = auth.split(" ")[1]!;
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { id: string };
    const user = await UserModel.findById(decoded.id);

    if (!user) {
      res.status(401).json({ success: false, message: "User not found" });
      return;
    }
    if (!user.is_active) {
      res.status(401).json({ success: false, message: "Account deactivated" });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Not authorized, token failed" });
  }
}

// Role-based access
export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Role ${req.user?.role} is not authorized`,
      });
      return;
    }
    next();
  };
}

// Optional auth — doesn't fail if no token
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer")) {
    try {
      const token = auth.split(" ")[1]!;
      const decoded = jwt.verify(token, JWT_SECRET) as unknown as { id: string };
      req.user = await UserModel.findById(decoded.id);
    } catch {
      // Continue without user
    }
  }
  next();
}
