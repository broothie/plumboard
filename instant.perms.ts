const rules = {
  boards: {
    bind: {
      isOwner: "auth.id != null && auth.id == data.ref('owner.id')",
      isMember: "auth.id != null && auth.id in data.ref('members.user.id')",
    },
    allow: {
      view: "isOwner || isMember",
      create: "auth.id != null",
      update: "isOwner || isMember",
      delete: "isOwner",
    },
  },
  notes: {
    bind: {
      canAccess:
        "auth.id != null && (auth.id == data.ref('board.owner.id') || auth.id in data.ref('board.members.user.id'))",
    },
    allow: {
      view: "canAccess",
      create: "canAccess",
      update: "canAccess",
      delete: "canAccess",
    },
  },
  boardMembers: {
    bind: {
      isBoardOwner: "auth.id != null && auth.id == data.ref('board.owner.id')",
    },
    allow: {
      view: "isBoardOwner || (auth.id != null && auth.id == data.ref('user.id'))",
      create: "isBoardOwner",
      update: "isBoardOwner",
      delete: "isBoardOwner",
    },
  },
  profiles: {
    allow: {
      view: "true",
      create: "auth.id != null && auth.id == data.ref('user.id')",
      update: "auth.id != null && auth.id == data.ref('user.id')",
      delete: "auth.id != null && auth.id == data.ref('user.id')",
    },
  },
  $users: {
    allow: {
      view: "auth.id != null && auth.id == data.id",
    },
  },
  attrs: {
    allow: {
      create: "false",
      delete: "false",
    },
  },
};

export default rules;
