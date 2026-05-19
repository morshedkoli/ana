export { connectDB } from './mongodb';
export * from './schema';

/** Cast a Mongoose doc array to a plain typed array via toJSON() transform */
export function plain<T>(docs: Array<{ toJSON(): unknown }>): T[] {
  return docs.map(d => d.toJSON()) as unknown as T[];
}

/** Cast a single nullable Mongoose doc to a plain typed object via toJSON() */
export function plainOne<T>(doc: { toJSON(): unknown } | null | undefined): T | null {
  return doc ? (doc.toJSON() as unknown as T) : null;
}
