declare module '*.svelte' {
  import type { Component } from 'svelte';
  const component: Component<any, any, any>;
  export default component;
}

declare module 'wa-sqlite/dist/wa-sqlite-async.mjs' {
  const factory: any;
  export default factory;
}

declare module 'wa-sqlite' {
  const SQLite: any;
  export default SQLite;
}
