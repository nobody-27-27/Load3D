/**
 * Comprehensive reporting and export type definitions for Load3D
 * Includes report formats, configurations, and data export structures
 */

/**
 * Enum for supported report output formats
 */
export enum ReportFormat {
  PDF = 'pdf',
  HTML = 'html',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
}

/**
 * Enum for page orientation in printed reports
 */
export enum PageOrientation {
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape',
}

/**
 * Enum for standard page sizes
 */
export enum PageSize {
  A3 = 'A3',
  A4 = 'A4',
  A5 = 'A5',
  LETTER = 'letter',
  LEGAL = 'legal',
  TABLOID = 'tabloid',
}

/**
 * Summary information for individual items in a load
 */
export interface ItemSummary {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  weight: number;
  volume: number;
  category: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'mm' | 'in' | 'm';
  };
  isFragile: boolean;
  isHazardous: boolean;
  position: {
    x: number;
    y: number;
    z: number;
  };
  orientation: string;
  lastModified: Date;
}

/**
 * Summary information for containers
 */
export interface ContainerSummary {
  id: string;
  type: 'box' | 'pallet' | 'crate' | 'bin' | 'custom';
  name: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'mm' | 'in' | 'm';
  };
  maxWeight: number;
  maxVolume: number;
  currentWeight: number;
  currentVolume: number;
  weightUtilization: number;
  volumeUtilization: number;
  itemCount: number;
  items: ItemSummary[];
}

/**
 * Space analysis metrics for loading optimization
 */
export interface SpaceAnalysis {
  totalAvailableVolume: number;
  usedVolume: number;
  unusedVolume: number;
  volumeUtilizationPercentage: number;
  totalAvailableWeight: number;
  currentWeight: number;
  weightCapacityRemaining: number;
  weightUtilizationPercentage: number;
  estimatedEmptySpace: {
    location: string;
    volume: number;
    percentage: number;
  }[];
  optimization: {
    score: number;
    recommendation: string;
    potentialImprovements: string[];
  };
}

/**
 * Weight distribution analysis across containers
 */
export interface WeightDistribution {
  containerDistribution: {
    containerId: string;
    containerName: string;
    weight: number;
    percentage: number;
    distribution: 'balanced' | 'front-heavy' | 'rear-heavy' | 'left-heavy' | 'right-heavy';
  }[];
  centerOfGravity: {
    x: number;
    y: number;
    z: number;
  };
  isBalanced: boolean;
  balanceScore: number;
  warnings: string[];
}

/**
 * Suggestions for optimizing the load
 */
export interface Suggestion {
  id: string;
  type: 'optimization' | 'safety' | 'efficiency' | 'cost-saving';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedItems: string[];
  affectedContainers: string[];
  estimatedImpact: {
    timeInMinutes?: number;
    costSavings?: number;
    weightReduction?: number;
    volumeReduction?: number;
  };
  actionableSteps: string[];
}

/**
 * Comprehensive loading report
 */
export interface LoadingReport {
  id: string;
  timestamp: Date;
  projectName: string;
  projectId: string;
  description?: string;
  status: 'draft' | 'finalized' | 'archived';
  summary: {
    totalItems: number;
    totalContainers: number;
    totalWeight: number;
    totalVolume: number;
    totalCost?: number;
    estimatedLoadingTime?: number;
  };
  containers: ContainerSummary[];
  items: ItemSummary[];
  spaceAnalysis: SpaceAnalysis;
  weightDistribution: WeightDistribution;
  suggestions: Suggestion[];
  complianceChecks: {
    isWeightDistributionAcceptable: boolean;
    isContainerCapacityRespected: boolean;
    areFragileItemsProtected: boolean;
    areHazardousItemsCompliant: boolean;
    issues: string[];
  };
  generatedBy: string;
  version: string;
}

/**
 * Report generation options
 */
export interface ReportOptions {
  format: ReportFormat;
  title?: string;
  subtitle?: string;
  includeCharts: boolean;
  includeTables: boolean;
  includeImages: boolean;
  includeDetailedAnalysis: boolean;
  includeSuggestions: boolean;
  includeComplianceChecks: boolean;
  locale?: string;
  theme?: 'light' | 'dark' | 'professional';
  watermark?: string;
  confidential?: boolean;
}

/**
 * PDF-specific export options
 */
export interface PDFOptions {
  pageSize: PageSize;
  orientation: PageOrientation;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  pageNumbers: boolean;
  headerFooter: {
    showHeader: boolean;
    showFooter: boolean;
    customText?: string;
  };
  compression: 'none' | 'low' | 'medium' | 'high';
  embedFonts: boolean;
  printOptimized: boolean;
}

/**
 * HTML-specific export options
 */
export interface HTMLOptions {
  standalone: boolean;
  responsive: boolean;
  includeCSS: boolean;
  includeJavaScript: boolean;
  darkMode: boolean;
  customCSS?: string;
  outputFormat: 'html' | 'mhtml';
  embedImages: boolean;
}

/**
 * Excel-specific export options
 */
export interface ExcelOptions {
  includeMultipleSheets: boolean;
  sheetNames?: string[];
  freezeHeader: boolean;
  autoFilter: boolean;
  autoWidth: boolean;
  numberFormat: 'general' | 'accounting' | 'scientific';
  currencySymbol?: string;
  includeCharts: boolean;
  chartType?: 'bar' | 'pie' | 'line' | 'scatter';
}

/**
 * CSV-specific export options
 */
