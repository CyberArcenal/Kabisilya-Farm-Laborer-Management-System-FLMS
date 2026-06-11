// src/utils/dbActions.js

const auditLogger = require("../auditLogger");
const { loadSubscribers } = require("./subscriberRegistry");
const subscribers = loadSubscribers();

function getEntityName(target) {
  return target.options?.name || target.name || "Unknown";
}

function findSubscriber(entityClass) {
  return subscribers.find((sub) => sub.listenTo() === entityClass);
}

/**
 * I-save ang entity sa database gamit ang repository at i-trigger ang subscriber lifecycle.
 *
 * @template T
 * @param {{ target: Function; save: (entity: T) => Promise<T>; manager?: any }} repo
 * @param {T} entity
 * @param {Object} [options]
 * @param {import("typeorm").QueryRunner} [options.queryRunner] - Optional query runner para sa transaction
 * @param {boolean} [options.skipSignal=false]
 * @returns {Promise<T>}
 */
async function saveDb(repo, entity, options = {}) {
  const { queryRunner = null, skipSignal = false } = options;
  const manager = queryRunner?.manager ?? repo.manager;

  try {
    const subscriber = findSubscriber(repo.target);

    if (!skipSignal && subscriber?.beforeInsert) {
      await subscriber.beforeInsert(entity, { manager, queryRunner });
    }

    const result = await repo.save(entity);

    if (!skipSignal && subscriber?.afterInsert) {
      await subscriber.afterInsert(result, { manager, queryRunner });
    }

    return result;
  } catch (error) {
    const entityName = getEntityName(repo.target);
    await auditLogger
      .log({
        action: "CREATE_FAILED",
        entity: entityName,
        newData: entity,
        description: error.message,
      })
      .catch((logErr) =>
        console.error("Failed to log audit error (saveDb):", logErr),
      );
    throw error;
  }
}

/**
 * I-update ang entity sa database at i-trigger ang subscriber lifecycle.
 *
 * @template T
 * @param {{ target: Function; save: (entity: T) => Promise<T>; findOne: (opts: any) => Promise<T | null>; manager?: any }} repo
 * @param {T} entity
 * @param {Object} [options]
 * @param {import("typeorm").QueryRunner} [options.queryRunner]
 * @param {boolean} [options.skipSignal=false]
 * @returns {Promise<T>}
 */
async function updateDb(repo, entity, options = {}) {
  const { queryRunner = null, skipSignal = false } = options;
  const manager = queryRunner?.manager ?? repo.manager;
  let oldEntity = null;

  try {
    const subscriber = findSubscriber(repo.target);

    oldEntity = await repo.findOne({ where: { id: entity.id } });

    if (!skipSignal && subscriber?.beforeUpdate) {
      await subscriber.beforeUpdate(entity, { manager, queryRunner });
    }

    const result = await repo.save(entity);

    if (!skipSignal && subscriber?.afterUpdate) {
      await subscriber.afterUpdate(
        { databaseEntity: oldEntity, entity: result },
        { manager, queryRunner },
      );
    }

    return result;
  } catch (error) {
    const entityName = getEntityName(repo.target);
    await auditLogger
      .log({
        action: "UPDATE_FAILED",
        entity: entityName,
        entityId: entity.id,
        oldData: oldEntity,
        newData: entity,
        description: error.message,
      })
      .catch((logErr) =>
        console.error("Failed to log audit error (updateDb):", logErr),
      );
    throw error;
  }
}

/**
 * I-remove ang entity sa database at i-trigger ang subscriber lifecycle.
 *
 * @template T
 * @param {{ target: Function; remove: (entity: T) => Promise<T>; findOne: (opts: any) => Promise<T | null>; manager?: any }} repo
 * @param {T} entity
 * @param {Object} [options]
 * @param {import("typeorm").QueryRunner} [options.queryRunner]
 * @param {boolean} [options.skipSignal=false]
 * @returns {Promise<T>}
 */
async function removeDb(repo, entity, options = {}) {
  const { queryRunner = null, skipSignal = false } = options;
  const manager = queryRunner?.manager ?? repo.manager;
  let oldEntity = null;

  try {
    const subscriber = findSubscriber(repo.target);

    if (!skipSignal && subscriber?.beforeRemove) {
      await subscriber.beforeRemove(entity, { manager, queryRunner });
    }

    oldEntity = await repo.findOne({ where: { id: entity.id } });
    const result = await repo.remove(entity);

    if (!skipSignal && subscriber?.afterRemove) {
      await subscriber.afterRemove(
        { databaseEntity: oldEntity, entityId: result.id },
        { manager, queryRunner },
      );
    }

    return result;
  } catch (error) {
    const entityName = getEntityName(repo.target);
    await auditLogger
      .log({
        action: "DELETE_FAILED",
        entity: entityName,
        entityId: entity.id,
        oldData: entity,
        description: error.message,
      })
      .catch((logErr) =>
        console.error("Failed to log audit error (removeDb):", logErr),
      );
    throw error;
  }
}

module.exports = { saveDb, updateDb, removeDb };
