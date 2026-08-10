import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ReportsPage } from './ReportsPage';

const REPORT_ORDER = [
  'sales',
  'sales_by_payment',
  'sales_by_employee',
  'sales_by_product',
  'detailed_invoices',
  'purchases',
  'expenses',
  'profit',
  'inventory',
  'component_consumption',
  'recipe_costs',
  'top_consumed_components',
  'top_consumed_products',
  'low_stock',
] as const;

/**
 * Keeps the existing ReportsPage as the single source of report logic while
 * allowing dashboard links such as /reports?reportType=sales_by_product to
 * open the requested report immediately.
 */
export function ReportDeepLinkPage() {
  const [searchParams] = useSearchParams();
  const requested = searchParams.get('reportType');

  useEffect(() => {
    if (!requested || !REPORT_ORDER.includes(requested as (typeof REPORT_ORDER)[number])) return;

    let attempts = 0;
    const selectReport = () => {
      const buttons = Array.from(document.querySelectorAll('button'));
      // ReportsPage renders one export button before the report selector buttons.
      const reportIndex = REPORT_ORDER.indexOf(requested as (typeof REPORT_ORDER)[number]);
      const reportButton = buttons[reportIndex + 1] as HTMLButtonElement | undefined;
      if (reportButton) {
        reportButton.click();
        return;
      }
      attempts += 1;
      if (attempts < 20) window.setTimeout(selectReport, 50);
    };

    const timer = window.setTimeout(selectReport, 0);
    return () => window.clearTimeout(timer);
  }, [requested]);

  return <ReportsPage />;
}