export interface CSVOptions {
  delimiter: ',' | ';' | '\t' | '|';
  quoteChar: '"' | "'";
  includeHeaders: boolean;
  encoding: 'utf-8' | 'utf-16' | 'iso-8859-1' | 'cp1252';
  lineEnding: 'CRLF' | 'LF' | 'CR';
  dateFormat?: string;
  numberFormat?: string;
}

/**
 * Complete export configuration combining all format options
 */
export interface ExportConfig {
  reportOptions: ReportOptions;
  pdfOptions?: PDFOptions;
  htmlOptions?: HTMLOptions;
  excelOptions?: ExcelOptions;
  csvOptions?: CSVOptions;
  additionalMetadata?: {
    author?: string;
    company?: string;
    keywords?: string[];
    subject?: string;
  };
}

/**
 * Data export structure for external system integration
 */
export interface DataExport {
  exportId: string;
  reportId: string;
  exportTime: Date;
  format: ReportFormat;
  config: ExportConfig;
  data: {
    report: LoadingReport;
    charts?: ChartConfig[];
    tables?: TableConfig[];
  };
  fileSize?: number;
  fileName?: string;
  downloadUrl?: string;
  expiresAt?: Date;
}

/**
 * Chart configuration for visual representations
 */
export interface ChartConfig {
  id: string;
  type: 'bar' | 'pie' | 'line' | 'area' | 'scatter' | 'bubble' | 'heatmap';
  title: string;
  description?: string;
  dataSource: 'weight' | 'volume' | 'cost' | 'items' | 'utilization' | 'distribution';
  dimensions: {
    width: number;
    height: number;
  };
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
  };
  showLegend: boolean;
  showGrid: boolean;
  animationEnabled: boolean;
  interactiveMode: boolean;
  exportFormats: ReportFormat[];
}

/**
 * Table configuration for data presentation
 */
export interface TableConfig {
  id: string;
  title: string;
  description?: string;
  dataSource: 'items' | 'containers' | 'suggestions' | 'analysis';
  columns: {
    key: string;
    label: string;
    type: 'text' | 'number' | 'percentage' | 'date' | 'currency' | 'boolean';
    sortable: boolean;
    visible: boolean;
    width?: number;
    format?: string;
  }[];
  sorting?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination?: {
    enabled: boolean;
    pageSize: number;
  };
  filtering?: {
    enabled: boolean;
    fields: string[];
  };
  summaryRow?: {
    enabled: boolean;
    summaryFields: {
      field: string;
      aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
    }[];
  };
}

/**
 * Report template for standardized reporting
 */
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'standard' | 'custom' | 'compliance' | 'executive';
  sections: {
    sectionId: string;
    sectionName: string;
    order: number;
    enabled: boolean;
    type: 'summary' | 'details' | 'analysis' | 'suggestions' | 'compliance';
    components: Array<'chart' | 'table' | 'text' | 'image'>;
  }[];
  styling: {
    fontSize: number;
    fontFamily: string;
    colorScheme: string;
    logoUrl?: string;
  };
  defaultOptions: ReportOptions;
  defaultExportConfig: ExportConfig;
  createdBy: string;
  createdAt: Date;
  modifiedAt: Date;
  isPublic: boolean;
}

/**
 * Report delivery configuration
 */
export interface ReportDelivery {
  id: string;
  reportId: string;
  deliveryMethod: 'email' | 'download' | 'cloud-storage' | 'api' | 'ftp' | 'print';
  recipients?: {
    email: string;
    name: string;
    role?: string;
  }[];
  schedule?: {
    frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
    timezone?: string;
    nextScheduledTime?: Date;
  };
  cloudStorage?: {
    provider: 'aws-s3' | 'azure-blob' | 'google-cloud' | 'dropbox' | 'onedrive';
    bucket: string;
    path: string;
    accessLevel: 'private' | 'public' | 'shared';
  };
  apiEndpoint?: {
    url: string;
    method: 'POST' | 'PUT' | 'PATCH';
    authentication: 'none' | 'basic' | 'bearer' | 'api-key';
    headers?: Record<string, string>;
  };
  printSettings?: {
    printerName: string;
    copies: number;
    pageOrientation: PageOrientation;
    pageSize: PageSize;
  };
  notificationSettings: {
    notifyOnSuccess: boolean;
    notifyOnFailure: boolean;
    notificationEmail?: string;
  };
  retentionPolicy?: {
    daysToKeep: number;
    autoDelete: boolean;
  };
}

/**
 * Batch report request for processing multiple reports
 */
export interface BatchReportRequest {
  id: string;
  batchName: string;
  description?: string;
  reportIds: string[];
  combinedReport?: boolean;
  format: ReportFormat;
  config: ExportConfig;
  template?: ReportTemplate;
  delivery?: ReportDelivery[];
  priorityLevel: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: Date;
  requestedBy: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result of batch report processing
 */
export interface BatchReportResult {
  requestId: string;
  batchName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  startTime: Date;
  completionTime?: Date;
  totalReports: number;
  processedReports: number;
  failedReports: number;
  results: {
    reportId: string;
    status: 'success' | 'failed' | 'skipped';
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    error?: string;
    warnings?: string[];
  }[];
  deliveryStatus?: {
    method: ReportDelivery['deliveryMethod'];
    status: 'pending' | 'sent' | 'failed';
    timestamp?: Date;
    confirmationId?: string;
  }[];
  summaryMetrics?: {
    totalFilesGenerated: number;
    totalFileSize: number;
    averageProcessingTimePerReport: number;
    successRate: number;
  };
  logs?: {
    timestamp: Date;
    level: 'info' | 'warning' | 'error';
    message: string;
  }[];
}
