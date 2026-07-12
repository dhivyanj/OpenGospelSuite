export const bookAbbreviationMap: Record<string, string> = {
  // Old Testament
  'gen': 'Genesis', 'ge': 'Genesis', 'gn': 'Genesis',
  'ex': 'Exodus', 'exo': 'Exodus', 'exod': 'Exodus',
  'lev': 'Leviticus', 'le': 'Leviticus', 'lv': 'Leviticus',
  'num': 'Numbers', 'nu': 'Numbers', 'nm': 'Numbers',
  'deut': 'Deuteronomy', 'de': 'Deuteronomy', 'dt': 'Deuteronomy',
  'josh': 'Joshua', 'jos': 'Joshua', 'jsh': 'Joshua',
  'judg': 'Judges', 'jud': 'Judges', 'jdg': 'Judges', 'jg': 'Judges',
  'ruth': 'Ruth', 'rut': 'Ruth', 'ru': 'Ruth',
  '1sam': '1 Samuel', '1sa': '1 Samuel', '1s': '1 Samuel', '1 sam': '1 Samuel', 'i sam': '1 Samuel',
  '2sam': '2 Samuel', '2sa': '2 Samuel', '2s': '2 Samuel', '2 sam': '2 Samuel', 'ii sam': '2 Samuel',
  '1ki': '1 Kings', '1kings': '1 Kings', '1k': '1 Kings', '1 ki': '1 Kings', 'i ki': '1 Kings',
  '2ki': '2 Kings', '2kings': '2 Kings', '2k': '2 Kings', '2 ki': '2 Kings', 'ii ki': '2 Kings',
  '1chr': '1 Chronicles', '1ch': '1 Chronicles', '1 chr': '1 Chronicles', 'i chr': '1 Chronicles',
  '2chr': '2 Chronicles', '2ch': '2 Chronicles', '2 chr': '2 Chronicles', 'ii chr': '2 Chronicles',
  'ezra': 'Ezra', 'ezr': 'Ezra',
  'neh': 'Nehemiah', 'ne': 'Nehemiah',
  'esth': 'Esther', 'est': 'Esther', 'es': 'Esther',
  'job': 'Job', 'jb': 'Job',
  'ps': 'Psalms', 'psa': 'Psalms', 'psalm': 'Psalms', 'pss': 'Psalms',
  'prov': 'Proverbs', 'pro': 'Proverbs', 'pr': 'Proverbs',
  'eccl': 'Ecclesiastes', 'ecc': 'Ecclesiastes', 'ec': 'Ecclesiastes',
  'song': 'Song of Solomon', 'sos': 'Song of Solomon', 'canticles': 'Song of Solomon',
  'isa': 'Isaiah', 'is': 'Isaiah',
  'jer': 'Jeremiah', 'je': 'Jeremiah', 'jr': 'Jeremiah',
  'lam': 'Lamentations', 'la': 'Lamentations',
  'ezek': 'Ezekiel', 'eze': 'Ezekiel', 'ez': 'Ezekiel',
  'dan': 'Daniel', 'da': 'Daniel', 'dn': 'Daniel',
  'hos': 'Hosea', 'ho': 'Hosea',
  'joel': 'Joel', 'jl': 'Joel',
  'amos': 'Amos', 'am': 'Amos',
  'obad': 'Obadiah', 'ob': 'Obadiah',
  'jon': 'Jonah', 'jnh': 'Jonah',
  'mic': 'Micah', 'mc': 'Micah',
  'nah': 'Nahum', 'na': 'Nahum',
  'hab': 'Habakkuk', 'hb': 'Habakkuk',
  'zeph': 'Zephaniah', 'zp': 'Zephaniah',
  'hag': 'Haggai', 'hg': 'Haggai',
  'zech': 'Zechariah', 'zc': 'Zechariah',
  'mal': 'Malachi', 'ml': 'Malachi',

  // New Testament
  'matt': 'Matthew', 'mat': 'Matthew', 'mt': 'Matthew',
  'mark': 'Mark', 'mrk': 'Mark', 'mk': 'Mark',
  'luke': 'Luke', 'luk': 'Luke', 'lk': 'Luke',
  'john': 'John', 'joh': 'John', 'jn': 'John', 'jhn': 'John',
  'acts': 'Acts', 'act': 'Acts', 'ac': 'Acts',
  'rom': 'Romans', 'ro': 'Romans', 'rm': 'Romans',
  '1cor': '1 Corinthians', '1co': '1 Corinthians', '1 cor': '1 Corinthians', 'i cor': '1 Corinthians',
  '2cor': '2 Corinthians', '2co': '2 Corinthians', '2 cor': '2 Corinthians', 'ii cor': '2 Corinthians',
  'gal': 'Galatians', 'ga': 'Galatians',
  'eph': 'Ephesians', 'ep': 'Ephesians',
  'phil': 'Philippians', 'php': 'Philippians', 'phi': 'Philippians',
  'col': 'Colossians', 'co': 'Colossians',
  '1thess': '1 Thessalonians', '1th': '1 Thessalonians', '1 thess': '1 Thessalonians', 'i thess': '1 Thessalonians',
  '2thess': '2 Thessalonians', '2th': '2 Thessalonians', '2 thess': '2 Thessalonians', 'ii thess': '2 Thessalonians',
  '1tim': '1 Timothy', '1ti': '1 Timothy', '1 tim': '1 Timothy', 'i tim': '1 Timothy',
  '2tim': '2 Timothy', '2ti': '2 Timothy', '2 tim': '2 Timothy', 'ii tim': '2 Timothy',
  'titus': 'Titus', 'tit': 'Titus', 'ti': 'Titus',
  'philem': 'Philemon', 'phm': 'Philemon',
  'heb': 'Hebrews', 'he': 'Hebrews',
  'jas': 'James', 'jam': 'James', 'jm': 'James',
  '1pet': '1 Peter', '1pe': '1 Peter', '1 pet': '1 Peter', 'i pet': '1 Peter',
  '2pet': '2 Peter', '2pe': '2 Peter', '2 pet': '2 Peter', 'ii pet': '2 Peter',
  '1jn': '1 John', '1j': '1 John', '1 jn': '1 John', 'i jn': '1 John',
  '2jn': '2 John', '2j': '2 John', '2 jn': '2 John', 'ii jn': '2 John',
  '3jn': '3 John', '3j': '3 John', '3 jn': '3 John', 'iii jn': '3 John',
  'jude': 'Jude', 'jde': 'Jude',
  'rev': 'Revelation', 're': 'Revelation', 'apoc': 'Revelation'
};

