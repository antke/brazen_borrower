/** The name shown for a member: their Clerk username, else first name. Never the email, since names are public. */
export function clerkDisplayName(user: { username?: string | null; first_name?: string | null }) {
  return (user.username?.trim() || user.first_name?.trim() || "Member").slice(0, 40)
}
