import { Router } from "express";
import { body, param, query } from "express-validator";
import { protect, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { ROLES } from "../utils/constants.js";
import { listUsers, getUser, blockUser, unblockUser, deleteUser } from "../controllers/adminUserController.js";

const router = Router();
router.use(protect, authorize(ROLES.ADMIN));

const idRule = param("id").isMongoId();

router.get(
  "/",
  [
    query("role").optional({ values: "falsy" }).isIn(Object.values(ROLES)),
    query("status").optional({ values: "falsy" }).isIn(["active", "blocked"]),
    query("q").optional({ values: "falsy" }).isString().bail().trim().isLength({ min: 2, max: 100 }),
    query("page").optional({ values: "falsy" }).isInt({ min: 1, max: 1000 }),
    query("limit").optional({ values: "falsy" }).isInt({ min: 1, max: 50 }),
  ],
  validate,
  listUsers
);
router.get("/:id", [idRule], validate, getUser);
router.patch(
  "/:id/block",
  [
    idRule,
    body("reason").optional({ values: "falsy" }).isString().bail().trim()
      .isLength({ min: 5, max: 500 }).withMessage("Reason must be 5-500 characters"),
  ],
  validate,
  blockUser
);
router.patch("/:id/unblock", [idRule], validate, unblockUser);
router.delete("/:id", [idRule], validate, deleteUser);

export default router;