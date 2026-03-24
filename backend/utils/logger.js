const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

/**
 * Log an activity to the activity_log table.
 * @param {string} user - 'Aymane' | 'Zaid' | ...
 * @param {'created'|'updated'|'deleted'} action
 * @param {'item'|'sale'|'expense'} entityType
 * @param {string} entityId
 * @param {string} entityName - human-readable label
 * @param {object} details - extra data (changes, values...)
 */
function log(user, action, entityType, entityId, entityName, details = {}) {
  try {
    db.prepare(`
      INSERT INTO activity_log (id, user_name, action, entity_type, entity_id, entity_name, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), user || 'Unknown', action, entityType, entityId, entityName || '', JSON.stringify(details));
  } catch (err) {
    console.error('[logger]', err.message);
  }
}

module.exports = log;
