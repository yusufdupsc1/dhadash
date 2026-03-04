import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import * as bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { normalizeEmail, normalizePhone } from "@/lib/identity";
import { normalizeScope, roleWhereForScope } from "@/lib/auth-scope";
import { verifyOtpChallenge } from "@/server/services/otp";

const AUTH_SECRETS = [
  process.env.AUTH_SECRET,
  process.env.NEXTAUTH_SECRET,
].filter((secret): secret is string => Boolean(secret));

const ALLOW_DEMO_LOGIN = process.env.ALLOW_DEMO_LOGIN !== "false";

const DEMO_INSTITUTION = {
  slug: "dhadash-demo",
  name: "Dhadash Academy",
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
    name: "Alex Admin",
    role: "ADMIN",
  },
  {
    email: "principal@school.edu",
    password: "principal123",
    name: "Dr. Sarah Chen",
    role: "PRINCIPAL",
  },
] as const;

const OWNER_CONTROL_INSTITUTION = {
  slug: "mope-owner-control",
  name: "Ministry of Primary and Mass Education - Owner Control",
  email: "owner@mope.gov.bd",
  country: "BD",
  timezone: "Asia/Dhaka",
  currency: "BDT",
};

const OWNER_SUPER_ADMIN = {
  username: (process.env.OWNER_SUPER_ADMIN_USERNAME ?? "Yusuf_Ali").trim(),
  email: normalizeEmail(process.env.OWNER_SUPER_ADMIN_EMAIL ?? "yusuf_ali"),
  password: process.env.OWNER_SUPER_ADMIN_PASSWORD ?? "19Kusum@yusuf",
  name: (process.env.OWNER_SUPER_ADMIN_NAME ?? "Yusuf_Ali").trim(),
};

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

