import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ReportsPage } from './ReportsPage';
import { useLanguage } from '@/context/LanguageContext';

const REPORT_LABELS = {
  sales: ['المبيعات', 'Sales'],
  sales_by_payment: ['المبيعات حسب طريقة الدفع', 'Sales by Payment'],
  sales_by_employee: ['المبيعات حسب الموظف', 'Sales by Employee'],
  sales_by_product: ['المبيعات حسب المنتج', 'Sales by Product'],
  detailed_invoices: ['الفواتير التفصيلية', 'Detailed Invoices'],
  purchases: ['المشتريات', 'Purchases'],
  expenses: ['المصروفات', 'Expenses'],
  profit: ['الربحية', 'Profitability'],
  inventory: ['المخزون', 'Inventory'],
  component_consumption: ['استهلاك المكونات', 'Component Consumption'],
  recipe_costs: ['تكلفة الوصفات', 'Recipe Costs'],
  top_consumed_components: ['أكثر المكونات استهلاكًا', 'Top Components'],
  top_consumed_products: ['أكثر المنتجات استهلاكًا', 'Top Consumed Products'],
  low_stock: ['المخزون المنخفض', 'Low Stock'],
} as const;

type ReportType = keyof typeof REPORT_LABELS;

function isReportType(value: string | null): value is ReportType {
  return value !== null && Object.prototype.hasOwnProperty.call(REPORT_LABELS, value);
}

/**
 * Resolves a dashboard deep link to the exact report control.
 * Matching is deliberately exact and scoped to visible buttons so a generic
 * button such as Active Orders can never be selected by accident.
 */
export function ReportDeepLinkPage() {
  const [searchParams] = useSearchParams();
  const { lang } = useLanguage();
  const requestedParam = searchParams.get('reportType');

  useEffect(() => {
    if (!isReportType(requestedParam)) return;

    let attempts = 0;
    const selectReport = () => {
      const reportButton = document.querySelector<HTMLButtonElement>(`button[data-report-type="${requestedParam}"]`);
      if (reportButton && !reportButton.disabled && reportButton.offsetParent) {
        reportButton.click();
        return;
      }
      attempts += 1;
      if (attempts < 40) window.setTimeout(selectReport, 50);
    };

    const timer = window.setTimeout(selectReport, 0);
    return () => window.clearTimeout(timer);
  }, [requestedParam]);

  return <ReportsPage />;
}
