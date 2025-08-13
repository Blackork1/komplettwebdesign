// models/districtModel.js
export const DISTRICTS = [
  { name: "Friedrichshain",  slug: "friedrichshain" },
  { name: "Prenzlauer Berg", slug: "prenzlauer-berg" },
  { name: "Kreuzberg",       slug: "kreuzberg" },
  { name: "Charlottenburg",  slug: "charlottenburg" },
  { name: "Lichtenberg",     slug: "lichtenberg" },
  { name: "Mitte",           slug: "mitte" }
];

export function getDistrictBySlug(slug) {
  return DISTRICTS.find(d => d.slug === slug) || null;
}