async function provisionOwnerSuperAdminIfNeeded(
  identifier: string,
  password: string,
) {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const allowedIdentifiers = new Set([
    OWNER_SUPER_ADMIN.username.toLowerCase(),
    OWNER_SUPER_ADMIN.email.toLowerCase(),
  ]);

  if (!allowedIdentifiers.has(normalizedIdentifier)) {
    return null;
  }

  const institution = await db.institution.upsert({
    where: { slug: OWNER_CONTROL_INSTITUTION.slug },
    update: {
      name: OWNER_CONTROL_INSTITUTION.name,
      email: OWNER_CONTROL_INSTITUTION.email,
      country: OWNER_CONTROL_INSTITUTION.country,
      timezone: OWNER_CONTROL_INSTITUTION.timezone,
      currency: OWNER_CONTROL_INSTITUTION.currency,
      isActive: true,
    },
    create: {
      name: OWNER_CONTROL_INSTITUTION.name,
      slug: OWNER_CONTROL_INSTITUTION.slug,
      email: OWNER_CONTROL_INSTITUTION.email,
      country: OWNER_CONTROL_INSTITUTION.country,
      timezone: OWNER_CONTROL_INSTITUTION.timezone,
      currency: OWNER_CONTROL_INSTITUTION.currency,
      isActive: true,
    },
  });

  const existingUser = await db.user.findUnique({
    where: { email: OWNER_SUPER_ADMIN.email },
    include: { institution: { select: { name: true, slug: true } } },
  });

  if (existingUser?.password) {
    const isExistingPasswordValid = await bcrypt.compare(
      password,
      existingUser.password,
    );
    if (isExistingPasswordValid) {
      if (
        existingUser.role === "SUPER_ADMIN" &&
        existingUser.institutionId === institution.id &&
        existingUser.isActive &&
        existingUser.approvalStatus === "APPROVED"
      ) {
        return existingUser;
      }

      return db.user.update({
        where: { id: existingUser.id },
        data: {
          name: OWNER_SUPER_ADMIN.name,
          role: "SUPER_ADMIN",
          approvalStatus: "APPROVED",
          isActive: true,
          emailVerified: existingUser.emailVerified ?? new Date(),
          institutionId: institution.id,
        },
        include: { institution: { select: { name: true, slug: true } } },
      });
    }
  }

  if (password !== OWNER_SUPER_ADMIN.password) {
    return null;
  }

  const hashedPassword = await bcrypt.hash(OWNER_SUPER_ADMIN.password, 12);
  const user = await db.user.upsert({
    where: { email: OWNER_SUPER_ADMIN.email },
    update: {
      name: OWNER_SUPER_ADMIN.name,
      password: hashedPassword,
      role: "SUPER_ADMIN",
      approvalStatus: "APPROVED",
      isActive: true,
      emailVerified: new Date(),
      institutionId: institution.id,
    },
    create: {
      name: OWNER_SUPER_ADMIN.name,
      email: OWNER_SUPER_ADMIN.email,
      password: hashedPassword,
      role: "SUPER_ADMIN",
      approvalStatus: "APPROVED",
      isActive: true,
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
        role: "SUPER_ADMIN",
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
      const email = credentials?.email;
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

      if (normalizedScope !== "ADMIN" && !normalizedInstitution) {
        return null;
      }

      if (loginMode === "PHONE_OTP") {
        if (
          typeof phoneInput !== "string" ||
          typeof otpCodeInput !== "string" ||
          typeof otpChallengeInput !== "string"
        ) {
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

        if (!institution) return null;

        const otpResult = await verifyOtpChallenge({
          challengeId: otpChallengeInput.trim(),
          institutionId: institution.id,
          phone: normalizedPhone,
          scope: normalizedScope,
          code: otpCodeInput.trim(),
        });

        if (!otpResult.success) {
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

        if (!user) return null;

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
        !email ||
        !password ||
        typeof email !== "string" ||
        typeof password !== "string"
      ) {
        return null;
      }

      const normalizedEmail = normalizeEmail(email);
      let user = await db.user.findFirst({
        where: {
          email: { equals: normalizedEmail, mode: "insensitive" },
          role: userRoleFilter,
          isActive: true,
          approvalStatus: "APPROVED",
          ...(normalizedInstitution && {
            institution: {
              slug: { equals: normalizedInstitution, mode: "insensitive" },
            },
          }),
        },
        include: { institution: { select: { name: true, slug: true } } },
      });

      if (user?.password && user.institution?.slug) {
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          if (normalizedScope === "ADMIN" && !normalizedInstitution) {
            const ownerUser = await provisionOwnerSuperAdminIfNeeded(
              normalizedEmail,
              password,
            );
            if (ownerUser?.password && ownerUser.institution?.slug) {
              return {
                id: ownerUser.id,
                name: ownerUser.name,
                email: ownerUser.email,
                image: ownerUser.image,
                role: ownerUser.role,
                institutionId: ownerUser.institutionId,
                institutionName: ownerUser.institution.name,
                institutionSlug: ownerUser.institution.slug,
                phone: ownerUser.phone,
              };
            }
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

      if (
        normalizedInstitution &&
        normalizedInstitution !== DEMO_INSTITUTION.slug
      ) {
        return null;
      }
      if (normalizedScope !== "ADMIN") {
        return null;
      }

      const ownerUser = await provisionOwnerSuperAdminIfNeeded(
        normalizedEmail,
        password,
      );
      if (ownerUser?.password && ownerUser.institution?.slug) {
        return {
          id: ownerUser.id,
          name: ownerUser.name,
          email: ownerUser.email,
          image: ownerUser.image,
          role: ownerUser.role,
          institutionId: ownerUser.institutionId,
          institutionName: ownerUser.institution.name,
          institutionSlug: ownerUser.institution.slug,
          phone: ownerUser.phone,
        };
      }

      user = await provisionDemoUserIfNeeded(normalizedEmail, password);
      if (!user?.password || !user.isActive) return null;

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
  pages: { signIn: "/auth/login" },
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
          where: { email: token.email },
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