export const canonicalBooks = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah',
  'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
  'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah',
  'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
  'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter',
  '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'
];

export interface parsedShortcut {
  bookName: string;
  chapter: number;
  verse?: number;
}

export function parseBibleShortcut(
  query: string, 
  availableBooks: Array<{ bookName: string; bookNum: number }>
): parsedShortcut | null {
  const trimmed = query.trim().toLowerCase();
  // Match e.g. "ps 145 19", "ps 145:19", "mt 23", "1sam 3:4", "1 sam 3 4"
  const regex = /^([1-3]?\s*[a-zA-Z\s]+)\s+(\d+)(?:[\s:]+(\d+))?$/;
  const match = trimmed.match(regex);
  if (!match) return null;

  const rawBookPart = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const verse = match[3] ? parseInt(match[3], 10) : undefined;

  // Normalize book name to match mapping keys
  const normalizedBook = rawBookPart.replace(/\s+/g, '');
  const mappedName = bookAbbreviationMap[normalizedBook] || bookAbbreviationMap[rawBookPart];
  
  let resolvedBookName = '';

  if (mappedName) {
    const canonicalIndex = canonicalBooks.findIndex(b => b.toLowerCase() === mappedName.toLowerCase());
    const targetBookNum = canonicalIndex !== -1 ? canonicalIndex + 1 : -1;
    if (targetBookNum !== -1) {
      const foundBook = availableBooks.find(b => b.bookNum === targetBookNum);
      if (foundBook) {
        resolvedBookName = foundBook.bookName;
      }
    }
  }

  // Fallback direct name match (e.g. searching local names directly: "ஆதியாகமம் 1")
  if (!resolvedBookName) {
    const foundBook = availableBooks.find(b => {
      const bLower = b.bookName.toLowerCase();
      const normName = bLower.replace(/\s+/g, '');
      return bLower === rawBookPart || normName === normalizedBook || bLower.startsWith(rawBookPart);
    });
    if (foundBook) {
      resolvedBookName = foundBook.bookName;
    }
  }

  if (!resolvedBookName) return null;

  return {
    bookName: resolvedBookName,
    chapter,
    verse
  };
}
