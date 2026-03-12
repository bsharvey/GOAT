import { Router } from "express";
import { UserModel } from "../models/User.js";
import { generateToken, protect } from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/error-handler.js";

export function authRoutes(): Router {
  const router = Router();

  // Register
  router.post(
    "/register",
    asyncHandler(async (req, res) => {
      const { username, email, password, role, first_name, last_name } = req.body;

      if (!username || !email || !password) {
        throw new AppError("Username, email, and password are required", 400);
      }

      // Check for existing user
      const existingEmail = await UserModel.findByEmail(email);
      if (existingEmail) throw new AppError("Email already registered", 400);

      const existingUsername = await UserModel.findByUsername(username);
      if (existingUsername) throw new AppError("Username already taken", 400);

      const user = await UserModel.create({
        username,
        email,
        password,
        role: role || "artist",
        first_name,
        last_name,
      });

      const token = generateToken(user.id);

      res.status(201).json({
        success: true,
        token,
        user: UserModel.getProfile(user),
      });
    })
  );

  // Login
  router.post(
    "/login",
    asyncHandler(async (req, res) => {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError("Email and password are required", 400);
      }

      const user = await UserModel.findByEmail(email);
      if (!user) throw new AppError("Invalid credentials", 401);

      const isMatch = await UserModel.comparePassword(user.password_hash, password);
      if (!isMatch) throw new AppError("Invalid credentials", 401);

      if (!user.is_active) throw new AppError("Account deactivated", 401);

      await UserModel.updateLastLogin(user.id);
      const token = generateToken(user.id);

      res.json({
        success: true,
        token,
        user: UserModel.getProfile(user),
      });
    })
  );

  // Get profile
  router.get(
    "/profile",
    protect,
    asyncHandler(async (req, res) => {
      const user = await UserModel.findById(req.user!.id);
      res.json({ success: true, user: UserModel.getProfile(user) });
    })
  );

  // Update profile
  router.put(
    "/profile",
    protect,
    asyncHandler(async (req, res) => {
      const { first_name, last_name, phone, avatar, currency, language } = req.body;

      const updates: Record<string, unknown> = {};
      if (first_name !== undefined) updates.first_name = first_name;
      if (last_name !== undefined) updates.last_name = last_name;
      if (phone !== undefined) updates.phone = phone;
      if (avatar !== undefined) updates.avatar = avatar;
      if (currency !== undefined) updates.currency = currency;
      if (language !== undefined) updates.language = language;

      const user = await UserModel.update(req.user!.id, updates);
      res.json({ success: true, user: UserModel.getProfile(user) });
    })
  );

  // Change password
  router.put(
    "/password",
    protect,
    asyncHandler(async (req, res) => {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new AppError("Current password and new password are required", 400);
      }

      const user = await UserModel.findById(req.user!.id);
      const isMatch = await UserModel.comparePassword(user.password_hash, currentPassword);
      if (!isMatch) throw new AppError("Current password is incorrect", 401);

      // Hash new password via bcrypt
      const bcrypt = await import("bcryptjs");
      const salt = await bcrypt.genSalt(12);
      const password_hash = await bcrypt.hash(newPassword, salt);

      await UserModel.update(req.user!.id, { password_hash });
      res.json({ success: true, message: "Password updated" });
    })
  );

  return router;
}
