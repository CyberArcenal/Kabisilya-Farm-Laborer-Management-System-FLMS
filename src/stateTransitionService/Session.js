// src/stateTransitionServices/SessionStateTransitionService.js
const { logger } = require("../utils/logger");
const { updateDb, saveDb } = require("../utils/dbUtils/dbActions");

class SessionStateTransitionService {
  constructor(dataSource) {
    this.dataSource = dataSource;
  }

  _getRepo(qr, entityClass) {
    if (qr) return qr.manager.getRepository(entityClass);
    return this.dataSource.getRepository(entityClass);
  }

  async onActivate(session, oldStatus = null, user = "system", qr = null) {
    const Session = require("../entities/Session");
    const { SystemSetting, SettingType } = require("../entities/systemSettings");
    const sessionRepo = this._getRepo(qr, Session);
    const settingRepo = this._getRepo(qr, SystemSetting);

    logger.info(`[SessionTransition] Activating session #${session.id}, old status: ${oldStatus}`);

    const otherActiveSessions = await sessionRepo
      .createQueryBuilder("session")
      .where("session.status = :status", { status: "active" })
      .andWhere("session.id != :id", { id: session.id })
      .getMany();

    for (const other of otherActiveSessions) {
      other.status = "closed";
      other.updatedAt = new Date();
      await updateDb(sessionRepo, other, { queryRunner: qr });
      logger.info(`[SessionTransition] Closed session #${other.id}`);
    }

    const settingKey = "default_session_id";
    const settingType = SettingType.FARM_SESSION;
    let defaultSetting = await settingRepo.findOne({
      where: { key: settingKey, setting_type: settingType, deletedAt: null },
    });

    if (defaultSetting) {
      defaultSetting.value = String(session.id);
      defaultSetting.updatedAt = new Date();
      await updateDb(settingRepo, defaultSetting, { queryRunner: qr });
    } else {
      defaultSetting = settingRepo.create({
        key: settingKey,
        value: String(session.id),
        setting_type: settingType,
        description: "Default session ID used throughout the farm",
        is_public: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await saveDb(settingRepo, defaultSetting, { queryRunner: qr });
    }
    logger.info(`[SessionTransition] Default session set to #${session.id}`);
  }

  async onClose(session, oldStatus = null, user = "system", qr = null) {
    logger.info(`[SessionTransition] Closing session #${session.id}, old status: ${oldStatus}`);
  }

  async onArchive(session, oldStatus = null, user = "system", qr = null) {
    logger.info(`[SessionTransition] Archiving session #${session.id}, old status: ${oldStatus}`);
  }
}

module.exports = { SessionStateTransitionService };