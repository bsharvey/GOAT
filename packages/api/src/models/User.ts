import bcrypt from "bcryptjs";
import { getSupabase } from "../db.js";

export interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: "admin" | "manager" | "artist" | "viewer";
  first_name: string | null;
  last_name: string | null;
  avatar: string | null;
  phone: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  address_country: string | null;
  currency: string;
  language: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  is_active: boolean;
  last_login: string | null;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export const UserModel = {
  async create(data: {
    username: string;
    email: string;
    password: string;
    role?: string;
    first_name?: string;
    last_name?: string;
  }) {
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(data.password, salt);

    const { data: user, error } = await getSupabase()
      .from("users")
      .insert({
        username: data.username,
        email: data.email.toLowerCase(),
        password_hash,
        role: data.role || "artist",
        first_name: data.first_name,
        last_name: data.last_name,
      })
      .select()
      .single();

    if (error) throw error;
    return user as UserRow;
  },

  async findByEmail(email: string) {
    const { data, error } = await getSupabase()
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data as UserRow | null;
  },

  async findByUsername(username: string) {
    const { data, error } = await getSupabase()
      .from("users")
      .select("*")
      .eq("username", username)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data as UserRow | null;
  },

  async findById(id: string) {
    const { data, error } = await getSupabase()
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as UserRow;
  },

  async update(id: string, updates: Partial<Omit<UserRow, "id" | "created_at">>) {
    const { data, error } = await getSupabase()
      .from("users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as UserRow;
  },

  async comparePassword(hash: string, candidate: string): Promise<boolean> {
    return bcrypt.compare(candidate, hash);
  },

  async updateLastLogin(id: string) {
    return this.update(id, { last_login: new Date().toISOString() });
  },

  getProfile(user: UserRow) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      profile: {
        firstName: user.first_name,
        lastName: user.last_name,
        avatar: user.avatar,
        phone: user.phone,
      },
      isActive: user.is_active,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
    };
  },
};
