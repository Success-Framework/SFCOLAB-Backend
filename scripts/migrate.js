/*
 Migration script to import data/data.json into MongoDB collections
 Usage: ensure MONGODB_URI is set in .env, then run: npm run migrate
*/
require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { connectMongo } = require("../db/mongoose");
const {
  User,
  RefreshToken,
  Knowledge,
  KnowledgeComment,
  ResourceView,
  ResourceDownload,
  ResourceLike,
  Idea,
  IdeaComment,
  Suggestion,
  Startup,
  StartupMember,
  JoinRequest,
} = require("../models/schemas");

const DATA_FILE = path.join(__dirname, "..", "data", "database.json");

async function main() {
  const conn = await connectMongo();
  console.log(`Connected to MongoDB at ${conn.host}`);

  if (!fs.existsSync(DATA_FILE)) {
    console.log("No data file found at", DATA_FILE);
    process.exit(0);
  }

  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  const data = JSON.parse(raw || "{}");

  // Prepare ID maps for consistent references
  const idMap = new Map();
  const ensureObjectId = (oldId) => {
    if (!oldId) return new mongoose.Types.ObjectId();
    if (idMap.has(oldId)) return idMap.get(oldId);
    const oid = new mongoose.Types.ObjectId();
    idMap.set(oldId, oid);
    return oid;
  };

  // Wipe existing collections? Safer approach: upsert by unique keys
  // We'll upsert by email for users, name for startup, and by legacy id for others when available.

  // Users
  if (Array.isArray(data.users)) {
    for (const u of data.users) {
      const update = {
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        password: u.password, // already hashed in json
        isEmailVerified: !!u.isEmailVerified,
        lastLogin: u.lastLogin ? new Date(u.lastLogin) : null,
        status: u.status || "active",
        profile: u.profile || {
          picture: null,
          bio: null,
          company: null,
          socialLinks: {},
        },
        preferences: u.preferences || undefined,
        notificationSettings: u.notificationSettings || undefined,
      };
      const saved = await User.findOneAndUpdate({ email: u.email }, update, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });
      idMap.set(u.id, saved._id);
    }
    console.log(`Users migrated: ${data.users.length}`);
  }

  // Refresh Tokens
  if (Array.isArray(data.refreshTokens)) {
    for (const rt of data.refreshTokens) {
      const userId = idMap.get(rt.userId) || ensureObjectId(rt.userId);
      await RefreshToken.create({
        userId,
        token: rt.token,
        createdAt: rt.createdAt ? new Date(rt.createdAt) : new Date(),
      });
    }
    console.log(`Refresh tokens migrated: ${data.refreshTokens.length}`);
  }

  // Knowledge
  if (Array.isArray(data.knowledgeResources)) {
    for (const r of data.knowledgeResources) {
      const authorId = idMap.get(r.author?.id) || ensureObjectId(r.author?.id);
      const doc = await Knowledge.create({
        title: r.title,
        titleDescription: r.titleDescription,
        contentPreview: r.contentPreview,
        category: r.category,
        fileUrl: r.fileUrl || null,
        tags: Array.isArray(r.tags) ? r.tags : [],
        author: {
          id: authorId,
          firstName: r.author?.firstName,
          lastName: r.author?.lastName,
        },
        status: r.status || "active",
        views: r.views || 0,
        downloads: r.downloads || 0,
        likes: r.likes || 0,
        createdAt: r.createdAt ? new Date(r.createdAt) : undefined,
        updatedAt: r.updatedAt ? new Date(r.updatedAt) : undefined,
        image: r.image ? Buffer.from(r.image, "base64") : null,
      });
      idMap.set(r.id, doc._id);
    }
    console.log(
      `Knowledge resources migrated: ${data.knowledgeResources.length}`
    );
  }

  if (Array.isArray(data.knowledgeComments)) {
    for (const c of data.knowledgeComments) {
      const resourceId =
        idMap.get(c.resourceId) || ensureObjectId(c.resourceId);
      const authorId = idMap.get(c.author?.id) || ensureObjectId(c.author?.id);
      await KnowledgeComment.create({
        resourceId,
        content: c.content,
        author: {
          id: authorId,
          firstName: c.author?.firstName,
          lastName: c.author?.lastName,
        },
        createdAt: c.createdAt ? new Date(c.createdAt) : undefined,
        updatedAt: c.updatedAt ? new Date(c.updatedAt) : undefined,
      });
    }
    console.log(
      `Knowledge comments migrated: ${data.knowledgeComments.length}`
    );
  }

  if (Array.isArray(data.resourceViews)) {
    for (const v of data.resourceViews) {
      await ResourceView.create({
        resourceId: idMap.get(v.resourceId) || ensureObjectId(v.resourceId),
        userId: idMap.get(v.userId) || ensureObjectId(v.userId),
        viewedAt: v.viewedAt ? new Date(v.viewedAt) : new Date(),
      });
    }
    console.log(`Resource views migrated: ${data.resourceViews.length}`);
  }

  if (Array.isArray(data.resourceDownloads)) {
    for (const d of data.resourceDownloads) {
      await ResourceDownload.create({
        resourceId: idMap.get(d.resourceId) || ensureObjectId(d.resourceId),
        userId: idMap.get(d.userId) || ensureObjectId(d.userId),
        downloadedAt: d.downloadedAt ? new Date(d.downloadedAt) : new Date(),
      });
    }
    console.log(
      `Resource downloads migrated: ${data.resourceDownloads.length}`
    );
  }

  if (Array.isArray(data.resourceLikes)) {
    for (const l of data.resourceLikes) {
      await ResourceLike.create({
        resourceId: idMap.get(l.resourceId) || ensureObjectId(l.resourceId),
        userId: idMap.get(l.userId) || ensureObjectId(l.userId),
        likedAt: l.likedAt ? new Date(l.likedAt) : new Date(),
      });
    }
    console.log(`Resource likes migrated: ${data.resourceLikes.length}`);
  }

  // Ideas
  if (Array.isArray(data.ideas)) {
    for (const i of data.ideas) {
      const creatorId =
        idMap.get(i.creator?.id) || ensureObjectId(i.creator?.id);
      const doc = await Idea.create({
        title: i.title,
        description: i.description,
        projectDetails: i.projectDetails,
        industry: i.industry,
        stage: i.stage,
        teamMembers: Array.isArray(i.teamMembers)
          ? i.teamMembers.slice(0, 3)
          : [],
        tags: Array.isArray(i.tags) ? i.tags : [],
        creator: {
          id: creatorId,
          firstName: i.creator?.firstName,
          lastName: i.creator?.lastName,
        },
        status: i.status || "active",
        likes: i.likes || 0,
        views: i.views || 0,
        createdAt: i.createdAt ? new Date(i.createdAt) : undefined,
        updatedAt: i.updatedAt ? new Date(i.updatedAt) : undefined,
      });
      idMap.set(i.id, doc._id);
    }
    console.log(`Ideas migrated: ${data.ideas.length}`);
  }

  if (Array.isArray(data.comments)) {
    for (const c of data.comments) {
      await IdeaComment.create({
        ideaId: idMap.get(c.ideaId) || ensureObjectId(c.ideaId),
        content: c.content,
        author: {
          id: idMap.get(c.author?.id) || ensureObjectId(c.author?.id),
          firstName: c.author?.firstName,
          lastName: c.author?.lastName,
        },
        createdAt: c.createdAt ? new Date(c.createdAt) : undefined,
        updatedAt: c.updatedAt ? new Date(c.updatedAt) : undefined,
      });
    }
    console.log(`Idea comments migrated: ${data.comments.length}`);
  }

  if (Array.isArray(data.suggestions)) {
    for (const s of data.suggestions) {
      await Suggestion.create({
        ideaId: idMap.get(s.ideaId) || ensureObjectId(s.ideaId),
        content: s.content,
        author: {
          id: idMap.get(s.author?.id) || ensureObjectId(s.author?.id),
          firstName: s.author?.firstName,
          lastName: s.author?.lastName,
        },
        status: s.status || "pending",
        createdAt: s.createdAt ? new Date(s.createdAt) : undefined,
        updatedAt: s.updatedAt ? new Date(s.updatedAt) : undefined,
      });
    }
    console.log(`Suggestions migrated: ${data.suggestions.length}`);
  }

  // Startups
  if (Array.isArray(data.startups)) {
    for (const st of data.startups) {
      const creatorId =
        idMap.get(st.creator?.id) || ensureObjectId(st.creator?.id);
      const doc = await Startup.create({
        name: st.name,
        industry: st.industry,
        location: st.location,
        description: st.description,
        stage: st.stage || "idea",
        logo: st.logo ? Buffer.from(st.logo, "base64") : null,
        banner: st.banner ? Buffer.from(st.banner, "base64") : null,
        positions: st.positions ? Number(st.positions) : 0,
        roles: Array.isArray(st.roles) ? st.roles : [],
        creator: {
          id: creatorId,
          firstName: st.creator?.firstName,
          lastName: st.creator?.lastName,
        },
        status: "active",
        members: Array.isArray(st.members)
          ? st.members.map((m) => ({
              userId: idMap.get(m.userId) || ensureObjectId(m.userId),
              firstName: m.firstName,
              lastName: m.lastName,
              role: m.role || "member",
              joinedAt: m.joinedAt ? new Date(m.joinedAt) : new Date(),
              isActive: m.isActive !== false,
            }))
          : [],
        memberCount:
          st.memberCount || (Array.isArray(st.members) ? st.members.length : 1),
        views: st.views || 0,
        createdAt: st.createdAt ? new Date(st.createdAt) : undefined,
        updatedAt: st.updatedAt ? new Date(st.updatedAt) : undefined,
      });
      idMap.set(st.id, doc._id);
    }
    console.log(`Startups migrated: ${data.startups.length}`);
  }

  if (Array.isArray(data.joinRequests)) {
    for (const jr of data.joinRequests) {
      await JoinRequest.create({
        startupId: idMap.get(jr.startupId) || ensureObjectId(jr.startupId),
        startupName: jr.startupName,
        userId: idMap.get(jr.userId) || ensureObjectId(jr.userId),
        firstName: jr.firstName,
        lastName: jr.lastName,
        message: jr.message,
        role: jr.role || "member",
        status: jr.status || "pending",
        createdAt: jr.createdAt ? new Date(jr.createdAt) : undefined,
        updatedAt: jr.updatedAt ? new Date(jr.updatedAt) : undefined,
      });
    }
    console.log(`Join requests migrated: ${data.joinRequests.length}`);
  }

  console.log("Migration completed successfully.");
  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
