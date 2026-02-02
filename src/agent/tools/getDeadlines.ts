/**
 * Get Tax Deadlines Tool
 * Returns important tax dates for the assessment year
 * Provides proactive reminders for upcoming deadlines
 */

import type { AgentTool, TaxDeadline } from '../../types/agent';

export interface DeadlineAlert {
  deadline: TaxDeadline;
  daysUntil: number;
  urgency: 'critical' | 'urgent' | 'upcoming' | 'future';
  message: string;
}

/**
 * Tax deadlines for AY 2025-26 (FY 2024-25)
 */
const DEADLINES_AY_2025_26: TaxDeadline[] = [
  {
    name: 'Advance Tax - 1st Installment',
    date: '2024-06-15',
    description: 'Pay 15% of estimated tax liability',
    applicable: true,
  },
  {
    name: 'Advance Tax - 2nd Installment',
    date: '2024-09-15',
    description: 'Pay 45% of estimated tax liability (cumulative)',
    applicable: true,
  },
  {
    name: 'Advance Tax - 3rd Installment',
    date: '2024-12-15',
    description: 'Pay 75% of estimated tax liability (cumulative)',
    applicable: true,
  },
  {
    name: 'Advance Tax - 4th Installment',
    date: '2025-03-15',
    description: 'Pay 100% of estimated tax liability',
    applicable: true,
  },
  {
    name: 'Financial Year End',
    date: '2025-03-31',
    description: 'Last day to make tax-saving investments for FY 2024-25',
    applicable: true,
  },
  {
    name: 'ITR Filing - Individual (Non-Audit)',
    date: '2025-07-31',
    description: 'Due date for filing ITR for individuals not requiring audit',
    applicable: true,
  },
  {
    name: 'ITR Filing - Audit Cases',
    date: '2025-10-31',
    description: 'Due date for filing ITR for businesses requiring audit',
    applicable: true,
  },
  {
    name: 'ITR Filing - Transfer Pricing',
    date: '2025-11-30',
    description: 'Due date for filing ITR for cases with international transactions',
    applicable: true,
  },
  {
    name: 'Belated/Revised Return',
    date: '2025-12-31',
    description: 'Last date to file belated or revised return for AY 2025-26',
    applicable: true,
  },
];

/**
 * Get deadlines tool definition
 */
export const getDeadlinesTool: AgentTool = {
  name: 'get_deadlines',
  description: `Get tax filing and payment deadlines for the assessment year.
Returns important dates including advance tax installments, ITR filing due dates, and investment deadlines.`,

  parameters: {
    type: 'object',
    properties: {
      assessmentYear: {
        type: 'string',
        description: 'Assessment year (e.g., "2025-26"). Defaults to current AY.',
      },
      type: {
        type: 'string',
        enum: ['all', 'advance_tax', 'itr_filing', 'investment'],
        description: 'Filter by deadline type',
      },
    },
    required: [],
  },

  execute: async (args: Record<string, unknown>) => {
    const assessmentYear = (args.assessmentYear as string) || '2025-26';
    const type = args.type as string | undefined;

    // Currently only support AY 2025-26
    if (assessmentYear !== '2025-26') {
      return {
        error: `Deadlines for AY ${assessmentYear} are not available. Only AY 2025-26 is supported.`,
      };
    }

    let deadlines = [...DEADLINES_AY_2025_26];

    // Filter by type
    if (type) {
      switch (type) {
        case 'advance_tax':
          deadlines = deadlines.filter((d) => d.name.includes('Advance Tax'));
          break;
        case 'itr_filing':
          deadlines = deadlines.filter((d) => d.name.includes('ITR'));
          break;
        case 'investment':
          deadlines = deadlines.filter((d) => d.name.includes('Investment') || d.name.includes('Financial Year End'));
          break;
      }
    }

    // Add status (upcoming, passed, today)
    const today = new Date();
    const deadlinesWithStatus = deadlines.map((d) => {
      const deadlineDate = new Date(d.date);
      const daysUntil = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let status: 'passed' | 'today' | 'upcoming' | 'soon';
      if (daysUntil < 0) {
        status = 'passed';
      } else if (daysUntil === 0) {
        status = 'today';
      } else if (daysUntil <= 30) {
        status = 'soon';
      } else {
        status = 'upcoming';
      }

      return {
        ...d,
        daysUntil,
        status,
      };
    });

    // Generate alerts for upcoming deadlines
    const alerts: DeadlineAlert[] = deadlinesWithStatus
      .filter((d) => d.status !== 'passed')
      .map((d) => {
        let urgency: DeadlineAlert['urgency'];
        let message: string;

        if (d.daysUntil <= 0) {
          urgency = 'critical';
          message = `⚠️ ${d.name} is TODAY!`;
        } else if (d.daysUntil <= 7) {
          urgency = 'critical';
          message = `🚨 ${d.name} is in ${d.daysUntil} day${d.daysUntil > 1 ? 's' : ''}!`;
        } else if (d.daysUntil <= 30) {
          urgency = 'urgent';
          message = `⏰ ${d.name} is coming up in ${d.daysUntil} days.`;
        } else if (d.daysUntil <= 90) {
          urgency = 'upcoming';
          message = `📅 ${d.name} is on ${d.date}.`;
        } else {
          urgency = 'future';
          message = `${d.name}: ${d.date}`;
        }

        return {
          deadline: d,
          daysUntil: d.daysUntil,
          urgency,
          message,
        };
      });

    return {
      assessmentYear,
      currentDate: today.toISOString().split('T')[0],
      deadlines: deadlinesWithStatus,
      nextDeadline: deadlinesWithStatus.find((d) => d.status === 'upcoming' || d.status === 'soon' || d.status === 'today'),
      alerts: alerts.filter((a) => a.urgency !== 'future'),
      criticalAlerts: alerts.filter((a) => a.urgency === 'critical'),
    };
  },
};

/**
 * Get proactive deadline alerts for system prompt
 */
export function getProactiveDeadlineAlerts(): string[] {
  const today = new Date();
  const alerts: string[] = [];

  for (const deadline of DEADLINES_AY_2025_26) {
    const deadlineDate = new Date(deadline.date);
    const daysUntil = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil >= 0 && daysUntil <= 7) {
      alerts.push(`🚨 URGENT: ${deadline.name} is ${daysUntil === 0 ? 'TODAY' : `in ${daysUntil} days`}!`);
    } else if (daysUntil > 7 && daysUntil <= 30) {
      alerts.push(`⏰ Reminder: ${deadline.name} is coming up on ${deadline.date}`);
    }
  }

  return alerts;
}
