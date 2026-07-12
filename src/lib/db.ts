let worker: Worker | null = null;
const pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();

function getWorker(): Worker {
  if (!worker) {
    // Instantiate worker using standard Vite ESM syntax
    worker = new Worker(
      new URL('../workers/db.worker.ts', import.meta.url),
      { type: 'module' }
    );
    
    worker.onmessage = (event) => {
      const { id, success, payload, error } = event.data;
      const request = pendingRequests.get(id);
      if (request) {
        pendingRequests.delete(id);
        if (success) {
          request.resolve(payload);
        } else {
          request.reject(new Error(error));
        }
      }
    };
  }
  return worker;
}

function sendToWorker<T>(type: string, payload?: any): Promise<T> {
  const id = Math.random().toString(36).substring(2, 9);
  const w = getWorker();
  
  return new Promise<T>((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    w.postMessage({ id, type, payload });
  });
}

export const dbClient = {
  init(): Promise<{ success: boolean }> {
    return sendToWorker('init');
  },
  
  importBible(xmlText: string): Promise<{ count: number }> {
    return sendToWorker('import_bible', { xmlText });
  },
  
  importSong(xmlText: string): Promise<{ title: string }> {
    return sendToWorker('import_song', { xmlText });
  },
  
  searchBible(query: string): Promise<Array<{ bookName: string; chapter: number; verseNum: number; text: string }>> {
    return sendToWorker('search_bible', { query });
  },
  
  searchSongs(query: string): Promise<Array<{ id: number; title: string; authors: string; lyrics: string; xml: string }>> {
    return sendToWorker('search_songs', { query });
  },
  
  listSongs(): Promise<Array<{ id: number; title: string; authors: string; lyrics: string; xml: string }>> {
    return sendToWorker('list_songs');
  },
  
  listBooks(): Promise<Array<{ bookName: string; bookNum: number }>> {
    return sendToWorker('list_books');
  },
  
  getChapters(bookName: string): Promise<number[]> {
    return sendToWorker('get_chapters', { bookName });
  },
  
  getVerses(bookName: string, chapter: number): Promise<Array<{ verseNum: number; text: string }>> {
    return sendToWorker('get_verses', { bookName, chapter });
  },
  
  exportBible(): Promise<any> {
    return sendToWorker('export_bible');
  }
};
