const { db } = require('../database/db');

async function log(user, action, entityType, entityId, entityName, details = {}) {
  try {
    await db.execute({
      sql: `INSERT INTO activity_log (user_name, action, entity_type, entity_id, entity_name, details)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [user || 'Unknown', action, entityType, entityId, entityName || '', JSON.stringify(details)],
    });
  } catch (err) {
    console.error('[logger]', err.message);
  }
}

module.exports = log;
