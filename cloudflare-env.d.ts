declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    PYTHON_BACKEND_URL?: string;
  }
}
