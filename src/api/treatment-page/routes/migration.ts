/**
 * Deaktivierte Einmal-Migrations-Route.
 *
 * Der frühere Endpoint `GET /migrate-treatment-parents` lief mit `auth: false`
 * und einem hartkodierten Secret und konnte Mass-Update+Publish auslösen.
 * Die Parent-Relation-Migration ist bereits abgeschlossen (TR/AR published),
 * daher ist die Route entfernt. Diese Datei + controllers/migration.ts können
 * später vollständig gelöscht werden.
 */

export default {
  routes: [],
};
