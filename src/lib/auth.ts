import { normalizeScope, roleWhereForScope } from "@/lib/auth-scope";
import { db } from "@/lib/db";
import { normalizeEmail, normalizePhone } from "@/lib/identity";
import { verifyOtpChallenge } from "@/server/services/otp";
import * as bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

const AUTH_SECRETS = [
  process.env.AUTH_SECRET,
  process.env.NEXTAUTH_SECRET,
].filter((secret): secret is string => Boolean(secret));

const ALLOW_DEMO_LOGIN =
  process.env.ALLOW_DEMO_LOGIN === "true" ||
  (process.env.ALLOW_DEMO_LOGIN == null && process.env.NODE_ENV !== "production");
const AUTH_DEBUG_LOGS = process.env.AUTH_DEBUG_LOGS === "true";

const DEMO_INSTITUTION = {
  slug: "bd-gps",
  name: "BD-GPS Govt Primary Demo School",
  email: "admin@school.edu",
  city: "Dhaka",
  country: "BD",
  timezone: "Asia/Dhaka",
  currency: "BDT",
};

const DEMO_USERS = [
  {
    email: "admin@school.edu",
    password: "admin123",
    name: "Admin",
    role: "ADMIN",
  },
  {
    email: "principal@school.edu",
    password: "principal123",
    name: "Dr. Sarah Chen",
    role: "PRINCIPAL",
  },
  {
    email: "teacher.demo@school.edu",
    password: "teacher123",
    name: "Demo Teacher",
    role: "TEACHER",
  },
  {
    email: "student.demo@school.edu",
    password: "student123",
    name: "Demo Student",
    role: "STUDENT",
  },
  {
    email: "parent.demo@school.edu",
    password: "parent123",
    name: "Demo Parent",
    role: "PARENT",
  },
] as const;

