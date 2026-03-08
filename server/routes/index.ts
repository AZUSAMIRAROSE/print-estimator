import { Router } from "express";
import {
  estimateHandler,
  quickReplanHandler,
  generateQuotationHandler,
  refreshQuotationHandler,
  getQuotationHandler,
} from "./estimationApi";

const router = Router();

/**
 * Estimation endpoints
 */
router.post("/api/estimate", estimateHandler);
router.post("/api/estimate/quick-replan", quickReplanHandler);

/**
 * Quotation endpoints
 */
router.post("/api/quotation", generateQuotationHandler);
router.post("/api/quotation/:id/refresh", refreshQuotationHandler);
router.get("/api/quotation/:id", getQuotationHandler);

export default router;
