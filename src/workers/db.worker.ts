import SQLiteAsyncESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
// @ts-ignore
import * as SQLite from 'wa-sqlite/src/sqlite-api.js';
// @ts-ignore
import { IDBBatchAtomicVFS } from 'wa-sqlite/src/examples/IDBBatchAtomicVFS.js';

let sqlite3: any;
let db: any;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

async function initDB(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Initialize SQLite async module with locateFile pointing to public directory
    const module = await SQLiteAsyncESMFactory({
      locateFile(path: string) {
        if (path.endsWith('.wasm')) {
          return '/wa-sqlite-async.wasm';
        }
        return path;
      }
    });

    sqlite3 = SQLite.Factory(module);

    // Use IDBBatchAtomicVFS for IndexedDB persistence
    const vfs = new IDBBatchAtomicVFS('opengospel_db');
    sqlite3.vfs_register(vfs, true);

    // Open the database file using the registered default VFS
    db = await sqlite3.open_v2('opengospel_db');

    // Create tables if they don't exist
    await sqlite3.exec(db, `
      CREATE TABLE IF NOT EXISTS verses (
        book_num INTEGER,
        book_name TEXT,
        chapter INTEGER,
        verse_num INTEGER,
        text TEXT
      );
      CREATE TABLE IF NOT EXISTS songs (
        title TEXT,
        authors TEXT,
        lyrics TEXT,
        xml TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_verses_book_chap_verse ON verses (book_name, chapter, verse_num);
      CREATE INDEX IF NOT EXISTS idx_verses_text ON verses (text);
      CREATE INDEX IF NOT EXISTS idx_songs_title ON songs (title);
    `);

    // FTS5 is not available on standard wa-sqlite builds; using LIKE/indexing instead.

    isInitialized = true;
  })();

  return initPromise;
}

