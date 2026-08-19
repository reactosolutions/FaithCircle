// Custom rule: every exported async function in a "use server" actions.ts
// file must call requirePermission() somewhere in its body. Plain AST
// walking (no typescript-eslint type info needed) — this only checks that
// the guard is CALLED, not that it's checked first or that its result is
// handled correctly; that's a code-review concern, not a lint one.
//
// A small allowlist covers files that are genuinely permission-free: no
// signed-in actor exists yet (sign-in/up, password reset), or every
// operation is "edit my own account" — inherently self-scoped (RLS already
// enforces id = auth.uid() on these), with no permission-matrix concept
// behind it. members.edit is about ADMIN editing SOMEONE ELSE's profile,
// not this.
const EXEMPT_FILES = [
  "src/features/auth/actions.ts",
  "src/features/i18n/actions.ts",
  "src/features/notifications/actions.ts",
  "src/features/profile/actions.ts",
  "src/features/settings/account/actions.ts",
  "src/features/settings/hosting/actions.ts",
  "src/features/settings/notifications/actions.ts",
  "src/features/settings/preferences/actions.ts",
  "src/features/settings/privacy/actions.ts",
];

function isUseServerFile(programNode) {
  const first = programNode.body[0];
  return (
    first?.type === "ExpressionStatement" &&
    first.expression?.type === "Literal" &&
    first.expression.value === "use server"
  );
}

function callsRequirePermission(node) {
  let found = false;
  function walk(n) {
    if (!n || typeof n !== "object" || found) return;
    if (Array.isArray(n)) {
      for (const item of n) walk(item);
      return;
    }
    if (typeof n.type !== "string") return;
    if (n.type === "CallExpression" && n.callee?.type === "Identifier" && n.callee.name === "requirePermission") {
      found = true;
      return;
    }
    for (const key in n) {
      if (key === "parent") continue;
      walk(n[key]);
    }
  }
  walk(node);
  return found;
}

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Server Actions in actions.ts must call requirePermission() as their permission guard.",
    },
    schema: [],
    messages: {
      missingGuard:
        'Server Action "{{name}}" must call requirePermission() — see src/lib/permissions.ts.',
    },
  },
  create(context) {
    const filename = (context.filename ?? context.getFilename()).replace(/\\/g, "/");
    if (!filename.endsWith("/actions.ts")) return {};
    if (EXEMPT_FILES.some((exempt) => filename.endsWith(exempt))) return {};

    let hasUseServer = false;

    return {
      Program(node) {
        hasUseServer = isUseServerFile(node);
      },
      ExportNamedDeclaration(node) {
        if (!hasUseServer) return;
        const decl = node.declaration;
        if (!decl || decl.type !== "FunctionDeclaration" || !decl.async) return;
        if (!callsRequirePermission(decl.body)) {
          context.report({
            node: decl.id ?? decl,
            messageId: "missingGuard",
            data: { name: decl.id?.name ?? "(anonymous)" },
          });
        }
      },
    };
  },
};

export default rule;
