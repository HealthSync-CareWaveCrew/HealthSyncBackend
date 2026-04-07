import express from "express";
import {
  cancelSubscription,
  createCustomer,
  createSetupIntent,
  adminCreatePlan,
  adminDeactivatePlan,
  adminGetPlans,
  adminUpdatePlan,
  deletePaymentMethod,
  getAdminSubscriptions,
  getPaymentHistory,
  getPaymentMethods,
  getPlans,
  getSubscriptionStatus,
  savePaymentMethod,
  setDefaultPaymentMethod,
  subscribe,
} from "../controller/payment.controller.js";
import { handleWebhook } from "../controller/webhook.controller.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../util/errorHandling.js";

const router = express.Router();

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook,
);

router.use(express.json({ limit: "10mb" }));
router.use(protect);

router.post("/create-customer", asyncHandler(createCustomer));
router.post("/setup-intent", asyncHandler(createSetupIntent));
router.get("/plans", asyncHandler(getPlans));
router.get(
  "/admin/plans",
  restrictTo("admin"),
  asyncHandler(adminGetPlans),
);
router.get(
  "/admin/subscriptions",
  restrictTo("admin"),
  asyncHandler(getAdminSubscriptions),
);
router.post(
  "/admin/plans",
  restrictTo("admin"),
  asyncHandler(adminCreatePlan),
);
router.put(
  "/admin/plans/:id",
  restrictTo("admin"),
  asyncHandler(adminUpdatePlan),
);
router.delete(
  "/admin/plans/:id",
  restrictTo("admin"),
  asyncHandler(adminDeactivatePlan),
);
router.post("/save-payment-method", asyncHandler(savePaymentMethod));
router.get("/payment-methods", asyncHandler(getPaymentMethods));
router.delete("/payment-method/:id", asyncHandler(deletePaymentMethod));
router.put(
  "/payment-method/:id/default",
  asyncHandler(setDefaultPaymentMethod),
);
router.post("/subscribe", asyncHandler(subscribe));
router.post("/cancel-subscription", asyncHandler(cancelSubscription));
router.get("/subscription-status", asyncHandler(getSubscriptionStatus));
router.get("/history", asyncHandler(getPaymentHistory));

export default router;
