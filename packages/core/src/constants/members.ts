/**
 * GOAT Royalty Force — Member Registry
 *
 * The 6 members who command the GOAT system.
 */

export interface GoatMember {
  key: string;
  name: string;
  alias: string;
  role: string;
  skills: string[];
}

export const GOAT_MEMBERS: GoatMember[] = [
  {
    key: "harvey",
    name: "Harvey Miller",
    alias: "DJ Speedy",
    role: "Commander",
    skills: ["production", "strategy", "music-industry", "leadership"],
  },
  {
    key: "moneyPenny",
    name: "Money Penny",
    alias: "Money Penny",
    role: "Operations",
    skills: ["admin", "operations", "finance", "coordination"],
  },
  {
    key: "waka",
    name: "Waka Flocka Flame",
    alias: "Waka",
    role: "Artist",
    skills: ["performance", "brand", "marketing", "music"],
  },
  {
    key: "codex",
    name: "Codex",
    alias: "Codex",
    role: "Technical",
    skills: ["development", "ai-training", "systems", "engineering"],
  },
  {
    key: "msVanessa",
    name: "Ms. Vanessa",
    alias: "Ms. Vanessa",
    role: "Creative Director",
    skills: ["visual-design", "branding", "creative", "content"],
  },
  {
    key: "apex",
    name: "Apex",
    alias: "Meridian",
    role: "AI Sentinel",
    skills: ["security", "knowledge", "ai-systems", "pattern-detection"],
  },
];

export const MEMBER_KEYS = GOAT_MEMBERS.map((m) => m.key);