async function provisionDemoUserIfNeeded(email: string, password: string) {
  if (!ALLOW_DEMO_LOGIN) return null;

  const demoUser = DEMO_USERS.find(
    (candidate) => candidate.email === email && candidate.password === password,
  );
  if (!demoUser) return null;

  const institution = await db.institution.upsert({
    where: { slug: DEMO_INSTITUTION.slug },
    update: {
      name: DEMO_INSTITUTION.name,
      email: DEMO_INSTITUTION.email,
      city: DEMO_INSTITUTION.city,
      country: DEMO_INSTITUTION.country,
      timezone: DEMO_INSTITUTION.timezone,
      currency: DEMO_INSTITUTION.currency,
      isActive: true,
    },
    create: {
      name: DEMO_INSTITUTION.name,
      slug: DEMO_INSTITUTION.slug,
      email: DEMO_INSTITUTION.email,
      city: DEMO_INSTITUTION.city,
      country: DEMO_INSTITUTION.country,
      timezone: DEMO_INSTITUTION.timezone,
      currency: DEMO_INSTITUTION.currency,
    },
  });

  const hashedPassword = await bcrypt.hash(demoUser.password, 12);
  const user = await db.user.upsert({
    where: { email: demoUser.email },
    update: {
      name: demoUser.name,
      password: hashedPassword,
      role: demoUser.role,
      isActive: true,
      approvalStatus: "APPROVED",
      emailVerified: new Date(),
      institutionId: institution.id,
    },
    create: {
      name: demoUser.name,
      email: demoUser.email,
      password: hashedPassword,
      role: demoUser.role,
      isActive: true,
      approvalStatus: "APPROVED",
      emailVerified: new Date(),
      institutionId: institution.id,
    },
    include: { institution: { select: { name: true, slug: true } } },
  });

  return user;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function uniqueInstitutionSlug(base: string) {
  let slug = slugify(base) || "institution";
  let i = 1;
  while (await db.institution.findUnique({ where: { slug } })) {
    slug = `${slugify(base) || "institution"}-${i++}`;
  }
  return slug;
}

async function upsertGoogleUserContext(user: {
  email: string;
  name?: string | null;
  image?: string | null;
}) {
  const normalizedEmail = user.email.trim().toLowerCase();
  const localPart = normalizedEmail.split("@")[0] || "school-admin";
  const domain = normalizedEmail.split("@")[1] || "school.edu";
  const inferredInstitutionName = `${domain.split(".")[0] || "School"} Institution`;

  let dbUser = await db.user.findUnique({
    where: { email: normalizedEmail },
    include: { institution: { select: { name: true, slug: true } } },
  });

  if (!dbUser) {
    const institutionSlug = await uniqueInstitutionSlug(
      `${domain.split(".")[0]}-school`,
    );
    const institution = await db.institution.create({
      data: {
        name: inferredInstitutionName,
        slug: institutionSlug,
        email: normalizedEmail,
        country: "BD",
        timezone: "Asia/Dhaka",
        currency: "BDT",
      },
    });

    await db.institutionSettings.upsert({
      where: { institutionId: institution.id },
      update: {},
      create: {
        institutionId: institution.id,
        academicYear: "2026-2027",
        termsPerYear: 3,
        emailNotifs: true,
      },
    });

    dbUser = await db.user.create({
      data: {
        email: normalizedEmail,
        name: user.name?.trim() || localPart,
        image: user.image ?? null,
        role: "ADMIN",
        approvalStatus: "APPROVED",
        emailVerified: new Date(),
        isActive: true,
        institutionId: institution.id,
      },
      include: { institution: { select: { name: true, slug: true } } },
    });
  } else {
    dbUser = await db.user.update({
      where: { id: dbUser.id },
      data: {
        name: user.name?.trim() || dbUser.name,
        image: user.image ?? dbUser.image,
        lastLoginAt: new Date(),
        isActive: true,
      },
      include: { institution: { select: { name: true, slug: true } } },
    });
  }

  return dbUser;
}

const providers: any[] = [
  Credentials({
    name: "Credentials",
      credentials: {
        institution: { label: "Institution", type: "text" },
      scope: { label: "Scope", type: "text" },
      loginMode: { label: "Login Mode", type: "text" },
      email: { label: "Email", type: "email" },
      phone: { label: "Phone", type: "tel" },
      otpCode: { label: "OTP Code", type: "text" },
      otpChallengeId: { label: "OTP Challenge", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const institutionInput = credentials?.institution;
      const scopeInput = credentials?.scope;
      const loginModeInput = credentials?.loginMode;
      const identifierInput = credentials?.email;
      const phoneInput = credentials?.phone;
      const otpCodeInput = credentials?.otpCode;
      const otpChallengeInput = credentials?.otpChallengeId;
      const password = credentials?.password;

      const normalizedInstitution =
        typeof institutionInput === "string"
          ? institutionInput.trim().toLowerCase()
          : "";
      const normalizedScope = normalizeScope(
        typeof scopeInput === "string" ? scopeInput : "ADMIN",
      );
      const loginMode =
        typeof loginModeInput === "string" &&
        loginModeInput.trim().toUpperCase() === "PHONE_OTP"
          ? "PHONE_OTP"
          : "PASSWORD";
      const userRoleFilter = roleWhereForScope(normalizedScope);

      if (AUTH_DEBUG_LOGS) {
        console.info("[auth] authorize:start", {
          institution: normalizedInstitution || null,
          scope: normalizedScope,
          loginMode,
          hasIdentifier: typeof identifierInput === "string" && identifierInput.length > 0,
          hasPhone: typeof phoneInput === "string" && phoneInput.length > 0,
        });
      }

      if (!normalizedInstitution) {
        if (AUTH_DEBUG_LOGS) {
          console.warn("[auth] authorize:missing_institution");
        }
        return null;
      }

      if (loginMode === "PHONE_OTP") {
        if (
          typeof phoneInput !== "string" ||
          typeof otpCodeInput !== "string" ||
          typeof otpChallengeInput !== "string"
        ) {
          if (AUTH_DEBUG_LOGS) {
            console.warn("[auth] authorize:otp:missing_fields", {
              hasPhone: typeof phoneInput === "string",
              hasOtpCode: typeof otpCodeInput === "string",
              hasOtpChallenge: typeof otpChallengeInput === "string",
            });
          }
          return null;
        }

        if (!normalizedInstitution) {
          return null;
        }

        const normalizedPhone = normalizePhone(phoneInput);
        if (!normalizedPhone) {
          return null;
        }

        const institution = await db.institution.findFirst({
          where: {
            slug: { equals: normalizedInstitution, mode: "insensitive" },
            isActive: true,
          },
          select: { id: true, name: true, slug: true },
        });

        if (!institution) {
          if (AUTH_DEBUG_LOGS) {
            console.warn("[auth] authorize:otp:institution_not_found", {
              institution: normalizedInstitution,
            });
          }
          return null;
        }

        const otpResult = await verifyOtpChallenge({
          challengeId: otpChallengeInput.trim(),
          institutionId: institution.id,
          phone: normalizedPhone,
          scope: normalizedScope,
          code: otpCodeInput.trim(),
        });

        if (!otpResult.success) {
          if (AUTH_DEBUG_LOGS) {
            console.warn("[auth] authorize:otp:challenge_failed", {
              institution: normalizedInstitution,
              scope: normalizedScope,
              reason: otpResult.reason ?? "UNKNOWN",
            });
          }
          return null;
        }

        const user = await db.user.findFirst({
          where: {
            institutionId: institution.id,
            role: userRoleFilter,
            phone: normalizedPhone,
            isActive: true,
            approvalStatus: "APPROVED",
          },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            institutionId: true,
          },
        });

        if (!user) {
          if (AUTH_DEBUG_LOGS) {
            console.warn("[auth] authorize:otp:user_not_found", {
              institution: normalizedInstitution,
              scope: normalizedScope,
              normalizedPhone,
            });
          }
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          institutionId: user.institutionId,
          institutionName: institution.name,
          institutionSlug: institution.slug,
          phone: normalizedPhone,
        };
      }

      if (
        !identifierInput ||
        !password ||
        typeof identifierInput !== "string" ||
        typeof password !== "string"
      ) {
        if (AUTH_DEBUG_LOGS) {
          console.warn("[auth] authorize:password:missing_identifier_or_password", {
            hasIdentifier: typeof identifierInput === "string" && identifierInput.length > 0,
            hasPassword: typeof password === "string" && password.length > 0,
          });
        }
        return null;
      }

      const normalizedIdentifier = normalizeEmail(identifierInput);

      let user = await db.user.findFirst({
        where: {
          OR: [
            { email: { equals: normalizedIdentifier, mode: "insensitive" } },
            { username: { equals: normalizedIdentifier, mode: "insensitive" } },
          ],
          role: userRoleFilter,
          isActive: true,
          approvalStatus: "APPROVED",
          institution: {
            slug: { equals: normalizedInstitution, mode: "insensitive" },
          },
        },
        include: { institution: { select: { name: true, slug: true } } },
      });

      if (user?.password && user.institution?.slug) {
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          if (AUTH_DEBUG_LOGS) {
            console.warn("[auth] authorize:password:invalid_password", {
              institution: normalizedInstitution,
              scope: normalizedScope,
              identifier: normalizedIdentifier,
              userId: user.id,
            });
          }
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          institutionId: user.institutionId,
          institutionName: user.institution.name,
          institutionSlug: user.institution.slug,
          phone: user.phone,
        };
      }

      if (AUTH_DEBUG_LOGS) {
        console.warn("[auth] authorize:password:user_not_found_or_not_eligible", {
          institution: normalizedInstitution,
          scope: normalizedScope,
          identifier: normalizedIdentifier,
        });
      }

      if (normalizedScope !== "ADMIN") {
        if (AUTH_DEBUG_LOGS) {
          console.warn("[auth] authorize:scope_fallback_blocked", {
            institution: normalizedInstitution,
            scope: normalizedScope,
          });
        }
        return null;
      }

      if (normalizedInstitution !== DEMO_INSTITUTION.slug) {
        return null;
      }

      user = await provisionDemoUserIfNeeded(normalizedIdentifier, password);
      if (!user?.password || !user.isActive) {
        if (AUTH_DEBUG_LOGS) {
          console.warn("[auth] authorize:demo_provision_failed", {
            institution: normalizedInstitution,
            identifier: normalizedIdentifier,
          });
        }
        return null;
      }

      if (AUTH_DEBUG_LOGS) {
        console.info("[auth] authorize:demo_provisioned", {
          institution: normalizedInstitution,
          userId: user.id,
          role: user.role,
        });
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        institutionId: user.institutionId,
        institutionName: user.institution.name,
        institutionSlug: user.institution.slug,
        phone: user.phone,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

const authConfig: any = {
  secret: AUTH_SECRETS.length > 1 ? AUTH_SECRETS : AUTH_SECRETS[0],
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/login/admin" },
  trustHost: true,
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;

      const email = user.email?.trim().toLowerCase();
      if (!email) return false;

      try {
        const dbUser = await upsertGoogleUserContext({
          email,
          name: user.name,
          image: user.image,
        });

        (user as any).id = dbUser.id;
        (user as any).role = dbUser.role;
        (user as any).institutionId = dbUser.institutionId;
        (user as any).institutionName = dbUser.institution.name;
        (user as any).institutionSlug = dbUser.institution.slug;
        (user as any).phone = dbUser.phone;
        return true;
      } catch (error) {
        console.error("[AUTH_GOOGLE_SIGNIN]", error);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        const typedUser = user as {
          role?: string;
          institutionId?: string;
          institutionName?: string;
          institutionSlug?: string;
          phone?: string | null;
        };

        (token as any).role = typedUser.role;
        (token as any).institutionId = typedUser.institutionId;
        (token as any).institutionName = typedUser.institutionName;
        (token as any).institutionSlug = typedUser.institutionSlug;
        (token as any).phone = typedUser.phone;
      }

      if (!(token as any).institutionId && token.email) {
        const dbUser = await db.user.findUnique({
          where: { email: token.email as string },
          include: { institution: { select: { name: true, slug: true } } },
        });

        if (dbUser) {
          (token as any).role = dbUser.role;
          (token as any).institutionId = dbUser.institutionId;
          (token as any).institutionName = dbUser.institution.name;
          (token as any).institutionSlug = dbUser.institution.slug;
          (token as any).phone = dbUser.phone;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.sub;
        (session.user as { role?: string }).role = (token as any)
          .role as string;
        (session.user as { institutionId?: string }).institutionId = (
          token as any
        ).institutionId as string;
        (session.user as { institutionName?: string }).institutionName = (
          token as any
        ).institutionName as string;
        (session.user as { institutionSlug?: string }).institutionSlug = (
          token as any
        ).institutionSlug as string;
        (session.user as { phone?: string | null }).phone = (token as any)
          .phone as string | null;
      }
      return session;
    },
  },
};

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);
