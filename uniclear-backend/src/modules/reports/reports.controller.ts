import { Request, Response, NextFunction } from 'express'
import { ReportsService } from './reports.service'
import { ApiResponse } from '@/core/response/ApiResponse'

export class ReportsController {
  static async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const campaignId = (req.query.campaignId as string)?.trim() || undefined
      const sessionId = (req.query.sessionId as string)?.trim() || undefined
      const data = await ReportsService.summary(req.universityId!, campaignId, sessionId)
      return ApiResponse.success(res, data)
    } catch (err) { next(err) }
  }

  static async byStage(req: Request, res: Response, next: NextFunction) {
    try {
      const campaignId = (req.query.campaignId as string)?.trim() || undefined
      const sessionId = (req.query.sessionId as string)?.trim() || undefined
      const data = await ReportsService.byStage(req.universityId!, campaignId, sessionId)
      return ApiResponse.success(res, data)
    } catch (err) { next(err) }
  }

  static async export(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = (req.query.sessionId as string)?.trim() || undefined
      const format = req.query.format as string | undefined
      const data = await ReportsService.export(req.universityId!, sessionId)

      if (format === 'csv') {
        const headers = [
          'Clearance Number',
          'Student Name',
          'Matric No',
          'JAMB Reg No',
          'Faculty',
          'Department',
          'Session',
          'Campaign',
          'Status',
          'Completed At',
          'Created At'
        ]

        const escapeCsv = (val: any) => {
          if (val === null || val === undefined) return ''
          const str = String(val)
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        }

        const rows = data.map((item: any) => [
          item.clearanceNumber || 'N/A',
          `${item.student?.firstName || ''} ${item.student?.lastName || ''}`.trim(),
          item.student?.matricNo || 'N/A',
          item.student?.jambRegNo || 'N/A',
          item.student?.faculty?.name || 'N/A',
          item.student?.department?.name || 'N/A',
          item.session?.name || 'N/A',
          item.campaign?.name || 'N/A',
          item.status,
          item.completedAt ? new Date(item.completedAt).toISOString() : 'N/A',
          item.createdAt ? new Date(item.createdAt).toISOString() : 'N/A',
        ])

        const csvContent = [headers.join(','), ...rows.map(row => row.map(escapeCsv).join(','))].join('\n')

        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="clearance-report-${sessionId || 'all'}.csv"`)
        return res.status(200).send(csvContent)
      }

      return ApiResponse.success(res, data)
    } catch (err) { next(err) }
  }
}
