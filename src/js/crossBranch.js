// ─── Cross-Branch & Role-Based Messaging Rules ───────────────────────────────
//
// Rules:
//  • super_admin  → can message ALL managers AND employees in every branch
//  • manager      → can message super admins + employees in their own branch
//  • employee     → can message customers in their own branch
//  • customer     → can only message employees in their own branch
//
// ─────────────────────────────────────────────────────────────────────────────

export const CROSS_BRANCH_TABLE = "cross_branch_messages";

export const BRANCH_LABEL = {
  branch_a: "Branch A",
  branch_b: "Branch B",
  branch_c: "Branch C",
  branch_d: "Branch D",
  // Add more branches as needed
};

// Normalise role strings coming from the DB
// Guard against non-string values (numbers, objects, null, undefined)
export const normRole = (r) => {
  if (r == null) return "";
  return String(r).toLowerCase().replace(/\s+/g, "_");
};

// Normalise branch strings coming from the DB
// branchId may arrive as a UUID string, integer, or null — always stringify first
export const normBranch = (b) => {
  if (b == null) return "";
  return String(b).toLowerCase().replace(/\s+/g, "_");
};

// ── Who can a given user message? ────────────────────────────────────────────
//
// Returns an array of { role, branch } targets.
// An empty branch string ("") means "any branch".
//
export const getCrossBranchTargets = (role, branch) => {
  const r = normRole(role);
  const b = normBranch(branch);

  switch (r) {
    case "super_admin":
      return [
        { role: "manager", branch: "" },
      ];

    case "manager":
      return [
        { role: "super_admin", branch: "" },
        { role: "employee",    branch: b  },
        { role: "customer",    branch: b  },
      ];

    case "employee":
      return [
        { role: "manager",  branch: b },
        { role: "customer", branch: b },
      ];

    case "customer":
      return [
        { role: "manager",  branch: b },
        { role: "employee", branch: b },
      ];

    default:
      return [];
  }
};

export const canMessageCrossBranch = (sender, recipient) => {
  const sRole   = normRole(sender.role);
  const rRole   = normRole(recipient.role);
  const sBranch = normBranch(sender.branch);
  const rBranch = normBranch(recipient.branch);

  // Super admin → any manager (any branch)
  if (sRole === "super_admin" && rRole === "manager") return true;

  // Manager → super admin (any branch), or employee/customer (same branch)
  if (sRole === "manager" && rRole === "super_admin") return true;
  if (sRole === "manager" && (rRole === "employee" || rRole === "customer") && sBranch === rBranch) return true;

  // Employee → manager or customer (same branch)
  if (sRole === "employee" && (rRole === "manager" || rRole === "customer") && sBranch === rBranch) return true;

  // Customer → manager or employee (same branch)
  if (sRole === "customer" && (rRole === "manager" || rRole === "employee") && sBranch === rBranch) return true;

  return false;
};

// ── Helper used by AddClientModal to filter the search results ───────────────
//
// Returns true if a profile should be shown as a messageable contact
// given the current user's role + branch.
//
export const isMessageableTarget = (currentUser, targetProfile) => {
  const cu = { role: normRole(currentUser.role), branch: normBranch(currentUser.branch) };
  const tp = { role: normRole(targetProfile.role), branch: normBranch(targetProfile.branch) };

  return canMessageCrossBranch(cu, tp);
};