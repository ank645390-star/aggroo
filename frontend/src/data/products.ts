/* =================================================================
   Shared catalogue data — used by both /catalog and the header search.
   ================================================================= */

export type Category =
  | "biopesticide"
  | "macro"
  | "inoculant"
  | "rodenticide"
  | "organic";

export type Product = {
  id: string;
  name: string;
  desc: string;
  category: Category;
  photo: string;
  price: number;
  defaultVolume: string;
  packing: string;
  norm: string;
  inStock: boolean;
  rating: number;
  reviews: number;
  isHit?: boolean;
  isNew?: boolean;
  createdAt: number;
};

const PHOTOS = [
  "/Photo@2x.webp", "/Photo1@2x.webp", "/Photo2@2x.webp",
  "/Photo3@2x.webp", "/Photo4@2x.webp", "/Photo5@2x.webp",
  "/Photo6@2x.webp", "/Photo7@2x.webp", "/Photo8@2x.webp",
];

export const ALL_PRODUCTS: Product[] = [
  { id: "venator",   name: "Венатор",   desc: "біологічний родентицид",                                  category: "rodenticide",  photo: PHOTOS[0], price: 420, defaultVolume: "5 Л", packing: "1, 5, 10 л", norm: "1.5-2 л/га", inStock: true,  rating: 4.9, reviews: 100, isHit: true,  createdAt: Date.parse("2025-09-01") },
  { id: "flores",    name: "Флорес",    desc: "комплексний інокулянт для бобових культур",               category: "inoculant",    photo: PHOTOS[1], price: 380, defaultVolume: "5 Л", packing: "1, 5, 10 л", norm: "2-3 л/т",    inStock: true,  rating: 4.8, reviews: 84,  isHit: true,  createdAt: Date.parse("2025-08-15") },
  { id: "agrostim",  name: "Агростим",  desc: "макро та мікро елементи для обробки зернобобових",        category: "macro",        photo: PHOTOS[2], price: 290, defaultVolume: "5 Л", packing: "1, 5, 10 л", norm: "1-2 л/га",   inStock: true,  rating: 4.7, reviews: 62,                createdAt: Date.parse("2025-11-10") },
  { id: "gladiator", name: "Гладіатор", desc: "потужний біоінсектицид широкого спектру",                 category: "biopesticide", photo: PHOTOS[3], price: 510, defaultVolume: "5 Л", packing: "1, 5, 10 л", norm: "0.5-1 л/га", inStock: true,  rating: 4.9, reviews: 142, isHit: true,  createdAt: Date.parse("2025-07-20") },
  { id: "rodentmax", name: "РодентМакс",desc: "родентицид-приманка тривалої дії",                        category: "rodenticide",  photo: PHOTOS[4], price: 350, defaultVolume: "5 Л", packing: "1, 5, 10 л", norm: "1-1.5 кг/га",inStock: true,  rating: 4.6, reviews: 48,                createdAt: Date.parse("2025-10-05") },
  { id: "biogumin",  name: "Біогумін",  desc: "органічне добриво на основі вермикомпосту",               category: "organic",      photo: PHOTOS[5], price: 220, defaultVolume: "5 Л", packing: "1, 5, 10 л", norm: "3-5 л/га",   inStock: true,  rating: 4.5, reviews: 30,                createdAt: Date.parse("2025-09-25") },
  { id: "nodulin",   name: "Нодулін",   desc: "інокулянт для сої та інших бобових",                      category: "inoculant",    photo: PHOTOS[6], price: 410, defaultVolume: "5 Л", packing: "1, 5, 10 л", norm: "2 л/т",      inStock: false, rating: 4.7, reviews: 56,  isNew: true,  createdAt: Date.parse("2026-01-10") },
  { id: "ekobio",    name: "ЕкоБіо",    desc: "біоінсектицид для захисту садових культур",               category: "biopesticide", photo: PHOTOS[7], price: 480, defaultVolume: "5 Л", packing: "1, 5, 10 л", norm: "1-2 л/га",   inStock: true,  rating: 4.4, reviews: 22,                createdAt: Date.parse("2025-08-01") },
  { id: "mineral10", name: "Мінерал-10",desc: "макро та мікро елементи для всіх типів культур",          category: "macro",        photo: PHOTOS[8], price: 310, defaultVolume: "5 Л", packing: "1, 5, 10 л", norm: "1-3 л/га",   inStock: true,  rating: 4.8, reviews: 71,  isHit: true,  createdAt: Date.parse("2025-12-12") },
  { id: "kompost",   name: "Компост-Плюс", desc: "органічне добриво гранульоване",                       category: "organic",      photo: PHOTOS[0], price: 180, defaultVolume: "5 Л", packing: "5, 10, 25 кг", norm: "0.5 т/га",  inStock: true,  rating: 4.6, reviews: 39,                createdAt: Date.parse("2025-06-18") },
  { id: "rapidkill", name: "РапідКіл",  desc: "родентицид швидкої дії",                                  category: "rodenticide",  photo: PHOTOS[1], price: 395, defaultVolume: "5 Л", packing: "1, 5, 10 л", norm: "1-1.5 кг/га",inStock: true,  rating: 4.5, reviews: 28,                createdAt: Date.parse("2025-11-30") },
  { id: "fitoplant", name: "ФітоПлант", desc: "комплексне макродобриво для злакових",                    category: "macro",        photo: PHOTOS[2], price: 275, defaultVolume: "5 Л", packing: "1, 5, 10 л", norm: "1-2 л/га",   inStock: true,  rating: 4.7, reviews: 53,                createdAt: Date.parse("2026-02-01") },
  { id: "bioshield", name: "БіоЩит",    desc: "біоінсектицид проти ґрунтових шкідників",                 category: "biopesticide", photo: PHOTOS[3], price: 530, defaultVolume: "5 Л", packing: "1, 5, 10 л", norm: "0.5-1 л/га", inStock: false, rating: 4.9, reviews: 117, isNew: true,  createdAt: Date.parse("2026-01-25") },
  { id: "rizotum",   name: "Різотум",   desc: "інокулянт для гороху та люцерни",                         category: "inoculant",    photo: PHOTOS[4], price: 365, defaultVolume: "5 Л", packing: "1, 5, 10 л", norm: "1.5 л/т",    inStock: true,  rating: 4.6, reviews: 42,                createdAt: Date.parse("2025-10-22") },
  { id: "vermosol",  name: "ВермоСол",  desc: "органічне добриво рідке",                                 category: "organic",      photo: PHOTOS[5], price: 240, defaultVolume: "5 Л", packing: "1, 5, 10 л", norm: "2-4 л/га",   inStock: true,  rating: 4.5, reviews: 33,                createdAt: Date.parse("2025-05-14") },
  { id: "ratstop",   name: "РатСтоп",   desc: "родентицид у пастках та зернах",                          category: "rodenticide",  photo: PHOTOS[6], price: 340, defaultVolume: "5 Л", packing: "1, 5, 10 л", norm: "1 кг/га",    inStock: true,  rating: 4.4, reviews: 21,                createdAt: Date.parse("2025-07-07") },
  { id: "microset",  name: "МікроСет",  desc: "комплекс мікроелементів для позакореневого підживлення",  category: "macro",        photo: PHOTOS[7], price: 320, defaultVolume: "5 Л", packing: "1, 5, 10 л", norm: "1-1.5 л/га", inStock: true,  rating: 4.8, reviews: 65,  isHit: true,  createdAt: Date.parse("2025-12-30") },
  { id: "biograd",   name: "БіоГрад",   desc: "біоінсектицид проти попелиці та трипсів",                 category: "biopesticide", photo: PHOTOS[8], price: 470, defaultVolume: "5 Л", packing: "1, 5, 10 л", norm: "0.5-1 л/га", inStock: true,  rating: 4.7, reviews: 58,                createdAt: Date.parse("2025-09-09") },
  { id: "humatpro",  name: "Гумат-Pro", desc: "органічне добриво з гумінових кислот",                    category: "organic",      photo: PHOTOS[0], price: 200, defaultVolume: "5 Л", packing: "1, 5, 10 л", norm: "2-3 л/га",   inStock: true,  rating: 4.6, reviews: 47,                createdAt: Date.parse("2025-04-20") },
  { id: "azotofix",  name: "АзотоФікс", desc: "інокулянт-фіксатор азоту для бобових",                    category: "inoculant",    photo: PHOTOS[1], price: 425, defaultVolume: "5 Л", packing: "1, 5, 10 л", norm: "1.5-2 л/т",  inStock: true,  rating: 4.9, reviews: 89,  isNew: true,  createdAt: Date.parse("2026-02-08") },
];

export const CATEGORY_LABELS: Record<Category, string> = {
  biopesticide: "Біоінсектициди",
  macro:        "Макро та Мікро",
  inoculant:    "Інокулянти",
  rodenticide:  "Родентициди",
  organic:      "Органічні добрива",
};

/**
 * Live suggestion lookup — fires from the N-th character (default 2),
 * matches against name / desc / category, returns up to `limit` items.
 */
export function searchProducts(
  query: string,
  options: { minChars?: number; limit?: number } = {}
): Product[] {
  const { minChars = 2, limit = 6 } = options;
  const q = query.trim().toLowerCase();
  if (q.length < minChars) return [];
  return ALL_PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q) ||
      CATEGORY_LABELS[p.category].toLowerCase().includes(q)
  ).slice(0, limit);
}
