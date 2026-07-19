interface Env {
  ACCESS_AUD: string;
  ACCESS_TEAM_DOMAIN: string;
  ASSETS: Fetcher;
  DB: D1Database;
  TLDRAW_BUCKET: R2Bucket;
  TLDRAW_DURABLE_OBJECT: DurableObjectNamespace<
    import("./worker/TldrawDurableObject").TldrawDurableObject
  >;
}
