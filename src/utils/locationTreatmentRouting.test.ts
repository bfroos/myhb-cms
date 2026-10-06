import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildEffectiveTypeIndex,
  decideLocationTreatment,
  keepPathKeysForLocation,
  siblingLocationPathKeys,
  servingLocations,
  type CityLocationRef,
} from "./locationTreatmentRouting.ts";

// Live-Daten Strapi (Stand 06.10.2026), gekuerzt.
const ARCADEN: CityLocationRef = {
  documentId: "byfq4sxv29vjz745sr3eavvv",
  slug: "koeln-arcaden",
  type: "lounge",
  citySlug: "koeln",
};
const MEDIAPARK: CityLocationRef = {
  documentId: "oqruzbncvb58980fbmkj8eee",
  slug: "mediapark-klinik",
  type: "clinic",
  citySlug: "koeln",
};
const DUESSELDORF: CityLocationRef = {
  documentId: "iua4phnw8456a4r3ps76hiv9",
  slug: "duesseldorf-arcaden",
  type: "lounge",
  citySlug: "duesseldorf",
};
const ALL = [ARCADEN, MEDIAPARK, DUESSELDORF];

const PAGES = [
  { pathKey: "botox", type: "minimally-invasive" },
  { pathKey: "botox/masseter", type: "minimally-invasive" },
  { pathKey: "hyaluron/kinnkorrektur", type: "minimally-invasive" },
  { pathKey: "anti-haarausfall/prp-haartherapie", type: "minimally-invasive" },
  { pathKey: "skinbooster", type: "minimally-invasive" },
  { pathKey: "schoenheitsoperationen", type: "minimally-invasive" }, // falsch gepflegt
  { pathKey: "schoenheitsoperationen/facelift", type: "minimally-invasive" }, // falsch gepflegt
  { pathKey: "schoenheitsoperationen/haartransplantation", type: "abulatory" },
  { pathKey: "schoenheitsoperationen/fettabsaugung", type: "operational" },
  { pathKey: "unbekannt/seite", type: null },
];
const INDEX = buildEffectiveTypeIndex(PAGES);

test("effektiver Typ: Kategorie-Regel hebt falsch gepflegte OP-Seiten an", () => {
  assert.equal(INDEX.get("botox"), "minimally-invasive");
  assert.equal(INDEX.get("schoenheitsoperationen"), "abulatory");
  assert.equal(INDEX.get("schoenheitsoperationen/facelift"), "abulatory");
  assert.equal(INDEX.get("schoenheitsoperationen/haartransplantation"), "abulatory");
  assert.equal(INDEX.get("schoenheitsoperationen/fettabsaugung"), "operational");
  assert.equal(INDEX.has("unbekannt/seite"), false);
});

test("Köln: nichtoperativ -> nur Arcaden, MediaPark leitet um", () => {
  assert.deepEqual(decideLocationTreatment(ARCADEN, ALL, "minimally-invasive"), {
    kind: "served",
  });
  const mp = decideLocationTreatment(MEDIAPARK, ALL, "minimally-invasive");
  assert.equal(mp.kind, "redirect");
  assert.equal(mp.kind === "redirect" && mp.target.slug, "koeln-arcaden");
});

test("Köln: operativ/ambulant -> nur MediaPark, Arcaden leitet um", () => {
  for (const type of ["operational", "abulatory"] as const) {
    assert.deepEqual(decideLocationTreatment(MEDIAPARK, ALL, type), {
      kind: "served",
    });
    const a = decideLocationTreatment(ARCADEN, ALL, type);
    assert.equal(a.kind, "redirect");
    assert.equal(a.kind === "redirect" && a.target.slug, "mediapark-klinik");
  }
});

test("andere Staedte bleiben unveraendert (keine Alternative in der Stadt)", () => {
  assert.deepEqual(decideLocationTreatment(DUESSELDORF, ALL, "operational"), {
    kind: "unchanged",
  });
  assert.deepEqual(
    decideLocationTreatment(DUESSELDORF, ALL, "minimally-invasive"),
    { kind: "served" },
  );
});

test("ohne Typ keine Konsolidierung", () => {
  assert.deepEqual(decideLocationTreatment(MEDIAPARK, ALL, undefined), {
    kind: "unchanged",
  });
});

test("Standort im Aufbau ist nie Ziel einer Umleitung", () => {
  const comingSoon = { ...ARCADEN, isOpen: false };
  assert.deepEqual(
    decideLocationTreatment(MEDIAPARK, [comingSoon, MEDIAPARK], "minimally-invasive"),
    { kind: "served" },
  );
});

test("mehrdeutige Ziele (zwei Lounges) -> unchanged statt Raten", () => {
  const second = { ...ARCADEN, documentId: "x", slug: "zweite-lounge" };
  assert.deepEqual(
    decideLocationTreatment(MEDIAPARK, [ARCADEN, second, MEDIAPARK], "minimally-invasive"),
    { kind: "unchanged" },
  );
  assert.equal(servingLocations([ARCADEN, second, MEDIAPARK], "minimally-invasive").length, 2);
});

test("Karten/Sitemap: Arcaden ohne OPs, MediaPark nur OPs", () => {
  const keys = PAGES.map((p) => p.pathKey);
  assert.deepEqual(keepPathKeysForLocation(keys, ARCADEN, ALL, INDEX), [
    "botox",
    "botox/masseter",
    "hyaluron/kinnkorrektur",
    "anti-haarausfall/prp-haartherapie",
    "skinbooster",
    "unbekannt/seite",
  ]);
  assert.deepEqual(keepPathKeysForLocation(keys, MEDIAPARK, ALL, INDEX), [
    "schoenheitsoperationen",
    "schoenheitsoperationen/facelift",
    "schoenheitsoperationen/haartransplantation",
    "schoenheitsoperationen/fettabsaugung",
    "unbekannt/seite",
  ]);
});

test("Querverweise: Arcaden kennt MediaPark fuer OPs und umgekehrt", () => {
  const keys = PAGES.map((p) => p.pathKey);
  const fromArcaden = siblingLocationPathKeys(keys, ARCADEN, ALL, INDEX);
  assert.equal(fromArcaden["schoenheitsoperationen/haartransplantation"], "koeln/mediapark-klinik");
  assert.equal(fromArcaden["botox"], undefined);
  const fromMediapark = siblingLocationPathKeys(keys, MEDIAPARK, ALL, INDEX);
  assert.equal(fromMediapark["botox/masseter"], "koeln/koeln-arcaden");
  assert.equal(fromMediapark["schoenheitsoperationen"], undefined);
});
