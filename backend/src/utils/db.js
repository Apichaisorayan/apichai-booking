// Helper functions for D1 database operations

export const generateId = () => {
  return crypto.randomUUID();
};

export const executeQuery = async (db, query, params = []) => {
  try {
    const result = await db.prepare(query).bind(...params).all();
    return result.results;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
};

export const executeOne = async (db, query, params = []) => {
  try {
    const result = await db.prepare(query).bind(...params).first();
    return result;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
};

export const executeRun = async (db, query, params = []) => {
  try {
    const result = await db.prepare(query).bind(...params).run();
    return result;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
};
