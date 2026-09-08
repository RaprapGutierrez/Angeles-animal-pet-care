// ─── Cross-Branch & Role-Based Messaging Rules ───────────────────────────────
//
// Rules:
//  • super_admin  → can message EVERYONE (managers, employees, customers) in every branch
//  • manager      → can only message customers in their own branch (pet/vet updates)
//  • employee     → can only message customers in their own branch (pet/vet updates)
//  • customer     → can message managers + employees in their own branch (replying to staff)
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
      // Super admin can message everyone, in every branch
      return [
        { role: "manager", branch: "" },
        { role: "employee", branch: "" },
        { role: "customer", branch: "" },
      ];

    case "manager":
      // Managers may only message customers in their own branch
      return [{ role: "customer", branch: b }];

    case "employee":
      // Employees may only message customers in their own branch
      return [{ role: "customer", branch: b }];

    case "customer":
      // Customers may message the staff handling their branch
      return [
        { role: "manager", branch: b },
        { role: "employee", branch: b },
      ];

    default:
      return [];
  }
};

export const canMessageCrossBranch = (sender, recipient) => {
  const sRole = normRole(sender.role);
  const rRole = normRole(recipient.role);
  const sBranch = normBranch(sender.branch);
  const rBranch = normBranch(recipient.branch);

  // Super admin → anyone (manager, employee, customer), any branch
  if (
    sRole === "super_admin" &&
    (rRole === "manager" || rRole === "employee" || rRole === "customer")
  )
    return true;

  // Anyone → super admin (always allowed to reach super admin), any branch
  if (rRole === "super_admin") return true;

  // Manager → customer only (same branch)
  if (sRole === "manager" && rRole === "customer" && sBranch === rBranch)
    return true;

  // Employee → customer only (same branch)
  if (sRole === "employee" && rRole === "customer" && sBranch === rBranch)
    return true;

  // Customer → manager or employee (same branch)
  if (
    sRole === "customer" &&
    (rRole === "manager" || rRole === "employee") &&
    sBranch === rBranch
  )
    return true;

  return false;
};

// ── Helper used by AddClientModal to filter the search results ───────────────
//
// Returns true if a profile should be shown as a messageable contact
// given the current user's role + branch.
//
export const isMessageableTarget = (currentUser, targetProfile) => {
  const cu = {
    role: normRole(currentUser.role),
    branch: normBranch(currentUser.branch),
  };
  const tp = {
    role: normRole(targetProfile.role),
    branch: normBranch(targetProfile.branch),
  };

  return canMessageCrossBranch(cu, tp);
};
