// ipc/notification/export_report.ipc.js
//@ts-check

const Notification = require("../../../entities/Notification");
const { AppDataSource } = require("../../db/dataSource");
const { Parser } = require('json2csv');

module.exports = async function exportNotificationReport(params = {}) {
  try {
    const { 
      // @ts-ignore
      startDate, 
      // @ts-ignore
      endDate, 
      // @ts-ignore
      reportType = 'summary',
      // @ts-ignore
      // @ts-ignore
      groupBy = 'type'
    } = params;

    if (!startDate || !endDate) {
      return {
        status: false,
        message: 'Start date and end date are required for reports',
        data: null
      };
    }

    const notificationRepo = AppDataSource.getRepository(Notification);
    
    const start = new Date(startDate);
    const end = new Date(endDate);

    /**
     * @type {string | readonly any[] | Readonly<any>}
     */
    let csvData = [];
    let filename = '';

    if (reportType === 'summary') {
      // Get summary by type
      const summaryQuery = notificationRepo.createQueryBuilder("notification")
        .select("notification.type", "type")
        .addSelect("COUNT(*)", "count")
        .addSelect("MIN(notification.timestamp)", "first_notification")
        .addSelect("MAX(notification.timestamp)", "last_notification")
        .where("notification.timestamp BETWEEN :start AND :end", { start, end })
        .groupBy("notification.type");

      const summary = await summaryQuery.getRawMany();

      // @ts-ignore
      csvData = summary.map(item => ({
        type: item.type,
        count: item.count,
        first_notification: item.first_notification,
        last_notification: item.last_notification,
        date_range: `${startDate} to ${endDate}`
      }));

      filename = `notification_summary_${startDate}_to_${endDate}.csv`;
    } else if (reportType === 'daily') {
      // Get daily count
      const dailyQuery = notificationRepo.createQueryBuilder("notification")
        .select("DATE(notification.timestamp)", "date")
        .addSelect("COUNT(*)", "count")
        .addSelect("notification.type", "type")
        .where("notification.timestamp BETWEEN :start AND :end", { start, end })
        .groupBy("DATE(notification.timestamp), notification.type")
        .orderBy("DATE(notification.timestamp)", "DESC");

      const dailyStats = await dailyQuery.getRawMany();

      // @ts-ignore
      csvData = dailyStats.map(item => ({
        date: item.date,
        type: item.type,
        count: item.count
      }));

      filename = `notification_daily_${startDate}_to_${endDate}.csv`;
    } else if (reportType === 'detailed') {
      // Get all notifications with details
      const detailedQuery = notificationRepo.createQueryBuilder("notification")
        .where("notification.timestamp BETWEEN :start AND :end", { start, end })
        .orderBy("notification.timestamp", "DESC");

      const notifications = await detailedQuery.getMany();

      // @ts-ignore
      csvData = notifications.map(notification => ({
        id: notification.id,
        type: notification.type,
        timestamp: notification.timestamp,
        // @ts-ignore
        context_title: notification.context?.title || '',
        // @ts-ignore
        context_message: notification.context?.message || '',
        // @ts-ignore
        context_workerName: notification.context?.workerName || '',
        // @ts-ignore
        context_amount: notification.context?.amount || '',
        // @ts-ignore
        context_status: notification.context?.status || ''
      }));

      filename = `notification_detailed_${startDate}_to_${endDate}.csv`;
    }

    // Convert to CSV
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(csvData);

    return {
      status: true,
      message: 'Notification report exported successfully',
      data: {
        csv,
        filename,
        reportType,
        dateRange: { startDate, endDate },
        recordCount: csvData.length
      }
    };
  } catch (error) {
    console.error('Error in exportNotificationReport:', error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to export notification report: ${error.message}`,
      data: null
    };
  }
};