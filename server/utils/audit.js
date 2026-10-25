import AuditLog from "../models/AuditLog.js";
export const writeAudit = async (req, targetType, action, targetId, meta) => {
  try {
    await AuditLog.create({ actorId: req.user._id, action, targetType, targetId, meta, ip: req.ip });
  } catch (err) {
    console.error(`Audit log failed (${action}):`, err.message);
  }
};