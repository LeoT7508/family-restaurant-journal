import type { PlaceResult } from '@/types'

/**
 * SAMPLE DATA. Well-known chains and local spots in the area around Chicago, IL 60601.
 * Names and cuisines are real-world flavored, but addresses, drive times and tags are approximate
 * and have NOT been verified. Treat them as placeholders until Google Places replaces this list.
 */
const p = (
  slug: string,
  name: string,
  cuisine: string,
  priceLevel: number,
  driveMinutes: number,
  address: string,
  tags: string[],
): PlaceResult => ({
  placeId: `mock:${slug}`,
  name,
  cuisine,
  priceLevel,
  driveMinutes,
  address,
  tags,
})

export const MOCK_PLACES: PlaceResult[] = [
  p(
    'superdawg',
    'Superdawg Drive-In',
    'Hot dogs & burgers',
    1,
    8,
    '6363 N Milwaukee Ave, Chicago, IL 60646',
    ['kid-friendly', 'quick-service', 'drive-in'],
  ),
  p('portillos', "Portillo's", 'Hot dogs & Italian beef', 1, 11, 'Harlem Ave, Niles, IL 60714', [
    'kid-friendly',
    'quick-service',
  ]),
  p(
    'lou-malnatis',
    "Lou Malnati's Pizzeria",
    'Pizza',
    2,
    12,
    '6649 N Lincoln Ave, Lincolnwood, IL 60712',
    ['kid-friendly', 'full-service'],
  ),
  p('giordanos', "Giordano's", 'Pizza', 2, 10, 'Milwaukee Ave, Niles, IL 60714', [
    'kid-friendly',
    'full-service',
  ]),
  p('buona-beef', 'Buona Beef', 'Italian beef', 1, 9, 'Harlem Ave, Norridge, IL 60601', [
    'quick-service',
    'kid-friendly',
  ]),
  p('chipotle', 'Chipotle Mexican Grill', 'Mexican', 1, 6, 'Lawrence Ave, Chicago, IL 60601', [
    'quick-service',
    'kid-friendly',
    'takeout',
  ]),
  p('panera', 'Panera Bread', 'Bakery & cafe', 1, 7, 'Harlem Ave, Norridge, IL 60601', [
    'quick-service',
    'kid-friendly',
    'takeout',
  ]),
  p('chick-fil-a', 'Chick-fil-A', 'Chicken', 1, 8, 'Touhy Ave, Park Ridge, IL 60068', [
    'quick-service',
    'kid-friendly',
    'takeout',
  ]),
  p('olive-garden', 'Olive Garden', 'Italian', 2, 9, 'Harlem Ave, Norridge, IL 60601', [
    'kid-friendly',
    'full-service',
    'wine-list',
  ]),
  p('red-robin', 'Red Robin Gourmet Burgers', 'American', 2, 14, 'Golf Rd, Niles, IL 60714', [
    'kid-friendly',
    'full-service',
  ]),
  p(
    'cheesecake-factory',
    'The Cheesecake Factory',
    'American',
    3,
    22,
    'Old Orchard Center, Skokie, IL 60077',
    ['full-service', 'wine-list', 'kid-friendly'],
  ),
  p('texas-roadhouse', 'Texas Roadhouse', 'Steakhouse', 2, 16, 'Golf Rd, Niles, IL 60714', [
    'kid-friendly',
    'full-service',
  ]),
  p('pf-changs', "P.F. Chang's", 'Chinese', 3, 21, 'Old Orchard Center, Skokie, IL 60077', [
    'full-service',
    'wine-list',
  ]),
  p(
    'coopers-hawk',
    "Cooper's Hawk Winery & Restaurant",
    'American & wine',
    3,
    18,
    'Golf Rd, Niles, IL 60714',
    ['wine-list', 'full-service', 'kid-friendly'],
  ),
  p('smak-tak', 'Smak-Tak', 'Polish', 2, 13, '5961 N Elston Ave, Chicago, IL 60646', [
    'full-service',
    'kid-friendly',
  ]),
  p('pita-inn', 'Pita Inn', 'Mediterranean', 1, 17, 'Skokie, IL 60076', [
    'quick-service',
    'kid-friendly',
  ]),
  p('first-watch', 'First Watch', 'Breakfast & brunch', 2, 10, 'Touhy Ave, Park Ridge, IL 60068', [
    'brunch',
    'kid-friendly',
    'full-service',
  ]),
  p(
    'original-pancake-house',
    'The Original Pancake House',
    'Breakfast & brunch',
    2,
    15,
    'Chicago, IL 60631',
    ['brunch', 'kid-friendly', 'full-service'],
  ),
  p('noodles', 'Noodles & Company', 'Noodles & pasta', 1, 8, 'Harlem Ave, Norridge, IL 60601', [
    'quick-service',
    'kid-friendly',
  ]),
  p('potbelly', 'Potbelly Sandwich Shop', 'Sandwiches', 1, 7, 'Lawrence Ave, Chicago, IL 60601', [
    'quick-service',
    'takeout',
  ]),
  p('benihana', 'Benihana', 'Japanese', 3, 24, 'Downtown Chicago, IL 60611', [
    'full-service',
    'celebration',
  ]),
  p(
    'maggianos',
    "Maggiano's Little Italy",
    'Italian',
    3,
    22,
    'Old Orchard Center, Skokie, IL 60077',
    ['full-service', 'wine-list', 'celebration'],
  ),
  p('rosatis', "Rosati's Pizza", 'Pizza', 2, 10, 'Harlem Ave, Elmwood Park, IL 60707', [
    'kid-friendly',
    'takeout',
  ]),
  p('udupi-palace', 'Udupi Palace', 'Indian', 1, 20, 'Devon Ave, Chicago, IL 60659', [
    'quick-service',
  ]),
  p('pizzeria-uno', 'Pizzeria Uno', 'Pizza', 2, 25, 'Chicago, IL 60611', [
    'full-service',
    'kid-friendly',
  ]),
]
