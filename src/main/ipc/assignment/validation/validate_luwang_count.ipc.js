// src/ipc/assignment/validation/validate_luwang_count.ipc.js
//@ts-check
const Assignment = require("../../../../entities/Assignment");
const Worker = require("../../../../entities/Worker");
const Pitak = require("../../../../entities/Pitak");
const { AppDataSource } = require("../../../db/dataSource");
const { Between } = require("typeorm");
const { validateWorkers, validatePitak } = require("../utils/assignmentUtils");

/**
 * Validate luwang count
 * @param {Object} params - Validation parameters
 * @returns {Promise<Object>} Response object
 */
module.exports = async (params) => {
  try {
    // @ts-ignore
    const { luwangCount, assignmentId, workerId, pitakId, dateRange, _userId } = params;

    if (luwangCount === undefined) {
      return { status: false, message: "LuWang count is required", data: null };
    }

    const count = parseFloat(luwangCount);

    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      statistics: {},
      recommendations: []
    };

    // Basic numeric validation
    if (isNaN(count)) {
      validation.isValid = false;
      // @ts-ignore
      validation.errors.push("LuWang count must be a number");
      return { status: false, message: "Validation failed", data: validation };
    }
    if (count < 0) {
      validation.isValid = false;
      // @ts-ignore
      validation.errors.push("LuWang count cannot be negative");
    }
    if (count > 1000) {
      // @ts-ignore
      validation.warnings.push("LuWang count seems unusually high");
      // @ts-ignore
      validation.recommendations.push("Consider verifying the count");
    }

    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const workerRepo = AppDataSource.getRepository(Worker);
    const pitakRepo = AppDataSource.getRepository(Pitak);

    // ✅ Worker validation via util
    if (workerId) {
      const workerCheck = await validateWorkers(workerRepo, [workerId]);
      if (!workerCheck.valid) {
        validation.isValid = false;
        // @ts-ignore
        validation.errors.push(workerCheck.message);
      } else {
        // @ts-ignore
        validation.statistics.worker = workerCheck.workers[0];
      }
    }

    // ✅ Pitak validation via util
    if (pitakId) {
      const pitakCheck = await validatePitak(pitakRepo, pitakId);
      if (!pitakCheck.valid) {
        validation.isValid = false;
        // @ts-ignore
        validation.errors.push(pitakCheck.message);
      } else {
        // @ts-ignore
        validation.statistics.pitak = pitakCheck.pitak;
      }
    }

    // Historical comparison if assignmentId provided
    if (assignmentId) {
      const assignment = await assignmentRepo.findOne({
        where: { id: assignmentId },
        relations: ["worker"]
      });

      if (assignment) {
        // @ts-ignore
        const previousCount = parseFloat(assignment.luwangCount);
        const difference = count - previousCount;
        const percentageChange = previousCount > 0 ? (difference / previousCount) * 100 : 100;

        // @ts-ignore
        validation.statistics.previousCount = previousCount;
        // @ts-ignore
        validation.statistics.difference = difference;
        // @ts-ignore
        validation.statistics.percentageChange = percentageChange.toFixed(2);

        if (Math.abs(percentageChange) > 50) {
          // @ts-ignore
          validation.warnings.push(`Significant change detected: ${percentageChange.toFixed(2)}% from previous count`);
        }

        // @ts-ignore
        if (assignment.worker?.id) {
          const historicalAssignments = await assignmentRepo.find({
            // @ts-ignore
            where: { worker: { id: assignment.worker.id }, status: "completed" },
            order: { assignmentDate: "DESC" },
            take: 10
          });

          if (historicalAssignments.length > 0) {
            // @ts-ignore
            const historicalCounts = historicalAssignments.map(a => parseFloat(a.luwangCount));
            const average = historicalCounts.reduce((a, b) => a + b, 0) / historicalCounts.length;
            const stdDev = Math.sqrt(
              historicalCounts.reduce((sq, n) => sq + Math.pow(n - average, 2), 0) / historicalAssignments.length
            );

            // @ts-ignore
            validation.statistics.historicalAverage = average.toFixed(2);
            // @ts-ignore
            validation.statistics.historicalStdDev = stdDev.toFixed(2);

            if (Math.abs(count - average) > (2 * stdDev) && stdDev > 0) {
              // @ts-ignore
              validation.warnings.push("Count is significantly different from worker's historical performance");
              // @ts-ignore
              validation.recommendations.push("Review worker's typical performance before accepting");
            }
          }
        }
      }
    }

    // Date range comparison
    if (dateRange && workerId) {
      const { startDate, endDate } = dateRange;
      const dateRangeAssignments = await assignmentRepo.find({
        where: {
          // @ts-ignore
          worker: { id: workerId },
          assignmentDate: startDate && endDate ? Between(new Date(startDate), new Date(endDate)) : undefined,
          status: "completed"
        }
      });

      if (dateRangeAssignments.length > 0) {
        // @ts-ignore
        const dateRangeCounts = dateRangeAssignments.map(a => parseFloat(a.luwangCount));
        const dateRangeAverage = dateRangeCounts.reduce((a, b) => a + b, 0) / dateRangeCounts.length;

        // @ts-ignore
        validation.statistics.dateRangeAverage = dateRangeAverage.toFixed(2);
        // @ts-ignore
        validation.statistics.dateRangeCount = dateRangeAssignments.length;

        if (count < dateRangeAverage * 0.5) {
          // @ts-ignore
          validation.warnings.push("Count is significantly lower than worker's average for the date range");
        } else if (count > dateRangeAverage * 1.5) {
          // @ts-ignore
          validation.warnings.push("Count is significantly higher than worker's average for the date range");
        }
      }
    }

    // Recommendations
    if (validation.isValid) {
      if (count === 0) {
        // @ts-ignore
        validation.recommendations.push("Consider if zero LuWang count is correct for this assignment");
      } else if (count < 10) {
        // @ts-ignore
        validation.recommendations.push("Low LuWang count detected - ensure accuracy");
      }
    }

    return { status: true, message: "LuWang count validation completed", data: validation };

  } catch (error) {
    console.error("Error validating LuWang count:", error);
    // @ts-ignore
    return { status: false, message: `Validation failed: ${error.message}`, data: null };
  }
};