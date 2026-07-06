export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  // MCP testweise deaktiviert (2026-06-21) zur Isolation von 503-Cold-Start /
  // Admin-Login-Problemen seit dem 5.44->5.48 Upgrade + MCP-Aktivierung (Commit 3309d18).
  // Wieder aktivieren: enabled: true.
  mcp: {
    enabled: true,
  },
});