// Custom lightweight XML parsers (DOMParser is not available in Web Workers)
function parseZefaniaXml(xmlText: string) {
  const verses: Array<{
    bookNum: number;
    bookName: string;
    chapter: number;
    verseNum: number;
    text: string;
  }> = [];

  const bookRegex = /<(BIBLEBOOK)\s+([^>]+)>([\s\S]*?)<\/\1>/gi;
  const chapterRegex = /<(CHAPTER)\s+([^>]+)>([\s\S]*?)<\/\1>/gi;
  const verseRegex = /<(VERS)\s+([^>]+)>([\s\S]*?)<\/\1>/gi;

  let bookMatch;
  while ((bookMatch = bookRegex.exec(xmlText)) !== null) {
    const attributes = bookMatch[2];
    const bookContent = bookMatch[3];

    const numMatch = /bnumber=["'](\d+)["']/i.exec(attributes);
    const nameMatch = /bname=["']([^"']+)["']/i.exec(attributes);
    if (!numMatch || !nameMatch) continue;

    const bookNum = parseInt(numMatch[1], 10);
    const bookName = nameMatch[1];

    let chapterMatch;
    chapterRegex.lastIndex = 0;
    while ((chapterMatch = chapterRegex.exec(bookContent)) !== null) {
      const chapAttrs = chapterMatch[2];
      const chapterContent = chapterMatch[3];

      const chapNumMatch = /cnumber=["'](\d+)["']/i.exec(chapAttrs);
      if (!chapNumMatch) continue;

      const chapterNum = parseInt(chapNumMatch[1], 10);

      let verseMatch;
      verseRegex.lastIndex = 0;
      while ((verseMatch = verseRegex.exec(chapterContent)) !== null) {
        const verseAttrs = verseMatch[2];
        const rawText = verseMatch[3];

        const verseNumMatch = /vnumber=["'](\d+)["']/i.exec(verseAttrs);
        if (!verseNumMatch) continue;

        const verseNum = parseInt(verseNumMatch[1], 10);
        const text = rawText.replace(/<[^>]+>/g, '').trim();
        verses.push({ bookNum, bookName, chapter: chapterNum, verseNum, text });
      }
    }
  }
  return verses;
}

function parseOpenLyricsXml(xmlText: string) {
  const titleMatch = /<title>([^<]+)<\/title>/i.exec(xmlText);
  const title = titleMatch ? titleMatch[1].trim() : 'Unknown Title';

  const authors: string[] = [];
  const authorRegex = /<author>([^<]+)<\/author>/gi;
  let authorMatch;
  while ((authorMatch = authorRegex.exec(xmlText)) !== null) {
    authors.push(authorMatch[1].trim());
  }
  const authorsStr = authors.join(', ') || 'Unknown Author';

  const verses: Array<{ name: string; text: string }> = [];
  const verseRegex = /<verse\s+[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/verse>/gi;
  let verseMatch;
  while ((verseMatch = verseRegex.exec(xmlText)) !== null) {
    const verseName = verseMatch[1];
    const verseContent = verseMatch[2];

    const linesRegex = /<lines>([\s\S]*?)<\/lines>/gi;
    let linesMatch;
    const linesTexts: string[] = [];
    while ((linesMatch = linesRegex.exec(verseContent)) !== null) {
      const lineText = linesMatch[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim();
      linesTexts.push(lineText);
    }
    verses.push({
      name: verseName,
      text: linesTexts.join('\n\n')
    });
  }

  const fullLyrics = verses.map(v => `[${v.name}]\n${v.text}`).join('\n\n');

  return {
    title,
    authors: authorsStr,
    lyrics: fullLyrics,
    verses
  };
}

async function importBible(xmlText: string) {
  await initDB();
  const verses = parseZefaniaXml(xmlText);
  if (verses.length === 0) {
    throw new Error('No verses found in Zefania XML. Please check the XML format.');
  }

  // Clear existing verses first
  await sqlite3.exec(db, 'DELETE FROM verses;');

  await sqlite3.exec(db, 'BEGIN TRANSACTION;');
  const sql = 'INSERT INTO verses (book_num, book_name, chapter, verse_num, text) VALUES (?, ?, ?, ?, ?);';
  const str = sqlite3.str_new(db, sql);
  const sqlPtr = sqlite3.str_value(str);
  const prepared = await sqlite3.prepare_v2(db, sqlPtr);
  const stmt = prepared.stmt;

  try {
    for (const v of verses) {
      sqlite3.bind_int(stmt, 1, v.bookNum);
      sqlite3.bind_text(stmt, 2, v.bookName);
      sqlite3.bind_int(stmt, 3, v.chapter);
      sqlite3.bind_int(stmt, 4, v.verseNum);
      sqlite3.bind_text(stmt, 5, v.text);
      await sqlite3.step(stmt);
      await sqlite3.reset(stmt);
    }
    await sqlite3.exec(db, 'COMMIT;');
  } catch (err) {
    await sqlite3.exec(db, 'ROLLBACK;');
    throw err;
  } finally {
    await sqlite3.finalize(stmt);
    sqlite3.str_finish(str);
  }

  return verses.length;
}

async function importSong(xmlText: string) {
  await initDB();
  const songData = parseOpenLyricsXml(xmlText);
  
  // Check if song already exists and delete it to prevent duplicates
  const checkSql = 'SELECT rowid FROM songs WHERE title = ?;';
  const checkStr = sqlite3.str_new(db, checkSql);
  const checkPrep = await sqlite3.prepare_v2(db, sqlite3.str_value(checkStr));
  const checkStmt = checkPrep.stmt;
  sqlite3.bind_text(checkStmt, 1, songData.title);
  
  let existingRowId: number | null = null;
  if (await sqlite3.step(checkStmt) === SQLite.SQLITE_ROW) {
    existingRowId = sqlite3.column_int(checkStmt, 0);
  }
  await sqlite3.finalize(checkStmt);
  sqlite3.str_finish(checkStr);

  if (existingRowId !== null) {
    const deleteSql = 'DELETE FROM songs WHERE rowid = ?;';
    const deleteStr = sqlite3.str_new(db, deleteSql);
    const deletePrep = await sqlite3.prepare_v2(db, sqlite3.str_value(deleteStr));
    sqlite3.bind_int(deletePrep.stmt, 1, existingRowId);
    await sqlite3.step(deletePrep.stmt);
    await sqlite3.finalize(deletePrep.stmt);
    sqlite3.str_finish(deleteStr);
  }

  const insertSql = 'INSERT INTO songs (title, authors, lyrics, xml) VALUES (?, ?, ?, ?);';
  const insertStr = sqlite3.str_new(db, insertSql);
  const prepared = await sqlite3.prepare_v2(db, sqlite3.str_value(insertStr));
  const stmt = prepared.stmt;

  try {
    sqlite3.bind_text(stmt, 1, songData.title);
    sqlite3.bind_text(stmt, 2, songData.authors);
    sqlite3.bind_text(stmt, 3, songData.lyrics);
    sqlite3.bind_text(stmt, 4, xmlText);
    await sqlite3.step(stmt);
  } finally {
    await sqlite3.finalize(stmt);
    sqlite3.str_finish(insertStr);
  }

  return songData.title;
}

async function searchBible(queryText: string) {
  await initDB();
  const results: any[] = [];
  
  const cleanQuery = queryText.replace(/[*"']/g, '').trim();
  if (!cleanQuery) return [];
  
  const terms = cleanQuery.split(/\s+/).filter(t => t.length > 0);
  const conditions = terms.map(() => 'text LIKE ?').join(' AND ');

  const sql = `
    SELECT book_name, chapter, verse_num, text 
    FROM verses 
    WHERE ${conditions}
    LIMIT 100;
  `;
  
  try {
    for await (const stmt of sqlite3.statements(db, sql)) {
      for (let i = 0; i < terms.length; i++) {
        sqlite3.bind_text(stmt, i + 1, `%${terms[i]}%`);
      }
      while (await sqlite3.step(stmt) === SQLite.SQLITE_ROW) {
        results.push({
          bookName: sqlite3.column_text(stmt, 0),
          chapter: sqlite3.column_int(stmt, 1),
          verseNum: sqlite3.column_int(stmt, 2),
          text: sqlite3.column_text(stmt, 3)
        });
      }
    }
  } catch (err) {
    console.error('Bible search worker error:', err);
  }
  
  return results;
}

async function searchSongs(queryText: string) {
  await initDB();
  const results: any[] = [];
  
  const cleanQuery = queryText.replace(/[*"']/g, '').trim();
  if (!cleanQuery) {
    return listSongs();
  }
  
  const terms = cleanQuery.split(/\s+/).filter(t => t.length > 0);
  const conditions = terms.map(() => '(title LIKE ? OR authors LIKE ? OR lyrics LIKE ?)').join(' AND ');
  
  const sql = `
    SELECT rowid, title, authors, lyrics, xml
    FROM songs
    WHERE ${conditions}
    LIMIT 50;
  `;
  
  try {
    for await (const stmt of sqlite3.statements(db, sql)) {
      let bindIndex = 1;
      for (let i = 0; i < terms.length; i++) {
        const termPattern = `%${terms[i]}%`;
        sqlite3.bind_text(stmt, bindIndex++, termPattern);
        sqlite3.bind_text(stmt, bindIndex++, termPattern);
        sqlite3.bind_text(stmt, bindIndex++, termPattern);
      }
      while (await sqlite3.step(stmt) === SQLite.SQLITE_ROW) {
        results.push({
          id: sqlite3.column_int(stmt, 0),
          title: sqlite3.column_text(stmt, 1),
          authors: sqlite3.column_text(stmt, 2),
          lyrics: sqlite3.column_text(stmt, 3),
          xml: sqlite3.column_text(stmt, 4)
        });
      }
    }
  } catch (err) {
    console.error('Song search worker error:', err);
  }
  
  return results;
}

async function listSongs() {
  await initDB();
  const results: any[] = [];
  const sql = `SELECT rowid, title, authors, lyrics, xml FROM songs ORDER BY title LIMIT 100;`;
  for await (const stmt of sqlite3.statements(db, sql)) {
    while (await sqlite3.step(stmt) === SQLite.SQLITE_ROW) {
      results.push({
        id: sqlite3.column_int(stmt, 0),
        title: sqlite3.column_text(stmt, 1),
        authors: sqlite3.column_text(stmt, 2),
        lyrics: sqlite3.column_text(stmt, 3),
        xml: sqlite3.column_text(stmt, 4)
      });
    }
  }
  return results;
}

async function listBooks() {
  await initDB();
  const results: Array<{ bookName: string; bookNum: number }> = [];
  const sql = `SELECT DISTINCT book_name, book_num FROM verses ORDER BY book_num;`;
  for await (const stmt of sqlite3.statements(db, sql)) {
    while (await sqlite3.step(stmt) === SQLite.SQLITE_ROW) {
      results.push({
        bookName: sqlite3.column_text(stmt, 0),
        bookNum: sqlite3.column_int(stmt, 1)
      });
    }
  }
  return results;
}

async function getChapters(bookName: string) {
  await initDB();
  const results: number[] = [];
  const sql = `SELECT DISTINCT chapter FROM verses WHERE book_name = ? ORDER BY chapter;`;
  for await (const stmt of sqlite3.statements(db, sql)) {
    sqlite3.bind_text(stmt, 1, bookName);
    while (await sqlite3.step(stmt) === SQLite.SQLITE_ROW) {
      results.push(sqlite3.column_int(stmt, 0));
    }
  }
  return results;
}

async function getVerses(bookName: string, chapter: number) {
  await initDB();
  const results: any[] = [];
  const sql = `SELECT verse_num, text FROM verses WHERE book_name = ? AND chapter = ? ORDER BY verse_num;`;
  for await (const stmt of sqlite3.statements(db, sql)) {
    sqlite3.bind_text(stmt, 1, bookName);
    sqlite3.bind_int(stmt, 2, chapter);
    while (await sqlite3.step(stmt) === SQLite.SQLITE_ROW) {
      results.push({
        verseNum: sqlite3.column_int(stmt, 0),
        text: sqlite3.column_text(stmt, 1)
      });
    }
  }
  return results;
}

async function exportBibleData() {
  await initDB();
  const results: any[] = [];
  const sql = `SELECT book_name, book_num, chapter, verse_num, text FROM verses ORDER BY book_num, chapter, verse_num;`;
  for await (const stmt of sqlite3.statements(db, sql)) {
    while (await sqlite3.step(stmt) === SQLite.SQLITE_ROW) {
      results.push({
        bookName: sqlite3.column_text(stmt, 0),
        bookNum: sqlite3.column_int(stmt, 1),
        chapter: sqlite3.column_int(stmt, 2),
        verseNum: sqlite3.column_int(stmt, 3),
        text: sqlite3.column_text(stmt, 4)
      });
    }
  }
  return results;
}

// Handle messages from the main thread
self.onmessage = async (event) => {
  const { id, type, payload } = event.data;
  
  try {
    let result: any = null;
    
    switch (type) {
      case 'init':
        result = await initDB();
        break;
      case 'import_bible':
        const versesCount = await importBible(payload.xmlText);
        result = { count: versesCount };
        break;
      case 'import_song':
        const songTitle = await importSong(payload.xmlText);
        result = { title: songTitle };
        break;
      case 'search_bible':
        result = await searchBible(payload.query);
        break;
      case 'search_songs':
        result = await searchSongs(payload.query);
        break;
      case 'list_songs':
        result = await listSongs();
        break;
      case 'list_books':
        result = await listBooks();
        break;
      case 'get_chapters':
        result = await getChapters(payload.bookName);
        break;
      case 'get_verses':
        result = await getVerses(payload.bookName, payload.chapter);
        break;
      case 'export_bible':
        result = await exportBibleData();
        break;
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
    self.postMessage({ id, success: true, payload: result });
  } catch (error: any) {
    console.error(`Error processing worker message of type ${type}:`, error);
    self.postMessage({ id, success: false, error: error.message || 'Worker execution error' });
  }
};
