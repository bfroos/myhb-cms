'use strict';

/**
 * Koeln Arcaden: App-Buchungslink in allen Zeilen vereinheitlichen (13.10.2026).
 *
 * Der Standort (documentId byfq4sxv29vjz745sr3eavvv) hat auf Englisch sechs
 * Entwurfs- und sechs veroeffentlichte Zeilen (doppelter Import vom
 * 24.07.2026). Ueber die REST-Schnittstelle laesst sich keine einzelne Zeile
 * ansprechen. /api/locations/bookable nimmt die einzige Zeile mit Stadt, und
 * genau die hatte keinen appBookingUrl. Der englische Buchungsdialog fiel
 * deshalb auf Calendly zurueck, seit myhb-store#330 zeigt er nur "Anrufen".
 * Ausserdem trugen en/tr/fr/ar/nl den Tippfehler `location=koeln-aracden`.
 *
 * Diese Migration setzt nur das eine Feld. Sie loescht und verschiebt nichts;
 * die doppelten Zeilen selbst bleiben (eigene Aufraeumarbeit).
 */
const DOCUMENT_ID = 'byfq4sxv29vjz745sr3eavvv';
const RICHTIG = 'https://app.myhealthandbeauty.com/book-appointment?location=koeln-arcaden';

module.exports = {
  async up(knex) {
    const tabelle = 'locations';
    if (!(await knex.schema.hasTable(tabelle))) return;
    if (!(await knex.schema.hasColumn(tabelle, 'app_booking_url'))) return;
    if (!(await knex.schema.hasColumn(tabelle, 'document_id'))) return;

    await knex(tabelle)
      .where({ document_id: DOCUMENT_ID })
      .andWhere((q) => q.whereNull('app_booking_url').orWhere('app_booking_url', '!=', RICHTIG))
      .update({ app_booking_url: RICHTIG });
  },
};
